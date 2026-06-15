import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DeudaTributaria
 * Gestiona las deudas tributarias con SUNAT, ESSALUD, ONP, etc.
 * Documentado en español.
 */

async function validarDeudaTributaria(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.tipoDeudaId) {
    const tipo = await prisma.tipoDeudaTributaria.findUnique({ where: { id: data.tipoDeudaId } });
    if (!tipo) throw new ValidationError('El tipo de deuda referenciado no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.montoOriginal !== undefined && data.montoOriginal < 0) {
    throw new ValidationError('El monto original no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoPagado < 0) {
    throw new ValidationError('El monto pagado no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoOriginal !== undefined && data.montoPagado > data.montoOriginal) {
    throw new ValidationError('El monto pagado no puede ser mayor al monto original.');
  }
}

const listar = async () => {
  try {
    return await prisma.deudaTributaria.findMany({
      include: {
        empresa: true,
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
        moneda: true,
        estado: true,
        periodoContable: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
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
    const deuda = await prisma.deudaTributaria.findUnique({
      where: { id },
      include: {
        empresa: true,
        tipoDeuda: {
          include: {
            entidadRecaudadora: true,
            cuentaContable: true
          }
        },
        moneda: true,
        estado: true,
        periodoContable: true,
        pagos: {
          include: {
            medioPago: true,
            movimientoCaja: true
          },
          orderBy: { fechaPago: 'desc' }
        }
      }
    });
    if (!deuda) throw new NotFoundError('Deuda tributaria no encontrada');
    return deuda;
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
    if (!data.empresaId || !data.tipoDeudaId || !data.periodo || !data.fechaGeneracion || !data.montoOriginal || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarDeudaTributaria(data);

    const deudaData = {
      ...data,
      montoPagado: data.montoPagado || 0,
      saldoPendiente: (data.montoOriginal || 0) - (data.montoPagado || 0),
      esSaldoInicial: data.esSaldoInicial !== undefined ? data.esSaldoInicial : false,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      moduloOrigenId: data.moduloOrigenId || null,
      origenId: data.origenId || null,
      creadoPor: data.creadoPor || null
    };

    return await prisma.deudaTributaria.create({ data: deudaData });
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
    const existente = await prisma.deudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Deuda tributaria no encontrada');

    await validarDeudaTributaria({ ...data, id });

    // ✅ RECALCULAR montoPagado desde los pagos reales
    const pagos = await prisma.pagoDeudaTributaria.findMany({
      where: { deudaTributariaId: id }
    });

    const montoPagadoRecalculado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoPago || 0),
      0
    );

    // Calcular saldo pendiente
    const montoOriginal = data.montoOriginal !== undefined ? data.montoOriginal : existente.montoOriginal;
    const montoPagado = montoPagadoRecalculado;
    const saldoPendiente = Number(montoOriginal) - Number(montoPagado);

    const deudaData = {
      ...data,
      montoPagado, // ✅ Forzar el montoPagado recalculado
      saldoPendiente,
      actualizadoPor: data.actualizadoPor || null
    };

    return await prisma.deudaTributaria.update({
      where: { id },
      data: deudaData
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
    const existente = await prisma.deudaTributaria.findUnique({
      where: { id },
      include: { pagos: true }
    });

    if (!existente) throw new NotFoundError('Deuda tributaria no encontrada');

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError('No se puede eliminar la deuda porque tiene pagos asociados.');
    }

    await prisma.deudaTributaria.delete({ where: { id } });
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
    return await prisma.deudaTributaria.findMany({
      where: { empresaId },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
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
    return await prisma.deudaTributaria.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 }
      },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
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
    return await prisma.deudaTributaria.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 }
      },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
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

const listarPorTipo = async (tipoDeudaId) => {
  try {
    return await prisma.deudaTributaria.findMany({
      where: { tipoDeudaId },
      include: {
        empresa: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorPeriodo = async (empresaId, periodo) => {
  try {
    return await prisma.deudaTributaria.findMany({
      where: {
        empresaId,
        periodo
      },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
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
  listarPendientes,
  listarVencidas,
  listarPorTipo,
  listarPorPeriodo
};