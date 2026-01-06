import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoPrestamo
 * Gestiona tipos de préstamos bancarios con sus características.
 * Documentado en español.
 */

/**
 * Valida los datos de un tipo de préstamo.
 * @param {Object} data - Datos del tipo de préstamo
 */
async function validarTipoPrestamo(data) {
  // Validar descripción única
  if (data.descripcion) {
    const existente = await prisma.tipoPrestamo.findFirst({
      where: {
        descripcion: data.descripcion,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`La descripción "${data.descripcion}" ya existe.`);
    }
  }

  // Validar severityColor si se proporciona
  if (data.severityColor) {
    const coloresValidos = ['info', 'success', 'warning', 'danger', 'help', 'primary', 'secondary'];
    if (!coloresValidos.includes(data.severityColor)) {
      throw new ValidationError('El color de severidad no es válido.');
    }
  }
}

/**
 * Lista todos los tipos de préstamo.
 */
const listar = async () => {
  try {
    return await prisma.tipoPrestamo.findMany({
      include: {
        personalCreador: true,
        personalActualizador: true,
        _count: {
          select: {
            prestamos: true
          }
        }
      },
      orderBy: { descripcion: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un tipo de préstamo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoPrestamo.findUnique({
      where: { id },
      include: {
        personalCreador: true,
        personalActualizador: true,
        prestamos: {
          select: {
            id: true,
            numeroPrestamo: true,
            montoDesembolsado: true,
            fechaDesembolso: true,
            estadoId: true
          },
          orderBy: { fechaDesembolso: 'desc' },
          take: 10
        }
      }
    });
    if (!tipo) throw new NotFoundError('Tipo de préstamo no encontrado');
    return tipo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo tipo de préstamo.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.descripcion) {
      throw new ValidationError('La descripción es obligatoria.');
    }

    await validarTipoPrestamo(data);

    return await prisma.tipoPrestamo.create({
      data: {
        descripcion: data.descripcion,
        descripcionCorta: data.descripcionCorta || null,
        requiereGarantia: data.requiereGarantia ?? false,
        esComercioExterior: data.esComercioExterior ?? false,
        esLeasing: data.esLeasing ?? false,
        esFactoring: data.esFactoring ?? false,
        permiteRefinanciar: data.permiteRefinanciar ?? true,
        severityColor: data.severityColor || null,
        activo: data.activo ?? true,
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.actualizadoPor || null
      },
      include: {
        personalCreador: true,
        personalActualizador: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un tipo de préstamo existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoPrestamo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de préstamo no encontrado');

    await validarTipoPrestamo({ ...data, id });

    return await prisma.tipoPrestamo.update({
      where: { id },
      data: {
        descripcion: data.descripcion,
        descripcionCorta: data.descripcionCorta,
        requiereGarantia: data.requiereGarantia,
        esComercioExterior: data.esComercioExterior,
        esLeasing: data.esLeasing,
        esFactoring: data.esFactoring,
        permiteRefinanciar: data.permiteRefinanciar,
        severityColor: data.severityColor,
        activo: data.activo,
        actualizadoPor: data.actualizadoPor
      },
      include: {
        personalCreador: true,
        personalActualizador: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Elimina un tipo de préstamo por ID.
 * Valida que no tenga préstamos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoPrestamo.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            prestamos: true
          }
        }
      }
    });

    if (!existente) throw new NotFoundError('Tipo de préstamo no encontrado');

    // Validar que no tenga préstamos asociados
    if (existente._count.prestamos > 0) {
      throw new ConflictError('No se puede eliminar el tipo de préstamo porque tiene préstamos asociados.');
    }

    await prisma.tipoPrestamo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista tipos de préstamo activos.
 */
const listarActivos = async () => {
  try {
    return await prisma.tipoPrestamo.findMany({
      where: { activo: true },
      orderBy: { descripcion: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista tipos de préstamo para comercio exterior.
 */
const listarComercioExterior = async () => {
  try {
    return await prisma.tipoPrestamo.findMany({
      where: {
        esComercioExterior: true,
        activo: true
      },
      orderBy: { descripcion: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene estadísticas de uso de tipos de préstamo.
 */
const obtenerEstadisticas = async () => {
  try {
    const tipos = await prisma.tipoPrestamo.findMany({
      include: {
        _count: {
          select: {
            prestamos: true
          }
        }
      }
    });

    return tipos.map(tipo => ({
      id: tipo.id,
      descripcion: tipo.descripcion,
      descripcionCorta: tipo.descripcionCorta,
      totalPrestamos: tipo._count.prestamos,
      activo: tipo.activo,
      esComercioExterior: tipo.esComercioExterior,
      esLeasing: tipo.esLeasing,
      esFactoring: tipo.esFactoring
    }));
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
  listarActivos,
  listarComercioExterior,
  obtenerEstadisticas
};