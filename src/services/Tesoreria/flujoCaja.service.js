import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para FlujoCaja
 * Gestiona el flujo de caja con ingresos y egresos.
 * Documentado en español.
 */

async function validarFlujoCaja(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.cuentaCorrienteId) {
    const cuenta = await prisma.cuentaCorriente.findUnique({ where: { id: data.cuentaCorrienteId } });
    if (!cuenta) throw new ValidationError('La cuenta corriente referenciada no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.tipoMovimiento && !['INGRESO', 'EGRESO'].includes(data.tipoMovimiento)) {
    throw new ValidationError('El tipo de movimiento debe ser: INGRESO o EGRESO.');
  }

  if (data.monto !== undefined && data.monto <= 0) {
    throw new ValidationError('El monto debe ser mayor a 0.');
  }
}

const listar = async () => {
  try {
    return await prisma.flujoCaja.findMany({
      include: {
        empresa: true,
        cuentaCorriente: true,
        moneda: true,
        estado: true
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
    const flujo = await prisma.flujoCaja.findUnique({
      where: { id },
      include: {
        empresa: true,
        cuentaCorriente: true,
        moneda: true,
        estado: true
      }
    });
    if (!flujo) throw new NotFoundError('Flujo de caja no encontrado');
    return flujo;
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
    if (!data.empresaId || !data.fecha || !data.tipoMovimiento || !data.monto || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarFlujoCaja(data);

    const flujoData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.flujoCaja.create({ data: flujoData });
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
    const existente = await prisma.flujoCaja.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Flujo de caja no encontrado');

    await validarFlujoCaja({ ...data, id });

    const flujoData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.flujoCaja.update({
      where: { id },
      data: flujoData
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
    const existente = await prisma.flujoCaja.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Flujo de caja no encontrado');

    await prisma.flujoCaja.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.flujoCaja.findMany({
      where: { empresaId },
      include: {
        cuentaCorriente: true,
        moneda: true,
        estado: true
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

const listarPorCuentaCorriente = async (cuentaCorrienteId) => {
  try {
    return await prisma.flujoCaja.findMany({
      where: { cuentaCorrienteId },
      include: {
        empresa: true,
        moneda: true,
        estado: true
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

const listarPorPeriodo = async (empresaId, fechaInicio, fechaFin) => {
  try {
    return await prisma.flujoCaja.findMany({
      where: {
        empresaId,
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      },
      include: {
        cuentaCorriente: true,
        moneda: true,
        estado: true
      },
      orderBy: { fecha: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerResumenPorPeriodo = async (empresaId, fechaInicio, fechaFin) => {
  try {
    const movimientos = await prisma.flujoCaja.findMany({
      where: {
        empresaId,
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      }
    });

    const totalIngresos = movimientos
      .filter(m => m.tipoMovimiento === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalEgresos = movimientos
      .filter(m => m.tipoMovimiento === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const saldoNeto = totalIngresos - totalEgresos;

    return {
      totalIngresos,
      totalEgresos,
      saldoNeto,
      cantidadMovimientos: movimientos.length
    };
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
  listarPorCuentaCorriente,
  listarPorPeriodo,
  obtenerResumenPorPeriodo
};
