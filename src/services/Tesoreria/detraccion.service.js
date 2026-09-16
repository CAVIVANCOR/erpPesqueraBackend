import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Detraccion
 * Gestiona las detracciones fiscales aplicadas a documentos
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
  tipoDetraccion: {
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
  cuentaBNSunatPropia: {
    select: {
      id: true,
      numeroCuenta: true,
      banco: {
        select: {
          id: true,
          nombre: true
        }
      }
    }
  },
  cuentaBNSunatProveedor: {
    select: {
      id: true,
      numeroCuenta: true,
      banco: {
        select: {
          id: true,
          nombre: true
        }
      }
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

async function validarDetraccion(data) {
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

  if (data.importeRequerido !== undefined && data.importeRequerido < 0) {
    throw new ValidationError('El importe requerido no puede ser negativo.');
  }

  if (data.importePagado !== undefined && data.importePagado < 0) {
    throw new ValidationError('El importe pagado no puede ser negativo.');
  }
}

const listar = async () => {
  try {
    return await prisma.detraccion.findMany({
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

const obtenerPorId = async (id) => {
  try {
    const detraccion = await prisma.detraccion.findUnique({
      where: { id },
      include: {
        ...incluirRelaciones,
        movimientosCaja: {
          include: {
            medioPago: true,
            tipoMovimiento: true,
            cuentaCorrienteOrigen: {
              include: {
                banco: true
              }
            },
            cuentaCorrienteDestino: {
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
    if (!detraccion) throw new NotFoundError('Detracción no encontrada');
  
    
    return detraccion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios con mensajes específicos
    const camposFaltantes = [];
    
    if (!data.empresaId) camposFaltantes.push('Empresa');
    if (!data.entidadComercialId) camposFaltantes.push('Entidad Comercial');
    if (data.importeRequerido === undefined || data.importeRequerido === null) camposFaltantes.push('Importe Requerido');
    if (!data.monedaId) camposFaltantes.push('Moneda');
    if (!data.estadoPagoId) camposFaltantes.push('Estado');
    
    if (camposFaltantes.length > 0) {
      throw new ValidationError(`Faltan campos obligatorios: ${camposFaltantes.join(', ')}`);
    }

    await validarDetraccion(data);

    const detraccionData = {
      empresaId: data.empresaId,
      preFacturaId: data.preFacturaId || null,
      ordenCompraId: data.ordenCompraId || null,
      origenOperacionComprasVentas: data.origenOperacionComprasVentas || false,
      entidadComercialId: data.entidadComercialId,
      tipoDetraccionId: data.tipoDetraccionId || null,
      tasaDetraccion: data.tasaDetraccion || 0,
      tipoDocumentoId: data.tipoDocumentoId || null,
      numeroDocumento: data.numeroDocumento || null,
      fechaEmision: data.fechaEmision || null,
      monedaId: data.monedaId,
      importeTotal: data.importeTotal || 0,
      importeRequerido: data.importeRequerido,
      importePagado: data.importePagado || 0,
      saldoPendiente: data.saldoPendiente || data.importeRequerido,
      estadoPagoId: data.estadoPagoId,
      cuentaBNSunatPropiaId: data.cuentaBNSunatPropiaId || null,
      cuentaBNSunatProveedorId: data.cuentaBNSunatProveedorId || null,
      aplicado: data.aplicado || false,
      fechaAplicacion: data.fechaAplicacion || null,
      observaciones: data.observaciones || null,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      creadoPor: data.creadoPor || null,
    };

    return await prisma.detraccion.create({
      data: detraccionData,
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

const actualizar = async (id, data) => {
  try {
    const existe = await prisma.detraccion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Detracción no encontrada');

    await validarDetraccion(data);

    const detraccionData = {
      empresaId: data.empresaId,
      preFacturaId: data.preFacturaId,
      ordenCompraId: data.ordenCompraId,
      origenOperacionComprasVentas: data.origenOperacionComprasVentas,
      entidadComercialId: data.entidadComercialId,
      tipoDetraccionId: data.tipoDetraccionId,
      tasaDetraccion: data.tasaDetraccion,
      tipoDocumentoId: data.tipoDocumentoId,
      numeroDocumento: data.numeroDocumento,
      fechaEmision: data.fechaEmision,
      monedaId: data.monedaId,
      importeTotal: data.importeTotal,
      importeRequerido: data.importeRequerido,
      importePagado: data.importePagado,
      saldoPendiente: data.saldoPendiente,
      estadoPagoId: data.estadoPagoId,
      cuentaBNSunatPropiaId: data.cuentaBNSunatPropiaId,
      cuentaBNSunatProveedorId: data.cuentaBNSunatProveedorId,
      aplicado: data.aplicado,
      fechaAplicacion: data.fechaAplicacion,
      observaciones: data.observaciones,
      fechaContable: data.fechaContable,
      periodoContableId: data.periodoContableId,
      actualizadoPor: data.actualizadoPor,
    };

    return await prisma.detraccion.update({
      where: { id },
      data: detraccionData,
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

const eliminar = async (id) => {
  try {
    const existe = await prisma.detraccion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Detracción no encontrada');

    return await prisma.detraccion.delete({ where: { id } });
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