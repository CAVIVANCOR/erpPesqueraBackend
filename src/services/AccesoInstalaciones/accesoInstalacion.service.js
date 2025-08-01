import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AccesoInstalacion
 * Aplica validaciones de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales (sedeId y tipoAccesoId).
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {BigInt} sedeId
 * @param {BigInt} tipoAccesoId
 */
async function validarForaneas(sedeId, tipoAccesoId) {
  const sede = await prisma.sedesEmpresa.findUnique({ where: { id: sedeId } });
  if (!sede) throw new ValidationError('La sede referenciada no existe.');
  const tipoAcceso = await prisma.tipoAccesoInstalacion.findUnique({ where: { id: tipoAccesoId } });
  if (!tipoAcceso) throw new ValidationError('El tipo de acceso referenciado no existe.');
}

/**
 * Lista todos los accesos a instalaciones con todas las relaciones necesarias.
 */
const listar = async () => {
  try {
    return await prisma.accesoInstalacion.findMany({
      include: {
        tipoAcceso: true,        // Relación con TipoAccesoInstalacion
        tipoPersona: true,       // Relación con TipoPersona
        motivoAcceso: true,      // Relación con MotivoAcceso
        tipoEquipo: true,        // Relación con TipoEquipo
        detalles: true           // Relación con AccesoInstalacionDetalle
      },
      orderBy: {
        fechaHora: 'desc'        // Ordenar por fecha más reciente primero
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un acceso a instalación por ID con todas las relaciones necesarias.
 */
const obtenerPorId = async (id) => {
  try {
    const acceso = await prisma.accesoInstalacion.findUnique({ 
      where: { id }, 
      include: {
        tipoAcceso: true,        // Relación con TipoAccesoInstalacion
        tipoPersona: true,       // Relación con TipoPersona
        motivoAcceso: true,      // Relación con MotivoAcceso
        tipoEquipo: true,        // Relación con TipoEquipo
        detalles: true           // Relación con AccesoInstalacionDetalle
      }
    });
    if (!acceso) throw new NotFoundError('AccesoInstalacion no encontrado');
    return acceso;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un acceso a instalación validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.sedeId || !data.tipoAccesoId || !data.fechaHora) {
      throw new ValidationError('Los campos sedeId, tipoAccesoId y fechaHora son obligatorios.');
    }
    await validarForaneas(data.sedeId, data.tipoAccesoId);
    return await prisma.accesoInstalacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un acceso a instalación existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.accesoInstalacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('AccesoInstalacion no encontrado');
    if (data.sedeId !== undefined && data.sedeId !== null) {
      await validarForaneas(data.sedeId, data.tipoAccesoId ?? existente.tipoAccesoId);
    } else if (data.tipoAccesoId !== undefined && data.tipoAccesoId !== null) {
      await validarForaneas(existente.sedeId, data.tipoAccesoId);
    }
    return await prisma.accesoInstalacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Busca una persona por número de documento en registros de AccesoInstalacion.
 * Retorna los datos de la persona más reciente encontrada para autocompletado.
 * @param {string} numeroDocumento - Número de documento a buscar
 * @returns {Object|null} - Datos de la persona encontrada o null si no existe
 */
const buscarPersonaPorDocumento = async (numeroDocumento) => {
  try {
    if (!numeroDocumento || numeroDocumento.trim() === '') {
      throw new ValidationError('El número de documento es obligatorio.');
    }

    // Buscar el registro más reciente de la persona por número de documento
    const persona = await prisma.accesoInstalacion.findFirst({
      where: { numeroDocumento },
      orderBy: { fechaHora: 'desc' }, // Obtener el último registro por fecha
      select: {
        id: true,
        tipoPersonaId: true,        // Campo requerido para autocompletado
        nombrePersona: true,        // Campo requerido para autocompletado
        tipoDocIdentidadId: true,   // Campo requerido para autocompletado
        numeroDocumento: true,      // Campo requerido para autocompletado
        fechaHora: true
      }
    });

    if (!persona) {
      return null; // No se encontró la persona
    }

    return {
      encontrada: true,
      persona: {
        tipoPersonaId: persona.tipoPersonaId,
        nombrePersona: persona.nombrePersona,
        tipoDocIdentidadId: persona.tipoDocIdentidadId,
        numeroDocumento: persona.numeroDocumento,
        ultimoAcceso: persona.fechaHora
      }
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos al buscar persona', err.message);
    throw err;
  }
};

/**
 * Busca datos de vehículo por número de placa en registros de AccesoInstalacion.
 * Retorna los datos del vehículo más reciente encontrado que tenga todos los campos completos.
 * @param {string} numeroPlaca - Número de placa a buscar
 * @returns {Object|null} - Datos del vehículo encontrado o null si no existe
 */
const buscarVehiculoPorPlaca = async (numeroPlaca) => {
  try {
    if (!numeroPlaca || numeroPlaca.trim() === '') {
      throw new ValidationError('El número de placa es obligatorio.');
    }

    // Buscar el registro más reciente del vehículo por número de placa
    // Solo considerar registros que tengan todos los campos de vehículo completos
    const vehiculo = await prisma.accesoInstalacion.findFirst({
      where: {
        vehiculoNroPlaca: numeroPlaca.trim().toUpperCase(),
        // Asegurar que todos los campos de vehículo estén llenos para datos fiables
        vehiculoMarca: { not: null },
        vehiculoModelo: { not: null },
        vehiculoColor: { not: null },
        // Además, verificar que no sean strings vacíos
        AND: [
          { vehiculoMarca: { not: '' } },
          { vehiculoModelo: { not: '' } },
          { vehiculoColor: { not: '' } }
        ]
      },
      orderBy: { fechaHora: 'desc' }, // Obtener el último registro por fecha
      select: {
        id: true,
        vehiculoNroPlaca: true,
        vehiculoMarca: true,
        vehiculoModelo: true,
        vehiculoColor: true,
        fechaHora: true,
        nombrePersona: true // Para referencia
      }
    });

    if (!vehiculo) {
      return null; // No se encontró el vehículo con datos completos
    }

    return {
      encontrado: true,
      vehiculo: {
        vehiculoNroPlaca: vehiculo.vehiculoNroPlaca,
        vehiculoMarca: vehiculo.vehiculoMarca,
        vehiculoModelo: vehiculo.vehiculoModelo,
        vehiculoColor: vehiculo.vehiculoColor,
        ultimoAcceso: vehiculo.fechaHora,
        ultimoUsuario: vehiculo.nombrePersona
      }
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos al buscar vehículo', err.message);
    throw err;
  }
};

/**
 * Elimina un acceso a instalación por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.accesoInstalacion.findUnique({ where: { id }, include: { detalles: true } });
    if (!existente) throw new NotFoundError('AccesoInstalacion no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.accesoInstalacion.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
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
  buscarPersonaPorDocumento,
  buscarVehiculoPorPlaca
};
