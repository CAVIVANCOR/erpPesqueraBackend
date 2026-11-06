import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { TIPO_DOC_ID } from '../../utils/tiposDocumento.constants.js';

/**
 * PLAME - Prestadores de servicios con rentas de 4ta categoría (Anexo 3: estructuras 7 y 20).
 * Los recibos por honorarios se declaran en el mes en que se PAGAN (principio del percibido). Se generan
 * dos archivos: .ps4 (prestadores) y .4ta (comprobantes), solo con los recibos que el usuario marque.
 */

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

// Tabla 23: tipo de comprobante emitido. R = Recibo por honorarios
const TIPO_COMPROBANTE_RECIBO = 'R';
const INDICADOR_PENSION_SIN_RETENCION = '3';

const rangoMes = (anio, mes) => {
  anio = Number(anio);
  mes = Number(mes);
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new ValidationError('Indique un año y un mes válidos para el archivo de PLAME.');
  }
  return { anio, mes, inicio: new Date(Date.UTC(anio, mes - 1, 1)), fin: new Date(Date.UTC(anio, mes, 1)) };
};

// Las fechas se guardan a medianoche local de Perú (05:00 UTC): el día calendario se lee en UTC
const diaMesAnio = (fecha) =>
  `${String(fecha.getUTCDate()).padStart(2, '0')}/${String(fecha.getUTCMonth() + 1).padStart(2, '0')}/${fecha.getUTCFullYear()}`;
const importe = (valor) => (Math.round((Number(valor) + Number.EPSILON) * 100) / 100).toFixed(2);

/** Recibos por honorarios pagados en el mes (con sus datos para la grilla de selección). */
const listarRecibos = async ({ empresaId, anio, mes, soloConRetencion }) => {
  try {
    empresaId = Number(empresaId);
    if (!empresaId) throw new ValidationError('Seleccione la empresa del archivo de PLAME de 4ta categoría.');
    const { inicio, fin } = rangoMes(anio, mes);

    const cuentas = await prisma.cuentaPorPagar.findMany({
      where: {
        empresaId,
        esGerencial: false,
        ordenCompra: { tipoDocumentoFinalId: Number(TIPO_DOC_ID.RECIBO_HONORARIOS) },
        pagos: { some: { fechaPago: { gte: inicio, lt: fin } } },
      },
      include: {
        ordenCompra: {
          select: {
            id: true, numSerieDocFinal: true, numCorreDocFinal: true, numeroDocumentoFinal: true, fechaFacturacion: true,
            fechaDocumento: true, subtotal: true, aplicaImpuestoRenta: true, montoImpuestoRenta: true,
          },
        },
        proveedor: { select: { id: true, razonSocial: true, numeroDocumento: true } },
        pagos: { where: { fechaPago: { gte: inicio, lt: fin } }, select: { fechaPago: true }, orderBy: { fechaPago: 'desc' } },
      },
      orderBy: { id: 'asc' },
    });

    const filas = cuentas.map((c) => {
      const oc = c.ordenCompra;
      const montoRetencion = Number(oc.montoImpuestoRenta || 0);
      return {
        cuentaPorPagarId: c.id,
        ordenCompraId: oc.id,
        proveedorId: c.proveedor.id,
        proveedor: c.proveedor.razonSocial,
        documentoProveedor: c.proveedor.numeroDocumento,
        serie: oc.numSerieDocFinal,
        numero: oc.numCorreDocFinal,
        comprobante: oc.numeroDocumentoFinal,
        fechaEmision: oc.fechaFacturacion || oc.fechaDocumento,
        fechaPago: c.pagos[0].fechaPago,
        montoTotal: Number(oc.subtotal),
        conRetencion: montoRetencion > 0,
        montoRetencion,
      };
    });
    return soloConRetencion === 'false' || soloConRetencion === false ? filas : filas.filter((f) => f.conRetencion);
  } catch (err) {
    manejarError(err, 'listar los recibos por honorarios pagados');
  }
};

