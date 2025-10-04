// Importa la instancia de Prisma Client para acceder a la base de datos
import prisma from "../../config/prismaClient.js";
// Importa los errores personalizados para manejo consistente de errores
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

// Define las relaciones que se incluirán al consultar cuentas corrientes
const incluirRelaciones = {
  banco: true,
  tipoCuentaCorriente: true,
  moneda: true, // Agregar esta línea
  movimientosOrigen: true,
  movimientosDestino: true,
};

/**
 * Valida que existan las referencias foráneas requeridas antes de crear o actualizar una cuenta corriente.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} param0 - Objeto con los IDs a validar
 */
async function validarReferencias({
  bancoId,
  tipoCuentaCorrienteId,
  monedaId,
}) {
  // Valida existencia del banco
  const banco = await prisma.banco.findUnique({ where: { id: bancoId } });
  if (!banco) throw new ValidationError("Banco no existente");

  // Valida existencia del tipo de cuenta corriente
  if (tipoCuentaCorrienteId) {
    const tipo = await prisma.tipoCuentaCorriente.findUnique({
      where: { id: tipoCuentaCorrienteId },
    });
    if (!tipo)
      throw new ValidationError("Tipo de cuenta corriente no existente");
  }
  // Valida existencia de la moneda
  if (monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: monedaId } });
    if (!moneda) throw new ValidationError("Moneda no existente");
  }
}

/**
 * Valida que no exista una cuenta corriente duplicada con el mismo número, banco y empresa.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado(
  { numeroCuenta, bancoId, empresaId },
  excluirId = null
) {
  const where = {
    numeroCuenta,
    bancoId,
    empresaId,
  };
  try {
    if (excluirId) {
      const existe = await prisma.cuentaCorriente.findFirst({
        where: { ...where, id: { not: excluirId } },
      });
      if (existe) {
        throw new ConflictError(
          "Ya existe una cuenta corriente con ese número, banco y empresa"
        );
      }
    } else {
      const existe = await prisma.cuentaCorriente.findFirst({ where });
      if (existe) {
        throw new ConflictError(
          "Ya existe una cuenta corriente con ese número, banco y empresa"
        );
      }
    }
  } catch (error) {
    console.error("Error en consulta de duplicados:", error);
    throw error;
  }
}

/**
 * Obtiene todas las cuentas corrientes, incluyendo relaciones principales.
 * @returns {Promise<Array>} - Lista de cuentas corrientes
 */
const listar = async () => {
  try {
    return await prisma.cuentaCorriente.findMany({
      include: incluirRelaciones,
    });
  } catch (err) {
    // Maneja errores de base de datos
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const cuenta = await prisma.cuentaCorriente.findUnique({
      where: { id },
      include: incluirRelaciones,
    });
    if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada");
    return cuenta;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar que los campos requeridos no sean null
    if (
      !data.empresaId ||
      !data.bancoId ||
      !data.numeroCuenta ||
      !data.monedaId
    ) {
      throw new ValidationError(
        "Empresa, Banco, Número de Cuenta y Moneda son obligatorios"
      );
    }

    await validarReferencias(data);
    await validarDuplicado(data);
    const resultado = await prisma.cuentaCorriente.create({ data });
    return resultado;
  } catch (err) {
    // Manejar error de restricción única específicamente
    if (err.code === "P2002") {
      if (err.meta?.target?.includes("unique_cuenta_banco_empresa")) {
        throw new ConflictError(
          "Ya existe una cuenta corriente con ese número, banco y empresa"
        );
      } else {
        throw new ConflictError(
          "Ya existe una cuenta corriente con esos datos"
        );
      }
    }

    // Solo convertir otros errores de Prisma que NO sean de validación de negocio
    if (
      err.code &&
      err.code.startsWith("P") &&
      !err.message.includes("Ya existe")
    ) {
      console.error("Convirtiendo a DatabaseError");
      throw new DatabaseError(
        `Error de base de datos: ${err.code} - ${err.message}`,
        err.message
      );
    }

    console.error("Re-lanzando error original");
    throw err;
  }
};

/**
 * Actualiza una cuenta corriente existente, validando primero la existencia del ID.
 * Luego valida referencias y duplicados antes de actualizar.
 * @param {BigInt|number} id - ID de la cuenta corriente a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Cuenta corriente actualizada
 */
const actualizar = async (id, data) => {
  try {
    // Primero valida existencia de la cuenta corriente
    const existente = await prisma.cuentaCorriente.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("ID de Cuenta Corriente No existe");

    // Luego valida referencias y duplicados
    await validarReferencias(data);
    await validarDuplicado(data, id);

    // Realiza la actualización
    const actualizada = await prisma.cuentaCorriente.update({
      where: { id },
      data,
    });
    return actualizada;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Cuenta corriente no encontrada");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    await prisma.cuentaCorriente.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Cuenta corriente no encontrada");
    // P2003: Foreign key violation (referenciada en MovimientoCaja u otra)
    if (err.code === "P2003")
      throw new ConflictError(
        "No se puede eliminar la cuenta corriente porque está asociada a movimientos de caja u otros registros."
      );
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
