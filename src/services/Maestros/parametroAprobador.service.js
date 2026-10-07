import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ParametroAprobador
 * Aplica validaciones de campos obligatorios y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todos los parámetros aprobadores.
 */
const listar = async () => {
  try {
    return await prisma.parametroAprobador.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista parámetros aprobadores filtrados por empresaId y moduloSistemaId.
 * Solo retorna los que no están cesados.
 */
const listarPorModulo = async (empresaId, moduloSistemaId) => {
  try {
    const parametros = await prisma.parametroAprobador.findMany({
      where: {
        empresaId: BigInt(empresaId),
        moduloSistemaId: BigInt(moduloSistemaId),
        cesado: false
      }
    });
    
    // Obtener los IDs de personal únicos
    const personalIds = [...new Set(parametros.map(p => p.personalRespId))];
    
    // Buscar los datos de personal
    const personales = await prisma.personal.findMany({
      where: {
        id: { in: personalIds }
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true
      }
    });
    
    // Mapear para agregar los datos de personal
    const resultado = parametros.map(param => ({
      ...param,
      personal: personales.find(p => p.id === param.personalRespId)
    }));
    
    return resultado;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene el aprobador vigente de una empresa para un módulo del sistema, con los datos del
 * personal que necesita una firma (nombres, apellidos, tipo y número de documento).
 * Vigente = no cesado, vigenteDesde ya iniciada y vigenteHasta vacía o no vencida (inclusive el día
 * final). Si hubiera varios, toma el de vigenteDesde más reciente. Devuelve null si no hay ninguno.
 */
const obtenerVigente = async (empresaId, moduloSistemaId) => {
  try {
    const ahora = new Date();
    const inicioHoy = new Date(ahora);
    inicioHoy.setHours(0, 0, 0, 0);

    const parametro = await prisma.parametroAprobador.findFirst({
      where: {
        empresaId: BigInt(empresaId),
        moduloSistemaId: BigInt(moduloSistemaId),
        cesado: false,
        vigenteDesde: { lte: ahora },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: inicioHoy } }]
      },
      orderBy: { vigenteDesde: 'desc' }
    });
    if (!parametro) return null;

    const personal = await prisma.personal.findUnique({
      where: { id: parametro.personalRespId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        numeroDocumento: true,
        tipoDocIdentidad: { select: { codigo: true, nombre: true } }
      }
    });

    return { ...parametro, personal };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un parámetro aprobador por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const parametro = await prisma.parametroAprobador.findUnique({ where: { id } });
    if (!parametro) throw new NotFoundError('ParametroAprobador no encontrado');
    return parametro;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un parámetro aprobador validando campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.personalRespId || !data.moduloSistemaId || !data.empresaId || !data.vigenteDesde) {
      throw new ValidationError('Los campos personalRespId, moduloSistemaId, empresaId y vigenteDesde son obligatorios.');
    }
    return await prisma.parametroAprobador.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un parámetro aprobador existente, validando existencia y campos obligatorios si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.parametroAprobador.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ParametroAprobador no encontrado');
    if (data.personalRespId !== undefined && (!data.personalRespId)) {
      throw new ValidationError('El campo personalRespId es obligatorio.');
    }
    if (data.moduloSistemaId !== undefined && (!data.moduloSistemaId)) {
      throw new ValidationError('El campo moduloSistemaId es obligatorio.');
    }
    if (data.empresaId !== undefined && (!data.empresaId)) {
      throw new ValidationError('El campo empresaId es obligatorio.');
    }
    if (data.vigenteDesde !== undefined && (!data.vigenteDesde)) {
      throw new ValidationError('El campo vigenteDesde es obligatorio.');
    }
    return await prisma.parametroAprobador.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un parámetro aprobador por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.parametroAprobador.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ParametroAprobador no encontrado');
    await prisma.parametroAprobador.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  listarPorModulo,
  obtenerVigente,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
