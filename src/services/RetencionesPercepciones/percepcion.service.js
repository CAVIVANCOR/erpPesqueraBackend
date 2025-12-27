import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Percepcion
 * Gestiona las percepciones aplicadas a clientes.
 * Documentado en español.
 */

async function validarPercepcion(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.clienteId) {
    const cliente = await prisma.entidadComercial.findUnique({ where: { id: data.clienteId } });
    if (!cliente) throw new ValidationError('El cliente referenciado no existe.');
  }

  if (data.cuentaPorCobrarId) {
    const cuenta = await prisma.cuentaPorCobrar.findUnique({ where: { id: data.cuentaPorCobrarId } });
    if (!cuenta) throw new ValidationError('La cuenta por cobrar referenciada no existe.');
  }

  if (data.tipoPercepcionId) {
    const tipo = await prisma.tipoRetencionPercepcion.findUnique({ where: { id: data.tipoPercepcionId } });
    if (!tipo) throw new ValidationError('El tipo de percepción referenciado no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.porcentajePercepcion !== undefined && (data.porcentajePercepcion < 0 || data.porcentajePercepcion > 100)) {
    throw new ValidationError('El porcentaje de percepción debe estar entre 0 y 100.');
  }

  if (data.montoPercibido !== undefined && data.montoPercibido < 0) {
    throw new ValidationError('El monto percibido no puede ser negativo.');
  }
}

const listar = async () => {
  try {
    return await prisma.percepcion.findMany({
      include: {
        empresa: true,
        cliente: true,
        cuentaPorCobrar: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPercepcion: 'desc' }
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
    const percepcion = await prisma.percepcion.findUnique({
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        cuentaPorCobrar: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true
      }
    });
    if (!percepcion) throw new NotFoundError('Percepción no encontrada');
    return percepcion;
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
    if (!data.empresaId || !data.clienteId || !data.fechaPercepcion || !data.montoPercibido || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarPercepcion(data);

    const percepcionData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.percepcion.create({ data: percepcionData });
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
    const existente = await prisma.percepcion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Percepción no encontrada');

    await validarPercepcion({ ...data, id });

    const percepcionData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.percepcion.update({
      where: { id },
      data: percepcionData
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
    const existente = await prisma.percepcion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Percepción no encontrada');

    await prisma.percepcion.delete({ where: { id } });
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
    return await prisma.percepcion.findMany({
      where: { empresaId },
      include: {
        cliente: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPercepcion: 'desc' }
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
    return await prisma.percepcion.findMany({
      where: { clienteId },
      include: {
        empresa: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPercepcion: 'desc' }
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
    return await prisma.percepcion.findMany({
      where: {
        empresaId,
        fechaPercepcion: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      },
      include: {
        cliente: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPercepcion: 'asc' }
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
  listarPorPeriodo
};
