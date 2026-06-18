import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoDeudaTributaria
 * Gestiona el catálogo de tipos de deuda tributaria (IGV, Renta, ESSALUD, ONP, etc.)
 * Documentado en español.
 */

async function validarTipoDeudaTributaria(data) {
  if (data.nombre && data.nombre.trim().length === 0) {
    throw new ValidationError('El nombre no puede estar vacío.');
  }

  if (data.nombre && data.nombre.length > 100) {
    throw new ValidationError('El nombre no puede exceder 100 caracteres.');
  }

  if (data.entidadRecaudadoraId) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: data.entidadRecaudadoraId } });
    if (!entidad) throw new ValidationError('La entidad recaudadora referenciada no existe.');
  }

  if (data.cuentaContableId) {
    const cuenta = await prisma.planCuentasContable.findUnique({ where: { id: data.cuentaContableId } });
    if (!cuenta) throw new ValidationError('La cuenta contable referenciada no existe.');
  }
}

const listar = async () => {
  try {
    return await prisma.tipoDeudaTributaria.findMany({
      include: {
        categoria: true,
        entidadRecaudadora: true,
        cuentaContable: true
      },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarActivos = async () => {
  try {
    return await prisma.tipoDeudaTributaria.findMany({
      where: { activo: true },
      include: {
        categoria: true,
        entidadRecaudadora: true,
        cuentaContable: true
      },
      orderBy: { nombre: 'asc' }
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
    const tipo = await prisma.tipoDeudaTributaria.findUnique({
      where: { id },
      include: {
        categoria: true,
        entidadRecaudadora: true,
        cuentaContable: true,
        deudas: {
          include: {
            empresa: true,
            estado: true
          },
          take: 10,
          orderBy: { fechaGeneracion: 'desc' }
        }
      }
    });
    if (!tipo) throw new NotFoundError('Tipo de deuda tributaria no encontrado');
    return tipo;
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
    if (!data.nombre || !data.periodicidad) {
      throw new ValidationError('El nombre y la periodicidad son obligatorios.');
    }

    await validarTipoDeudaTributaria(data);

    const tipoData = {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      categoriaId: data.categoriaId ? Number(data.categoriaId) : null,
      entidadRecaudadoraId: Number(data.entidadRecaudadoraId) || null,
      periodicidad: data.periodicidad,
      cuentaContableId: Number(data.cuentaContableId) || null,
      activo: data.activo !== undefined ? data.activo : true,
      creadoPor: data.creadoPor || null
    };

    return await prisma.tipoDeudaTributaria.create({ data: tipoData });
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
    const existente = await prisma.tipoDeudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de deuda tributaria no encontrado');

    await validarTipoDeudaTributaria(data);

    const tipoData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    return await prisma.tipoDeudaTributaria.update({
      where: { id },
      data: tipoData
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
    const existente = await prisma.tipoDeudaTributaria.findUnique({
      where: { id },
      include: { deudas: true }
    });

    if (!existente) throw new NotFoundError('Tipo de deuda tributaria no encontrado');

    if (existente.deudas && existente.deudas.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo porque tiene deudas asociadas.');
    }

    await prisma.tipoDeudaTributaria.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  listarActivos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};