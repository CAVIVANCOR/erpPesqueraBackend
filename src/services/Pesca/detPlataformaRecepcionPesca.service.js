import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para DetPlataformaRecepcionPesca
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialId y puertoPescaId.
 * Lanza ValidationError según corresponda.
 * @param {Object} data - Datos de la plataforma
 */
async function validarPlataformaRecepcion(data) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({
      where: { id: data.entidadComercialId },
    });
    if (!existe) throw new ValidationError("Entidad comercial no existente.");
  }
  // Validar existencia de PuertoPesca
  if (data.puertoPescaId) {
    const existePuerto = await prisma.puertoPesca.findUnique({
      where: { id: data.puertoPescaId },
    });
    if (!existePuerto) throw new ValidationError("Puerto de pesca no existente.");
  }
}

/**
 * Lista todas las plataformas de recepción.
 */
const listar = async () => {
  try {
    return await prisma.detPlataformaRecepcionPesca.findMany({
      include: {
        entidadComercial: true,
        puertoPesca: true,
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene una plataforma por ID (incluyendo entidad comercial y puerto asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const plataforma = await prisma.detPlataformaRecepcionPesca.findUnique({
      where: { id },
      include: {
        entidadComercial: true,
        puertoPesca: true,
      },
    });
    if (!plataforma) throw new NotFoundError("Plataforma no encontrada");
    return plataforma;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene todas las plataformas de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialId) => {
  try {
    const resultado = await prisma.detPlataformaRecepcionPesca.findMany({
      where: { entidadComercialId },
      include: {
        entidadComercial: true,
        puertoPesca: true,
      },
      orderBy: { id: "desc" },
    });

    return resultado;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene todas las plataformas de un puerto específico.
 */
const obtenerPorPuerto = async (puertoPescaId) => {
  try {
    const resultado = await prisma.detPlataformaRecepcionPesca.findMany({
      where: { puertoPescaId },
      include: {
        entidadComercial: true,
        puertoPesca: true,
      },
      orderBy: { id: "desc" },
    });

    return resultado;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea una plataforma validando referencias.
 */
const crear = async (data) => {
  try {
    await validarPlataformaRecepcion(data);

    return await prisma.detPlataformaRecepcionPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza una plataforma existente, validando existencia y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detPlataformaRecepcionPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Plataforma no encontrada");
    await validarPlataformaRecepcion(data);

    return await prisma.detPlataformaRecepcionPesca.update({
      where: { id },
      data,
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Elimina una plataforma por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detPlataformaRecepcionPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Plataforma no encontrada");
    await prisma.detPlataformaRecepcionPesca.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorEntidad,
  obtenerPorPuerto,
  crear,
  actualizar,
  eliminar,
};