/** Líneas de los archivos .ps4 y .4ta de los recibos marcados. */
const generarArchivos = async ({ empresaId, anio, mes, cuentaPorPagarIds }) => {
  try {
    empresaId = Number(empresaId);
    const ids = String(cuentaPorPagarIds || '')
      .split(',')
      .map((v) => Number(v))
      .filter(Boolean);
    if (ids.length === 0) throw new ValidationError('Marque al menos un recibo por honorarios para generar los archivos.');
    const { anio: anioNum, mes: mesNum } = rangoMes(anio, mes);

    const disponibles = await listarRecibos({ empresaId, anio, mes, soloConRetencion: false });
    const elegidos = disponibles.filter((r) => ids.includes(Number(r.cuentaPorPagarId)));
    if (elegidos.length !== ids.length) {
      throw new ValidationError('Algún recibo marcado no corresponde a esta empresa o no tiene pagos en el mes elegido. Actualice la lista.');
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { ruc: true } });
    if (!empresa?.ruc) throw new ValidationError('La empresa no tiene RUC registrado; el nombre de los archivos de PLAME lo necesita.');

    // Apellidos y nombres del prestador: salen de Personal, enlazado a su entidad comercial
    const personal = await prisma.personal.findMany({
      where: { enlaceEntidadComercialId: { in: [...new Set(elegidos.map((r) => r.proveedorId))] } },
      select: { enlaceEntidadComercialId: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, apellidos: true },
    });
    const personalPorProveedor = new Map(personal.map((p) => [Number(p.enlaceEntidadComercialId), p]));

    const prestadores = new Map();
    const lineas4ta = [];
    for (const r of elegidos) {
      const etiqueta = `${r.proveedor} (${r.comprobante || 'sin comprobante'})`;
      if (!/^\d{11}$/.test(String(r.documentoProveedor || ''))) {
        throw new ValidationError(`El prestador ${r.proveedor} no tiene un RUC de 11 dígitos: PLAME exige el RUC (tipo 06) de los prestadores domiciliados.`);
      }
      const p = personalPorProveedor.get(Number(r.proveedorId));
      if (!p) {
        throw new ValidationError(`El prestador ${r.proveedor} no está en Personal enlazado a su entidad comercial: regístrelo para obtener sus apellidos y nombres.`);
      }
      const [primerApellido = '', ...restoApellidos] = String(p.apellidos || '').trim().split(/\s+/);
      const paterno = p.apellidoPaterno || primerApellido;
      const materno = p.apellidoMaterno ?? restoApellidos.join(' ');
      if (!paterno || !p.nombres) throw new ValidationError(`Faltan los apellidos o nombres de ${r.proveedor} en Personal.`);

      if (!r.serie || !r.numero || String(r.serie).length > 4 || String(r.numero).length > 8) {
        throw new ValidationError(`El comprobante ${etiqueta} debe tener serie de hasta 4 caracteres y número de hasta 8.`);
      }
      const emision = new Date(r.fechaEmision);
      const pago = new Date(r.fechaPago);
      if (pago < emision) {
        throw new ValidationError(`El recibo ${etiqueta} tiene fecha de pago anterior a su emisión: PLAME no lo admite.`);
      }

      // Estructura 7: tipo|documento|paterno|materno|nombres|domiciliado|convenio|   (domiciliado 1 = sí; convenio 0 = ninguno)
      prestadores.set(r.documentoProveedor, `06|${r.documentoProveedor}|${paterno}|${materno}|${p.nombres}|1|0|`);
      // Estructura 20: tipo|documento|comprobante|serie|número|monto|emisión|pago|retención 4ta|pensión|aporte|
      lineas4ta.push(
        `06|${r.documentoProveedor}|${TIPO_COMPROBANTE_RECIBO}|${r.serie}|${r.numero}|${importe(r.montoTotal)}|${diaMesAnio(emision)}|${diaMesAnio(pago)}|${r.conRetencion ? 1 : 0}|${INDICADOR_PENSION_SIN_RETENCION}||`,
      );
    }

    const nombreBase = `0601${anioNum}${String(mesNum).padStart(2, '0')}${empresa.ruc}`;
    return { nombreBase, ps4: [...prestadores.values()], cuarta: lineas4ta };
  } catch (err) {
    manejarError(err, 'preparar los archivos de PLAME de 4ta categoría');
  }
};

export default { listarRecibos, generarArchivos };
