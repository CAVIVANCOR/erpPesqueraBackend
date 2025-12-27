import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ConciliacionBancaria
 * Gestiona las conciliaciones bancarias mensuales.
 * Documentado en español.
 */

async function validarConciliacionBancaria(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.cuentaCorrienteId) {
    const cuenta = await prisma.cuentaCorriente.findUnique({ where: { id: data.cuentaCorrienteId } });
    if (!cuenta) throw new ValidationError('La cuenta corriente referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.mes !== undefined && (data.mes < 1 || data.mes > 12)) {
    throw new ValidationError('El mes debe estar entre 1 y 12.');
  }

  if (data.anio !== undefined) {
    const anioActual = new Date().getFullYear();
    if (data.anio < 2000 || data.anio > anioActual + 10) {
      throw new ValidationError(`El año debe estar entre 2000 y ${anioActual + 10}.`);
    }
  }

  if (data.empresaId && data.cuentaCorrienteId && data.mes !== undefined && data.anio !== undefined) {
    const existente = await prisma.conciliacionBancaria.findFirst({
      where: {
        empresaId: data.empresaId,
        cuentaCorrienteId: data.cuentaCorrienteId,
        mes: data.mes,
        anio: data.anio,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`Ya existe una conciliación para ${data.mes}/${data.anio} en esta cuenta.`);
    }
  }
}

const listar = async () => {
  try {
    return await prisma.conciliacionBancaria.findMany({
      include: {
        empresa: true,
        cuentaCorriente: true,
        estado: true
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
      ]
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
    const conciliacion = await prisma.conciliacionBancaria.findUnique({
      where: { id },
      include: {
        empresa: true,
        cuentaCorriente: true,
        estado: true
      }
    });
    if (!conciliacion) throw new NotFoundError('Conciliación bancaria no encontrada');
    return conciliacion;
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
    if (!data.empresaId || !data.cuentaCorrienteId || data.mes === undefined || data.anio === undefined || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarConciliacionBancaria(data);

    const conciliacionData = {
      ...data,
      saldoLibros: data.saldoLibros || 0,
      saldoBanco: data.saldoBanco || 0,
      diferencia: (data.saldoLibros || 0) - (data.saldoBanco || 0),
      conciliado: false,
      fechaActualizacion: new Date()
    };

    return await prisma.conciliacionBancaria.create({ data: conciliacionData });
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
    const existente = await prisma.conciliacionBancaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Conciliación bancaria no encontrada');

    await validarConciliacionBancaria({ ...data, id });

    const conciliacionData = {
      ...data,
      diferencia: data.saldoLibros !== undefined && data.saldoBanco !== undefined 
        ? data.saldoLibros - data.saldoBanco 
        : undefined,
      fechaActualizacion: new Date()
    };

    return await prisma.conciliacionBancaria.update({
      where: { id },
      data: conciliacionData
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
    const existente = await prisma.conciliacionBancaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Conciliación bancaria no encontrada');

    if (existente.conciliado) {
      throw new ConflictError('No se puede eliminar una conciliación que ya está conciliada.');
    }

    await prisma.conciliacionBancaria.delete({ where: { id } });
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
    return await prisma.conciliacionBancaria.findMany({
      where: { empresaId },
      include: {
        cuentaCorriente: true,
        estado: true
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
      ]
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
    return await prisma.conciliacionBancaria.findMany({
      where: { cuentaCorrienteId },
      include: {
        empresa: true,
        estado: true
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const marcarConciliado = async (id, conciliadoPorId) => {
  try {
    const conciliacion = await prisma.conciliacionBancaria.findUnique({ where: { id } });
    if (!conciliacion) throw new NotFoundError('Conciliación bancaria no encontrada');

    if (conciliacion.conciliado) {
      throw new ConflictError('La conciliación ya está marcada como conciliada.');
    }

    if (conciliadoPorId) {
      const personal = await prisma.personal.findUnique({ where: { id: conciliadoPorId } });
      if (!personal) {
        throw new ValidationError('El personal que concilia no existe.');
      }
    }

    return await prisma.conciliacionBancaria.update({
      where: { id },
      data: {
        conciliado: true,
        fechaConciliacion: new Date(),
        conciliadoPorId,
        fechaActualizacion: new Date()
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
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
  marcarConciliado
};
