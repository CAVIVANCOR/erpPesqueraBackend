import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DeudaConPersonal
 * Gestiona las deudas con trabajadores (sueldos, comisiones, etc.)
 * Documentado en español.
 */

async function validarDeudaConPersonal(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.personalId) {
    const personal = await prisma.personal.findUnique({ where: { id: data.personalId } });
    if (!personal) throw new ValidationError('El personal referenciado no existe.');
  }

  if (data.tipoDeudaId) {
    const tipo = await prisma.tipoDeudaPersonal.findUnique({ where: { id: data.tipoDeudaId } });
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
    return await prisma.deudaConPersonal.findMany({
      include: {
        empresa: true,
        personal: true,
        tipoDeuda: true,
        moneda: true,
        estado: true,
        periodoContable: true,
        pagos: true
      },
      orderBy: { fecha: 'desc' }
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
    const deuda = await prisma.deudaConPersonal.findUnique({
      where: { id },
      include: {
        empresa: true,
        personal: true,
        tipoDeuda: true,
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
    if (!deuda) throw new NotFoundError('Deuda con personal no encontrada');
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
    if (!data.empresaId || !data.personalId || !data.tipoDeudaId || !data.fecha || !data.montoOriginal || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarDeudaConPersonal(data);

    const deudaData = {
      ...data,
      montoPagado: data.montoPagado || 0,
      saldoPendiente: (data.montoOriginal || 0) - (data.montoPagado || 0),
      esGerencial: data.esGerencial !== undefined ? data.esGerencial : false,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      moduloOrigenId: data.moduloOrigenId || null,
      origenId: data.origenId || null,
      creadoPor: data.creadoPor || null
    };

    return await prisma.deudaConPersonal.create({ data: deudaData });
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
    const existente = await prisma.deudaConPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Deuda con personal no encontrada');

    await validarDeudaConPersonal({ ...data, id });

    // ✅ RECALCULAR montoPagado desde los pagos reales
    const pagos = await prisma.pagoDeudaPersonal.findMany({
      where: { deudaConPersonalId: id }
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

    return await prisma.deudaConPersonal.update({
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
    const existente = await prisma.deudaConPersonal.findUnique({
      where: { id },
      include: { pagos: true }
    });

    if (!existente) throw new NotFoundError('Deuda con personal no encontrada');

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError('No se puede eliminar la deuda porque tiene pagos asociados.');
    }

    await prisma.deudaConPersonal.delete({ where: { id } });
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
    return await prisma.deudaConPersonal.findMany({
      where: { empresaId },
      include: {
        personal: true,
        tipoDeuda: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fecha: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorPersonal = async (personalId) => {
  try {
    return await prisma.deudaConPersonal.findMany({
      where: { personalId },
      include: {
        empresa: true,
        tipoDeuda: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fecha: 'desc' }
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
    return await prisma.deudaConPersonal.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 }
      },
      include: {
        personal: true,
        tipoDeuda: true,
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
    return await prisma.deudaConPersonal.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 }
      },
      include: {
        personal: true,
        tipoDeuda: true,
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
    return await prisma.deudaConPersonal.findMany({
      where: { tipoDeudaId },
      include: {
        empresa: true,
        personal: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fecha: 'desc' }
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
  listarPorPersonal,
  listarPendientes,
  listarVencidas,
  listarPorTipo
};