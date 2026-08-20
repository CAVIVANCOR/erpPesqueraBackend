import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para Personal
 * Aplica validaciones de unicidad, referencias foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de numeroDocumento por empresa y existencia de referencias foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del personal
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarPersonal(data, excluirId = null) {
  // Validar unicidad de numeroDocumento por empresa
  if (data.numeroDocumento && data.empresaId) {
    const where = excluirId
      ? {
        numeroDocumento: data.numeroDocumento,
        empresaId: data.empresaId,
        id: { not: excluirId },
      }
      : {
        numeroDocumento: data.numeroDocumento,
        empresaId: data.empresaId,
      };
    const existe = await prisma.personal.findFirst({ where });
    if (existe)
      throw new ConflictError(
        "Ya existe un personal con ese número de documento en la empresa.",
      );
  }

  // Validar existencia de Empresa
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa) throw new ValidationError("Empresa no existente.");
  }

  // Validar existencia de referencias opcionales si se proveen
  // Solo se validan referencias que existen en el modelo Prisma actual
  const referencias = [
    { campo: "tipoDocumentoId", modelo: "tiposDocIdentidad" },
    { campo: "tipoContratoId", modelo: "tipoContrato" },
    { campo: "cargoId", modelo: "cargosPersonal" },
    { campo: "centroCostoId", modelo: "centroCosto" },  // ⭐ NUEVO
    { campo: "ubigeoId", modelo: "ubigeo" },
    { campo: "areaFisicaId", modelo: "areaFisicaSede" },
    { campo: "sedeEmpresaId", modelo: "sedesEmpresa" },
    { campo: "enlaceEntidadComercialId", modelo: "entidadComercial" },
  ];
  for (const ref of referencias) {
    if (data[ref.campo] !== undefined && data[ref.campo] !== null) {
      const existe = await prisma[ref.modelo]?.findUnique?.({
        where: { id: data[ref.campo] },
      });
      if (!existe)
        throw new ValidationError(`Referencia no existente para ${ref.campo}`);
    }
  }
}

/**
 * Lista todo el personal, incluyendo relaciones principales.
 * @param {Object} filtros - Filtros opcionales para la consulta
 * @param {number} filtros.empresaId - ID de la empresa para filtrar
 * @param {boolean} filtros.esVendedor - Si es vendedor o no
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};

    if (filtros.empresaId) {
      where.empresaId = filtros.empresaId;
    }

    if (filtros.esVendedor !== undefined) {
      where.esVendedor = filtros.esVendedor;
    }

    const personal = await prisma.personal.findMany({
      where,
      include: {
        usuario: true,
        cargo: true,
        centroCosto: {
          include: {
            categoria: true
          }
        },
        ubigeo: true,
        enlaceEntidadComercial: true,
      },
    });

    // Obtener empresas únicas
    const empresaIds = [...new Set(personal.map((p) => p.empresaId))];  // ← AGREGAR ESTA LÍNEA AQUÍ
    const empresas = await prisma.empresa.findMany({
      where: {
        id: { in: empresaIds },  // ✅ Ahora empresaIds existe
      },
      select: {
        id: true,
        razonSocial: true,
        entidadComercialId: true,
      },
    });

    // Crear un mapa de empresas para acceso rápido
    const empresaMap = new Map(empresas.map((e) => [e.id.toString(), e]));

    // Agregar empresa a cada personal
    const personalConEmpresa = personal.map((p) => ({
      ...p,
      empresa: empresaMap.get(p.empresaId.toString()) || null,
    }));

    return personalConEmpresa;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene un personal por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const persona = await prisma.personal.findUnique({
      where: { id },
      include: {
        usuario: true,
        cargo: true,
        centroCosto: true,  // ⭐ NUEVO
        ubigeo: true,
        tipoDocIdentidad: true,
        enlaceEntidadComercial: true,
      },
    });
    if (!persona) throw new NotFoundError("Personal no encontrado");
    return persona;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea un registro de personal validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarPersonal(data);
    const resultado = await prisma.personal.create({ data });
    return resultado;
  } catch (err) {
    console.error("❌ Backend - Error al crear personal:", err);
    if (err instanceof ConflictError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza un registro de personal existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.personal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Personal no encontrado");
    await validarPersonal(data, id);
    const resultado = await prisma.personal.update({ where: { id }, data });
    return resultado;
  } catch (err) {
    console.error("❌ Backend - Error al actualizar personal:", err);
    if (
      err instanceof ConflictError ||
      err instanceof NotFoundError ||
      err instanceof ValidationError
    )
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Elimina un registro de personal por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.personal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Personal no encontrado");
    await prisma.personal.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Lista personal con cargo "BAHIA COMERCIAL" filtrado por empresa.
 * @param {number} empresaId - ID de la empresa para filtrar
 */
const listarPersonalxDescripCargo = async (empresaId, descripcionCargo) => {
  try {
    const where = {
      empresaId: empresaId,
      cargo: {
        descripcion: descripcionCargo,
      },
    };

    return await prisma.personal.findMany({
      where,
      include: {
        cargo: true,
        ubigeo: true,
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Busca personal por número de documento (DNI).
 * Si encuentra múltiples registros (persona en varias empresas), retorna el que tiene marcaAsistencia = true.
 * @param {string} numeroDocumento - Número de documento a buscar
 * @returns {Object|null} - Datos del personal encontrado o null si no existe
 */
const buscarPorDNI = async (numeroDocumento) => {
  try {
    if (!numeroDocumento || numeroDocumento.trim() === "") {
      throw new ValidationError("El número de documento es obligatorio.");
    }

    // Buscar TODOS los registros con ese DNI (puede estar en múltiples empresas)
    const personales = await prisma.personal.findMany({
      where: {
        numeroDocumento: numeroDocumento.trim(),
        cesado: false, // Solo personal activo
      },
      include: {
        cargo: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },
        tipoDocIdentidad: {
          select: {
            id: true,
            descripcion: true,
          },
        },
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        empresaId: true,
        numeroDocumento: true,
        marcaAsistencia: true,
        esAdministrativo: true,
        cargoId: true,
        cargo: true,
        tipoDocIdentidad: true,
      },
    });

    // Si no encuentra ninguno
    if (personales.length === 0) {
      return null; // No es personal de la empresa
    }

    // Si encuentra UNO o MÁS, buscar el que tiene marcaAsistencia = true
    const personalConAsistencia = personales.find(
      (p) => p.marcaAsistencia === true,
    );

    // Si hay uno con marcaAsistencia = true, retornar ese
    if (personalConAsistencia) {
      return personalConAsistencia;
    }

    // Si NINGUNO tiene marcaAsistencia = true, retornar el primero
    // (caso raro, pero por seguridad)
    return personales[0];
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError(
        "Error de base de datos al buscar personal por DNI",
        err.message,
      );
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPersonalxDescripCargo,
  buscarPorDNI, // ⭐ NUEVO - Búsqueda por DNI
};
