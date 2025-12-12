import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetCuotaPesca
 * Gestiona los detalles de cuota de pesca por empresa.
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de empresaId e idPersonaActualiza.
 * Valida que el porcentaje de cuota sea válido.
 * Lanza ValidationError si no existen o son inválidos.
 * @param {Object} data - Datos del detalle de cuota
 */
async function validarDetCuotaPesca(data) {
  // Validar empresa
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('Empresa no existente para el campo empresaId.');
  }

  // Validar persona que actualiza
  if (data.idPersonaActualiza !== undefined && data.idPersonaActualiza !== null) {
    const persona = await prisma.personal.findUnique({ where: { id: data.idPersonaActualiza } });
    if (!persona) throw new ValidationError('Personal no existente para el campo idPersonaActualiza.');
  }

  // Validar porcentaje de cuota
  if (data.porcentajeCuota !== undefined && data.porcentajeCuota !== null) {
    const porcentaje = Number(data.porcentajeCuota);
    if (porcentaje < 0) {
      throw new ValidationError('El porcentaje de cuota no puede ser negativo');
    }
    if (porcentaje > 100) {
      throw new ValidationError('El porcentaje de cuota no puede ser mayor a 100%');
    }
  }

  // Validar que el nombre no esté vacío
  if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
    throw new ValidationError('El nombre del detalle de cuota es obligatorio');
  }
}

/**
 * Valida que la suma de porcentajes de cuota para una empresa no exceda 100%.
 * @param {BigInt} empresaId - ID de la empresa
 * @param {Number} porcentajeCuota - Porcentaje de cuota a agregar/actualizar
 * @param {BigInt} idExcluir - ID del detalle a excluir en caso de actualización
 */
async function validarSumaPorcentajes(empresaId, porcentajeCuota, idExcluir = null) {
  const where = { empresaId, activo: true };
  if (idExcluir) {
    where.id = { not: idExcluir };
  }

  const detalles = await prisma.detCuotaPesca.findMany({ where });
  const sumaActual = detalles.reduce((sum, d) => sum + Number(d.porcentajeCuota), 0);
  const nuevaSuma = sumaActual + Number(porcentajeCuota);

  if (nuevaSuma > 100) {
    throw new ValidationError(
      `La suma de porcentajes de cuota (${nuevaSuma.toFixed(2)}%) excede el 100%. Suma actual: ${sumaActual.toFixed(2)}%`
    );
  }
}

/**
 * Lista todos los detalles de cuota de pesca.
 * Puede filtrar por empresaId si se proporciona.
 * @param {Object} filtros - Filtros opcionales { empresaId }
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    
    if (filtros.empresaId) {
      where.empresaId = Number(filtros.empresaId);
    }

    return await prisma.detCuotaPesca.findMany({
      where,
      include: {
        empresa: true,
        personaActualiza: true
      },
      orderBy: [
        { empresaId: 'asc' },
        { cuotaPropia: 'desc' },
        { id: 'desc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un detalle de cuota por ID (incluyendo empresa y persona que actualiza).
 */
const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detCuotaPesca.findUnique({
      where: { id },
      include: {
        empresa: true,
        personaActualiza: true
      }
    });
    if (!detalle) throw new NotFoundError('Detalle de cuota de pesca no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un detalle de cuota validando empresaId, idPersonaActualiza y porcentajes.
 */
const crear = async (data) => {
  try {
    await validarDetCuotaPesca(data);
    await validarSumaPorcentajes(data.empresaId, data.porcentajeCuota);

    const payload = {
      empresaId: data.empresaId,
      nombre: data.nombre,
      porcentajeCuota: data.porcentajeCuota,
      activo: data.activo !== undefined ? data.activo : true,
      cuotaPropia: data.cuotaPropia !== undefined ? data.cuotaPropia : false,
      idPersonaActualiza: data.idPersonaActualiza,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };

    return await prisma.detCuotaPesca.create({
      data: payload,
      include: {
        empresa: true,
        personaActualiza: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle de cuota existente, validando existencia y porcentajes.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detCuotaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de cuota de pesca no encontrado');

    await validarDetCuotaPesca(data);

    // Validar suma de porcentajes solo si se está cambiando el porcentaje
    if (data.porcentajeCuota !== undefined && data.porcentajeCuota !== null) {
      await validarSumaPorcentajes(existente.empresaId, data.porcentajeCuota, id);
    }

    const payload = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.detCuotaPesca.update({
      where: { id },
      data: payload,
      include: {
        empresa: true,
        personaActualiza: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle de cuota por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detCuotaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de cuota de pesca no encontrado');

    await prisma.detCuotaPesca.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene el resumen de cuotas por empresa.
 * Calcula totales de cuota propia y alquilada.
 * @param {BigInt} empresaId - ID de la empresa
 */
const obtenerResumenPorEmpresa = async (empresaId) => {
  try {
    const detalles = await prisma.detCuotaPesca.findMany({
      where: { empresaId, activo: true }
    });

    const totalPropia = detalles
      .filter(d => d.cuotaPropia)
      .reduce((sum, d) => sum + Number(d.porcentajeCuota), 0);

    const totalAlquilada = detalles
      .filter(d => !d.cuotaPropia)
      .reduce((sum, d) => sum + Number(d.porcentajeCuota), 0);

    const totalGeneral = totalPropia + totalAlquilada;

    return {
      empresaId,
      totalPropia,
      totalAlquilada,
      totalGeneral,
      disponible: 100 - totalGeneral,
      detalles
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerResumenPorEmpresa
};
