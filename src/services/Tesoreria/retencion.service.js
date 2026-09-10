import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Retencion
 * Gestiona las retenciones fiscales aplicadas a documentos de compras y ventas
 * Las retenciones son montos retenidos por el agente de retención según normativa SUNAT
 */

const incluirRelaciones = {
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
    }
  },
  preFactura: {
    select: {
      id: true,
      numeroDocumento: true,
      fechaDocumento: true
    }
  },
  ordenCompra: {
    select: {
      id: true,
      numeroDocumento: true,
      fechaDocumento: true
    }
  },
  entidadComercial: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
    }
  },
  tipoRetencion: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      tasa: true
    }
  },
  tipoDocumento: {
    select: {
      id: true,
      descripcion: true,
      codigo: true
    }
  },
  moneda: {
    select: {
      id: true,
      simbolo: true,
      codigoSunat: true,
      colorFondo: true
    }
  },
  estadoPago: {
    select: {
      id: true,
      descripcion: true,
      severityColor: true
    }
  },
  periodoContable: {
    select: {
      id: true,
      nombrePeriodo: true,
      anio: true,
      mes: true
    }
  }
};

/**
 * Valida los datos de una retención antes de crear o actualizar
 * @param {Object} data - Datos de la retención a validar
 * @throws {ValidationError} Si alguna validación falla
 */
async function validarRetencion(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.entidadComercialId) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!entidad) throw new ValidationError('La entidad comercial referenciada no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoPagoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoPagoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.importeRetenido !== undefined && data.importeRetenido < 0) {
    throw new ValidationError('El importe retenido no puede ser negativo.');
  }

  if (data.importePagado !== undefined && data.importePagado < 0) {
    throw new ValidationError('El importe pagado no puede ser negativo.');
  }
}

/**
 * Lista todas las retenciones con sus relaciones
 * @returns {Promise<Array>} Lista de retenciones
 */
const listar = async () => {
  try {
    return await prisma.retencion.findMany({
      include: incluirRelaciones,
      orderBy: { fechaCreacion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una retención por su ID con todas sus relaciones
 * @param {BigInt} id - ID de la retención
 * @returns {Promise<Object>} Retención encontrada
 * @throws {NotFoundError} Si la retención no existe
 */
const obtenerPorId = async (id) => {
  try {
    const retencion = await prisma.retencion.findUnique({
      where: { id },
      include: {
        ...incluirRelaciones,
        movimientosCaja: {
          include: {
            medioPago: true,
            cuentaCorrienteOrigen: {
              include: {
                banco: true
              }
            }
          },
          orderBy: { fechaOperacionMovCaja: 'desc' }
        },
        asientosContables: {
          include: {
            estado: true,
            moneda: true,
            detalles: {
              include: {
                planCuenta: true
              }
            }
          },
          orderBy: { fechaAsiento: 'desc' }
        }
      }
    });
    if (!retencion) throw new NotFoundError('Retención no encontrada');
    return retencion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva retención
 * @param {Object} data - Datos de la retención a crear
 * @returns {Promise<Object>} Retención creada
 * @throws {ValidationError} Si faltan campos obligatorios o datos inválidos
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios con mensajes específicos
    const camposFaltantes = [];
    
    if (!data.empresaId) camposFaltantes.push('Empresa');
    if (!data.entidadComercialId) camposFaltantes.push('Entidad Comercial');
    if (data.importeRetenido === undefined || data.importeRetenido === null) camposFaltantes.push('Importe Retenido');
    if (!data.monedaId) camposFaltantes.push('Moneda');
    if (!data.estadoPagoId) camposFaltantes.push('Estado');
    
    if (camposFaltantes.length > 0) {
      throw new ValidationError(`Faltan campos obligatorios: ${camposFaltantes.join(', ')}`);
    }

    await validarRetencion(data);

    const retencionData = {
      empresaId: data.empresaId,
      preFacturaId: data.preFacturaId || null,
      ordenCompraId: data.ordenCompraId || null,
      origenOperacionComprasVentas: data.origenOperacionComprasVentas || false,
      entidadComercialId: data.entidadComercialId,
      tipoRetencionPercepcionId: data.tipoRetencionPercepcionId || null,
      tasaRetencion: data.tasaRetencion || 0,
      tipoDocumentoId: data.tipoDocumentoId || null,
      numeroDocumento: data.numeroDocumento || null,
      fechaEmision: data.fechaEmision || null,
      monedaId: data.monedaId,
      importeTotal: data.importeTotal || 0,
      importeRetenido: data.importeRetenido,
      importePagado: data.importePagado || 0,
      saldoPendiente: data.saldoPendiente || data.importeRetenido,
      estadoPagoId: data.estadoPagoId,
      aplicado: data.aplicado || false,
      fechaAplicacion: data.fechaAplicacion || null,
      observaciones: data.observaciones || null,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      creadoPor: data.creadoPor || null,
    };

    return await prisma.retencion.create({
      data: retencionData,
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza una retención existente
 * @param {BigInt} id - ID de la retención a actualizar
 * @param {Object} data - Datos actualizados
 * @returns {Promise<Object>} Retención actualizada
 * @throws {NotFoundError} Si la retención no existe
 */
const actualizar = async (id, data) => {
  try {
    const existe = await prisma.retencion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Retención no encontrada');

    await validarRetencion(data);

    const retencionData = {
      empresaId: data.empresaId,
      preFacturaId: data.preFacturaId,
      ordenCompraId: data.ordenCompraId,
      origenOperacionComprasVentas: data.origenOperacionComprasVentas,
      entidadComercialId: data.entidadComercialId,
      tipoRetencionPercepcionId: data.tipoRetencionPercepcionId,
      tasaRetencion: data.tasaRetencion,
      tipoDocumentoId: data.tipoDocumentoId,
      numeroDocumento: data.numeroDocumento,
      fechaEmision: data.fechaEmision,
      monedaId: data.monedaId,
      importeTotal: data.importeTotal,
      importeRetenido: data.importeRetenido,
      importePagado: data.importePagado,
      saldoPendiente: data.saldoPendiente,
      estadoPagoId: data.estadoPagoId,
      aplicado: data.aplicado,
      fechaAplicacion: data.fechaAplicacion,
      observaciones: data.observaciones,
      fechaContable: data.fechaContable,
      periodoContableId: data.periodoContableId,
      actualizadoPor: data.actualizadoPor,
    };

    return await prisma.retencion.update({
      where: { id },
      data: retencionData,
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Elimina una retención
 * @param {BigInt} id - ID de la retención a eliminar
 * @returns {Promise<Object>} Retención eliminada
 * @throws {NotFoundError} Si la retención no existe
 */
const eliminar = async (id) => {
  try {
    const existe = await prisma.retencion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Retención no encontrada');

    return await prisma.retencion.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};