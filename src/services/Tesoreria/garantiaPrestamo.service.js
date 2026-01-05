import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para GarantiaPrestamo
 * Gestiona las garantías de préstamos bancarios.
 * Documentado en español.
 */

/**
 * Valida los datos de una garantía de préstamo.
 * @param {Object} data - Datos de la garantía
 */
async function validarGarantiaPrestamo(data) {
  // Validar préstamo
  if (data.prestamoBancarioId) {
    const prestamo = await prisma.prestamoBancario.findUnique({ 
      where: { id: data.prestamoBancarioId } 
    });
    if (!prestamo) {
      throw new ValidationError('El préstamo bancario referenciado no existe.');
    }
  }

  // Validar tipo de garantía
  if (data.tipoGarantia) {
    const tiposValidos = ['HIPOTECARIA', 'PRENDARIA', 'FIANZA', 'SIN_GARANTIA'];
    if (!tiposValidos.includes(data.tipoGarantia)) {
      throw new ValidationError('El tipo de garantía no es válido.');
    }
  }

  // Validar que el valor de tasación sea positivo
  if (data.valorTasacion && data.valorTasacion <= 0) {
    throw new ValidationError('El valor de tasación debe ser mayor a cero.');
  }

  // Validaciones específicas por tipo de garantía
  if (data.tipoGarantia === 'HIPOTECARIA') {
    if (!data.direccionInmueble || !data.partidaRegistral) {
      throw new ValidationError('Para garantía hipotecaria se requiere dirección y partida registral.');
    }
  }

  if (data.tipoGarantia === 'PRENDARIA') {
    if (!data.descripcionBien) {
      throw new ValidationError('Para garantía prendaria se requiere descripción del bien.');
    }
  }

  if (data.tipoGarantia === 'FIANZA') {
    if (!data.nombreFiador || !data.documentoFiador) {
      throw new ValidationError('Para fianza se requiere nombre y documento del fiador.');
    }
  }
}

/**
 * Lista todas las garantías de préstamo.
 */
const listar = async () => {
  try {
    return await prisma.garantiaPrestamo.findMany({
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        }
      },
      orderBy: { creadoEn: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una garantía de préstamo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const garantia = await prisma.garantiaPrestamo.findUnique({
      where: { id },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        }
      }
    });
    if (!garantia) throw new NotFoundError('Garantía de préstamo no encontrada');
    return garantia;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva garantía de préstamo.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.prestamoBancarioId || !data.tipoGarantia || 
        !data.descripcion || data.valorTasacion === null || 
        data.valorTasacion === undefined) {
      throw new ValidationError('Faltan campos obligatorios para crear la garantía.');
    }

    await validarGarantiaPrestamo(data);

    return await prisma.garantiaPrestamo.create({ 
      data,
      include: {
        prestamo: true
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
 * Actualiza una garantía de préstamo existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.garantiaPrestamo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Garantía de préstamo no encontrada');

    await validarGarantiaPrestamo({ ...data, id });

    return await prisma.garantiaPrestamo.update({
      where: { id },
      data,
      include: {
        prestamo: true
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
 * Elimina una garantía de préstamo por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.garantiaPrestamo.findUnique({ where: { id } });

    if (!existente) throw new NotFoundError('Garantía de préstamo no encontrada');

    // Validar que la garantía no esté activa
    if (existente.activo) {
      throw new ConflictError('No se puede eliminar una garantía activa. Primero debe liberarla.');
    }

    await prisma.garantiaPrestamo.delete({ where: { id } });
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
 * Lista garantías por préstamo.
 */
const listarPorPrestamo = async (prestamoBancarioId) => {
  try {
    return await prisma.garantiaPrestamo.findMany({
      where: { prestamoBancarioId },
      orderBy: { creadoEn: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista garantías activas.
 */
const listarActivas = async () => {
  try {
    return await prisma.garantiaPrestamo.findMany({
      where: { activo: true },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        }
      },
      orderBy: { creadoEn: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Libera una garantía (marca como inactiva).
 */
const liberar = async (id, fechaLiberacion = null) => {
  try {
    const existente = await prisma.garantiaPrestamo.findUnique({ where: { id } });

    if (!existente) throw new NotFoundError('Garantía de préstamo no encontrada');

    if (!existente.activo) {
      throw new ConflictError('La garantía ya está liberada.');
    }

    return await prisma.garantiaPrestamo.update({
      where: { id },
      data: {
        activo: false,
        fechaLiberacion: fechaLiberacion || new Date()
      },
      include: {
        prestamo: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Reactiva una garantía liberada.
 */
const reactivar = async (id) => {
  try {
    const existente = await prisma.garantiaPrestamo.findUnique({ where: { id } });

    if (!existente) throw new NotFoundError('Garantía de préstamo no encontrada');

    if (existente.activo) {
      throw new ConflictError('La garantía ya está activa.');
    }

    return await prisma.garantiaPrestamo.update({
      where: { id },
      data: {
        activo: true,
        fechaLiberacion: null
      },
      include: {
        prestamo: true
      }
    });
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
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorPrestamo,
  listarActivas,
  liberar,
  reactivar
};
