import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CuentaPorCobrar
 * Gestiona las cuentas por cobrar a clientes.
 * Documentado en español.
 */

async function validarCuentaPorCobrar(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.clienteId) {
    const cliente = await prisma.entidadComercial.findUnique({ where: { id: data.clienteId } });
    if (!cliente) throw new ValidationError('El cliente referenciado no existe.');
  }

  if (data.comprobanteElectronicoId) {
    const comprobante = await prisma.comprobanteElectronico.findUnique({ 
      where: { id: data.comprobanteElectronicoId } 
    });
    if (!comprobante) throw new ValidationError('El comprobante electrónico referenciado no existe.');
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
}

const listar = async () => {
  try {
    return await prisma.cuentaPorCobrar.findMany({
      include: {
        empresa: true,
        cliente: true,
        comprobanteElectronico: true,
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

const obtenerPorId = async (id) => {
  try {
    const cuenta = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        comprobanteElectronico: true,
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
    if (!cuenta) throw new NotFoundError('Cuenta por cobrar no encontrada');
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
    if (!data.empresaId || !data.clienteId || !data.fechaEmision || !data.montoTotal || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarCuentaPorCobrar(data);

    const cuentaData = {
      ...data,
      montoPagado: data.montoPagado || 0,
      saldoPendiente: (data.montoTotal || 0) - (data.montoPagado || 0),
      fechaActualizacion: new Date()
    };

    return await prisma.cuentaPorCobrar.create({ data: cuentaData });
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
    const existente = await prisma.cuentaPorCobrar.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cuenta por cobrar no encontrada');

    await validarCuentaPorCobrar({ ...data, id });

    const cuentaData = {
      ...data,
      saldoPendiente: data.montoTotal !== undefined && data.montoPagado !== undefined 
        ? data.montoTotal - data.montoPagado 
        : undefined,
      fechaActualizacion: new Date()
    };

    return await prisma.cuentaPorCobrar.update({
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
    const existente = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: { pagos: true }
    });

    if (!existente) throw new NotFoundError('Cuenta por cobrar no encontrada');

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError('No se puede eliminar la cuenta porque tiene pagos asociados.');
    }

    await prisma.cuentaPorCobrar.delete({ where: { id } });
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
    return await prisma.cuentaPorCobrar.findMany({
      where: { empresaId },
      include: {
        cliente: true,
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

const listarPorCliente = async (clienteId) => {
  try {
    return await prisma.cuentaPorCobrar.findMany({
      where: { clienteId },
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
    return await prisma.cuentaPorCobrar.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 }
      },
      include: {
        cliente: true,
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
    return await prisma.cuentaPorCobrar.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 }
      },
      include: {
        cliente: true,
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
  listarPorCliente,
  listarPendientes,
  listarVencidas
};
