import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoDeudaPersonal
 * Gestiona el catálogo de tipos de deuda con personal (Sueldos, Comisiones, CTS, etc.)
 * Documentado en español.
 */

async function validarTipoDeudaPersonal(data) {
  if (data.nombre && data.nombre.trim().length === 0) {
    throw new ValidationError('El nombre no puede estar vacío.');
  }

  if (data.nombre && data.nombre.length > 100) {
    throw new ValidationError('El nombre no puede exceder 100 caracteres.');
  }

  if (data.cuentaContableId) {
    const cuenta = await prisma.planCuentasContable.findUnique({ where: { id: data.cuentaContableId } });
    if (!cuenta) throw new ValidationError('La cuenta contable referenciada no existe.');
  }
}

const listar = async () => {
  try {
    return await prisma.tipoDeudaPersonal.findMany({
      include: {
        categoria: true,
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
    return await prisma.tipoDeudaPersonal.findMany({
      where: { activo: true },
      include: {
        categoria: true,
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
    const tipo = await prisma.tipoDeudaPersonal.findUnique({
      where: { id },
      include: {
        categoria: true,
        cuentaContable: true,
        deudas: {
          include: {
            personal: true,
            empresa: true,
            estado: true
          },
          take: 10,
          orderBy: { fecha: 'desc' }
        }
      }
    });
    if (!tipo) throw new NotFoundError('Tipo de deuda personal no encontrado');
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
    if (!data.nombre) {
      throw new ValidationError('El nombre es obligatorio.');
    }

    await validarTipoDeudaPersonal(data);

    const tipoData = {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      categoriaId: data.categoriaId ? Number(data.categoriaId) : null,
      cuentaContableId: Number(data.cuentaContableId) || null,
      periodicidad: data.periodicidad || null,
      activo: data.activo !== undefined ? data.activo : true,
      creadoPor: data.creadoPor || null
    };
    return await prisma.tipoDeudaPersonal.create({ data: tipoData });
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
    const existente = await prisma.tipoDeudaPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de deuda personal no encontrado');

    await validarTipoDeudaPersonal(data);

    const tipoData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    return await prisma.tipoDeudaPersonal.update({
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
    const existente = await prisma.tipoDeudaPersonal.findUnique({
      where: { id },
      include: { deudas: true }
    });

    if (!existente) throw new NotFoundError('Tipo de deuda personal no encontrado');

    if (existente.deudas && existente.deudas.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo porque tiene deudas asociadas.');
    }

    await prisma.tipoDeudaPersonal.delete({ where: { id } });
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