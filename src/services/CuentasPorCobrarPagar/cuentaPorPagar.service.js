import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CuentaPorPagar
 * Gestiona las cuentas por pagar a proveedores.
 * Documentado en español.
 */

async function validarCuentaPorPagar(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) throw new ValidationError('El proveedor referenciado no existe.');
  }

  if (data.ordenCompraId) {
    const orden = await prisma.ordenCompra.findUnique({ where: { id: data.ordenCompraId } });
    if (!orden) throw new ValidationError('La orden de compra referenciada no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.montoTotal !== undefined && data.montoTotal < 0) {
    throw new ValidationError('El monto total no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoPagado < 0) {
    throw new ValidationError('El monto pagado no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoTotal !== undefined && data.montoPagado > data.montoTotal) {
    throw new ValidationError('El monto pagado no puede ser mayor al monto total.');
  }

  if (data.montoDetraccionTotal !== undefined && data.montoDetraccionTotal < 0) {
    throw new ValidationError('El monto total de detracción no puede ser negativo.');
  }

  if (data.montoRetencionTotal !== undefined && data.montoRetencionTotal < 0) {
    throw new ValidationError('El monto total de retención no puede ser negativo.');
  }

  if (data.montoPercepcionTotal !== undefined && data.montoPercepcionTotal < 0) {
    throw new ValidationError('El monto total de percepción no puede ser negativo.');
  }

  if (data.porcentajeRetencion !== undefined && (data.porcentajeRetencion < 0 || data.porcentajeRetencion > 100)) {
    throw new ValidationError('El porcentaje de retención debe estar entre 0 y 100.');
  }

  if (data.porcentajeDetraccion !== undefined && (data.porcentajeDetraccion < 0 || data.porcentajeDetraccion > 100)) {
    throw new ValidationError('El porcentaje de detracción debe estar entre 0 y 100.');
  }

  if (data.porcentajePercepcion !== undefined && (data.porcentajePercepcion < 0 || data.porcentajePercepcion > 100)) {
    throw new ValidationError('El porcentaje de percepción debe estar entre 0 y 100.');
  }
}

const listar = async () => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      include: {
        empresa: true,
        proveedor: true,
        ordenCompra: {
          include: {
            tipoDocumento: true,
          },
        },
        moneda: true,
        estado: true,
        pagos: true,
        periodoContable: true,
      },
      orderBy: { fechaEmision: 'desc' }
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
    const cuenta = await prisma.cuentaPorPagar.findUnique({
      where: { id },
      include: {
        empresa: true,
        proveedor: true,
        ordenCompra: true,
        moneda: true,
        estado: true,
        pagos: {
          include: {
            medioPago: true
          },
          orderBy: { fechaPago: 'desc' }
        }
      }
    });
    if (!cuenta) throw new NotFoundError('Cuenta por pagar no encontrada');
    return cuenta;
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
    if (!data.empresaId || !data.proveedorId || !data.fechaEmision || !data.montoTotal || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarCuentaPorPagar(data);

    const cuentaData = {
      ...data,
      montoPagado: data.montoPagado || 0,
      saldoPendiente: (data.montoTotal || 0) - (data.montoPagado || 0),
      esGerencial: data.esGerencial !== undefined ? data.esGerencial : false,
      tieneDetraccion: data.tieneDetraccion || false,
      montoDetraccionTotal: data.montoDetraccionTotal || 0,
      porcentajeDetraccion: data.porcentajeDetraccion || null,
      tieneRetencion: data.tieneRetencion || false,
      montoRetencionTotal: data.montoRetencionTotal || 0,
      porcentajeRetencion: data.porcentajeRetencion || null,
      tienePercepcion: data.tienePercepcion || false,
      montoPercepcionTotal: data.montoPercepcionTotal || 0,
      porcentajePercepcion: data.porcentajePercepcion || null,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      creadoPor: data.creadoPor || null,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };

    return await prisma.cuentaPorPagar.create({ data: cuentaData });
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
    const existente = await prisma.cuentaPorPagar.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cuenta por pagar no encontrada');

    await validarCuentaPorPagar({ ...data, id });

    // ✅ RECALCULAR montoPagado desde los pagos reales
    const pagos = await prisma.pagoCuentaPorPagar.findMany({
      where: { cuentaPorPagarId: id },
    });

    const montoPagadoRecalculado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
      0
    );

    // Calcular saldo pendiente
    const montoTotal =
      data.montoTotal !== undefined ? data.montoTotal : existente.montoTotal;

    // ✅ USAR montoPagado recalculado, NO el que viene en data
    const montoPagado = montoPagadoRecalculado;

    const saldoPendiente = Number(montoTotal) - Number(montoPagado);

    const cuentaData = {
      ...data,
      montoPagado, // ✅ Forzar el montoPagado recalculado
      saldoPendiente,
      esGerencial: data.esGerencial,
      actualizadoPor: data.actualizadoPor || null,
      fechaActualizacion: new Date()
    };

    return await prisma.cuentaPorPagar.update({
      where: { id },
      data: cuentaData
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
    const existente = await prisma.cuentaPorPagar.findUnique({
      where: { id },
      include: { pagos: true }
    });

    if (!existente) throw new NotFoundError('Cuenta por pagar no encontrada');

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError('No se puede eliminar la cuenta porque tiene pagos asociados.');
    }

    await prisma.cuentaPorPagar.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      where: { empresaId },
      include: {
        proveedor: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorProveedor = async (proveedorId) => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      where: { proveedorId },
      include: {
        empresa: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPendientes = async (empresaId) => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 }
      },
      include: {
        proveedor: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarVencidas = async (empresaId) => {
  try {
    const hoy = new Date();
    return await prisma.cuentaPorPagar.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 }
      },
      include: {
        proveedor: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
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
  eliminar,
  listarPorEmpresa,
  listarPorProveedor,
  listarPendientes,
  listarVencidas
};
