import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';
import { ESTADO_PREFACTURA } from '../../utils/estados.constants.js';

/**
 * Servicio de consulta y eliminación de ComprobanteElectronico (facturas, boletas, notas de crédito/débito).
 *
 * Los comprobantes NO se crean ni se editan manualmente: nacen de una PreFactura EMITIDA
 * (preFactura.service.js > generarComprobanteElectronico) y se envían a SUNAT con el proveedor de
 * facturación electrónica (comprobanteElectronico.controller.js > enviarASunat).
 */

// Relaciones comunes de las consultas
const INCLUDE_BASE = {
  empresa: true,
  entidadComercial: true,
  moneda: true,
  tipoComprobante: true,
  tipoDocumentoCliente: true,
  formaPago: true,
  motivoNotaCreditoDebito: true,
  comprobanteModifica: { select: { id: true, numeroCompleto: true } },
  detalles: { orderBy: { numeroLinea: 'asc' } },
  cuotas: { orderBy: { numeroCuota: 'asc' } },
};

/**
 * El comprobante guarda estadoOSEId y estadoSUNATId sin relación Prisma:
 * se resuelven contra EstadoMultiFuncion y se adjuntan como estadoOSE y estadoSUNAT.
 */
const adjuntarEstados = async (comprobantes) => {
  const ids = [...new Set(comprobantes.flatMap((c) => [c.estadoOSEId, c.estadoSUNATId]).filter(Boolean).map(String))];
  const estados = await prisma.estadoMultiFuncion.findMany({ where: { id: { in: ids.map(BigInt) } } });
  const porId = new Map(estados.map((e) => [String(e.id), e]));
  return comprobantes.map((c) => ({
    ...c,
    estadoOSE: porId.get(String(c.estadoOSEId)) || null,
    estadoSUNAT: porId.get(String(c.estadoSUNATId)) || null,
  }));
};

const errorDeBaseDeDatos = (err) => {
  if (err.code && err.code.startsWith('P')) {
    throw new DatabaseError('Error de base de datos', err.message);
  }
  throw err;
};

const listarConFiltro = async (where = {}) => {
  try {
    const comprobantes = await prisma.comprobanteElectronico.findMany({
      where,
      include: INCLUDE_BASE,
      orderBy: [{ fechaEmision: 'desc' }, { id: 'desc' }],
    });
    return await adjuntarEstados(comprobantes);
  } catch (err) {
    return errorDeBaseDeDatos(err);
  }
};

/**
 * Lista todos los comprobantes electrónicos ordenados por fecha descendente.
 */
const listar = () => listarConFiltro();

/**
 * Lista comprobantes por empresa emisora.
 */
const listarPorEmpresa = (empresaId) => listarConFiltro({ empresaId });

/**
 * Lista comprobantes por cliente (entidad comercial).
 */
const listarPorCliente = (entidadComercialId) => listarConFiltro({ entidadComercialId });

/**
 * Lista los comprobantes generados desde una PreFactura.
 */
const listarPorPreFactura = (preFacturaId) => listarConFiltro({ preFacturaId });

/**
 * Obtiene un comprobante electrónico por ID con sus líneas, cuotas, notas relacionadas y bitácora de envíos.
 */
const obtenerPorId = async (id) => {
  try {
    const comprobante = await prisma.comprobanteElectronico.findUnique({
      where: { id },
      include: {
        ...INCLUDE_BASE,
        preFactura: { select: { id: true, codigo: true } },
        detalles: { orderBy: { numeroLinea: 'asc' }, include: { producto: true, tipoAfectacionIGV: true } },
        notasRelacionadas: { select: { id: true, numeroCompleto: true } },
        enviosOSE: { orderBy: { fechaEnvio: 'desc' } },
      },
    });
    if (!comprobante) throw new NotFoundError('Comprobante electrónico no encontrado');
    const [conEstados] = await adjuntarEstados([comprobante]);
    return conEstados;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    return errorDeBaseDeDatos(err);
  }
};

/**
 * Elimina un comprobante que todavía no fue emitido en SUNAT (borrador o con error de envío).
 * Un comprobante emitido solo puede darse de baja (anulación) con el proveedor.
 * La PreFactura vuelve a EMITIDA para poder generar el comprobante nuevamente.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.comprobanteElectronico.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Comprobante electrónico no encontrado');

    if (existente.aceptadoPorSunat || existente.enlacePDF) {
      throw new ConflictError(
        `El comprobante ${existente.numeroCompleto} ya fue emitido en SUNAT y no se puede eliminar. Use la opción de anular (baja).`,
      );
    }

    await prisma.$transaction(async (tx) => {
      // La cuenta por cobrar deja de apuntar al comprobante que se elimina
      await tx.cuentaPorCobrar.updateMany({ where: { comprobanteElectronicoId: id }, data: { comprobanteElectronicoId: null } });
      await tx.envioOSE.deleteMany({ where: { comprobanteElectronicoId: id } });
      // Las líneas y cuotas se eliminan en cascada
      await tx.comprobanteElectronico.delete({ where: { id } });
      await tx.preFactura.updateMany({
        where: { id: existente.preFacturaId, estadoId: ESTADO_PREFACTURA.COMPROBANTE_GENERADO },
        data: { estadoId: ESTADO_PREFACTURA.EMITIDA },
      });
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    return errorDeBaseDeDatos(err);
  }
};

export default {
  listar,
  obtenerPorId,
  eliminar,
  listarPorEmpresa,
  listarPorCliente,
  listarPorPreFactura,
};
