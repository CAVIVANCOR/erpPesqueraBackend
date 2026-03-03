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

  // Validar precio por tonelada en dólares
  if (data.precioPorTonDolares !== undefined && data.precioPorTonDolares !== null) {
    const precio = Number(data.precioPorTonDolares);
    if (precio < 0) {
      throw new ValidationError('El precio por tonelada no puede ser negativo');
    }
  }

    // Validar zona
  if (data.zona !== undefined && data.zona !== null) {
    const zonasValidas = ['NORTE', 'SUR'];
    if (!zonasValidas.includes(data.zona)) {
      throw new ValidationError('La zona debe ser NORTE o SUR');
    }
  }

  // Validar esAlquiler (debe ser boolean)
  if (data.esAlquiler !== undefined && data.esAlquiler !== null) {
    if (typeof data.esAlquiler !== 'boolean') {
      throw new ValidationError('El campo esAlquiler debe ser verdadero o falso');
    }
  }

  // Validar entidadEmpresarial
  if (data.entidadEmpresarialId !== undefined && data.entidadEmpresarialId !== null) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: BigInt(data.entidadEmpresarialId) } });
    if (!entidad) throw new ValidationError('Entidad empresarial no existente para el campo entidadEmpresarialId.');
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
 * Puede filtrar por empresaId, zona y esAlquiler si se proporcionan.
 * @param {Object} filtros - Filtros opcionales { empresaId, zona, esAlquiler }
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    
    if (filtros.empresaId) {
      where.empresaId = Number(filtros.empresaId);
    }

    // Filtrar por zona si se proporciona
    if (filtros.zona) {
      where.zona = filtros.zona;
    }

    // Filtrar por esAlquiler si se proporciona
    if (filtros.esAlquiler !== undefined && filtros.esAlquiler !== null) {
      where.esAlquiler = filtros.esAlquiler === true || filtros.esAlquiler === 'true';
    }

    return await prisma.detCuotaPesca.findMany({
      where,
      include: {
        empresa: true,
        personaActualiza: true,
        entidadEmpresarial: true
      },
      orderBy: [
        { empresaId: 'asc' },
        { zona: 'asc' },
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
        personaActualiza: true,
        entidadEmpresarial: true
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
 * Crea un nuevo detalle de cuota de pesca.
 * Valida relaciones y suma de porcentajes.
 * @param {Object} data - Datos del nuevo detalle
 * @returns {Object} Detalle de cuota creado con relaciones
 */
const crear = async (data) => {
  try {
    await validarDetCuotaPesca(data);
    await validarSumaPorcentajes(data.empresaId, data.porcentajeCuota);

    const nuevoDetalle = await prisma.detCuotaPesca.create({
      data: {
        empresaId: data.empresaId,
        nombre: data.nombre.trim().toUpperCase(),
        porcentajeCuota: data.porcentajeCuota,
        precioPorTonDolares: data.precioPorTonDolares || 0,
        cuotaPropia: data.cuotaPropia ?? false,
        activo: data.activo ?? true,
        idPersonaActualiza: data.idPersonaActualiza,
        zona: data.zona || 'NORTE',
        esAlquiler: data.esAlquiler ?? false,
        entidadEmpresarialId: data.entidadEmpresarialId || null,
      },
      include: {
        empresa: true,
        personaActualiza: true,
        entidadEmpresarial: true
      }
    });
    return nuevoDetalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle de cuota de pesca existente.
 * Valida relaciones y suma de porcentajes.
 * @param {BigInt} id - ID del detalle a actualizar
 * @param {Object} data - Datos actualizados
 * @returns {Object} Detalle actualizado con relaciones
 */
const actualizar = async (id, data) => {
  try {
    const detalleExistente = await prisma.detCuotaPesca.findUnique({ where: { id } });
    if (!detalleExistente) throw new NotFoundError('Detalle de cuota de pesca no encontrado');

    await validarDetCuotaPesca(data);

    if (data.porcentajeCuota !== undefined) {
      await validarSumaPorcentajes(data.empresaId || detalleExistente.empresaId, data.porcentajeCuota, id);
    }

    const detalleActualizado = await prisma.detCuotaPesca.update({
      where: { id },
      data: {
        empresaId: data.empresaId,
        nombre: data.nombre ? data.nombre.trim().toUpperCase() : undefined,
        porcentajeCuota: data.porcentajeCuota,
        precioPorTonDolares: data.precioPorTonDolares !== undefined ? data.precioPorTonDolares : undefined,
        cuotaPropia: data.cuotaPropia !== undefined ? data.cuotaPropia : undefined,
        activo: data.activo !== undefined ? data.activo : undefined,
        idPersonaActualiza: data.idPersonaActualiza,
        zona: data.zona !== undefined ? data.zona : undefined,
        esAlquiler: data.esAlquiler !== undefined ? data.esAlquiler : undefined,
        entidadEmpresarialId: data.entidadEmpresarialId !== undefined ? (data.entidadEmpresarialId || null) : undefined,
        fechaActualizacion: new Date(),
      },
      include: {
        empresa: true,
        personaActualiza: true,
        entidadEmpresarial: true
      }
    });
    return detalleActualizado;
  } catch (err) {
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
