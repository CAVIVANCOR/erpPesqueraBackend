// Importa la instancia de Prisma Client para acceder a la base de datos
import prisma from "../../config/prismaClient.js";
// Importa los errores personalizados para manejo consistente de errores
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

// Define las relaciones que se incluirán al consultar configuraciones
const incluirRelaciones = {
  empresa: true,
  tipoMovimiento: true,
  medioPago: true,
  personalCreador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    }
  },
  personalActualizador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    }
  },
};

/**
 * Valida que existan las referencias foráneas requeridas antes de crear o actualizar.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} param0 - Objeto con los IDs a validar
 */
async function validarReferencias({
  empresaId,
  tipoMovimientoId,
  medioPagoId,
}) {
  // Valida existencia de la empresa
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
  });
  if (!empresa) throw new ValidationError("Empresa no existente");

  // Valida existencia del tipo de movimiento
  const tipoMov = await prisma.tipoMovEntregaRendir.findUnique({
    where: { id: tipoMovimientoId },
  });
  if (!tipoMov) throw new ValidationError("Tipo de movimiento no existente");

  // Valida existencia del medio de pago si se proporciona
  if (medioPagoId) {
    const medioPago = await prisma.medioPago.findUnique({
      where: { id: medioPagoId },
    });
    if (!medioPago)
      throw new ValidationError("Medio de pago no existente");
  }
}

/**
 * Valida que no exista una configuración duplicada.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado(
  { empresaId, tipoMovimientoId, medioPagoId },
  excluirId = null
) {
  const where = {
    empresaId,
    tipoMovimientoId,
    medioPagoId: medioPagoId || null,
  };

  try {
    if (excluirId) {
      const existe = await prisma.configuracionCuentaContable.findFirst({
        where: { ...where, id: { not: excluirId } },
      });
      if (existe) {
        throw new ConflictError(
          "Ya existe una configuración con esa combinación de empresa, tipo de movimiento y medio de pago"
        );
      }
    } else {
      const existe = await prisma.configuracionCuentaContable.findFirst({
        where,
      });
      if (existe) {
        throw new ConflictError(
          "Ya existe una configuración con esa combinación de empresa, tipo de movimiento y medio de pago"
        );
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene todas las configuraciones de cuentas contables.
 * @returns {Promise<Array>} - Lista de configuraciones
 */
const listar = async () => {
  try {
    return await prisma.configuracionCuentaContable.findMany({
      include: incluirRelaciones,
      orderBy: {
        empresaId: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene una configuración por su ID.
 * @param {BigInt|number} id - ID de la configuración
 * @returns {Promise<Object>} - Configuración encontrada
 */
const obtenerPorId = async (id) => {
  try {
    const config = await prisma.configuracionCuentaContable.findUnique({
      where: { id },
      include: incluirRelaciones,
    });
    if (!config) throw new NotFoundError("Configuración no encontrada");
    return config;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene la configuración para una combinación específica.
 * @param {BigInt|number} empresaId - ID de la empresa
 * @param {BigInt|number} tipoMovimientoId - ID del tipo de movimiento
 * @param {BigInt|number|null} medioPagoId - ID del medio de pago (opcional)
 * @returns {Promise<Object|null>} - Configuración encontrada o null
 */
const obtenerConfiguracion = async (empresaId, tipoMovimientoId, medioPagoId = null) => {
  try {
    const config = await prisma.configuracionCuentaContable.findFirst({
      where: {
        empresaId,
        tipoMovimientoId,
        medioPagoId: medioPagoId || null,
        activo: true,
      },
      include: incluirRelaciones,
    });
    return config;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea una nueva configuración de cuenta contable.
 * @param {Object} data - Datos de la configuración
 * @returns {Promise<Object>} - Configuración creada
 */
const crear = async (data) => {
  try {
    // Validar que los campos requeridos no sean null
    if (
      !data.empresaId ||
      !data.tipoMovimientoId ||
      !data.cuentaContableDebe ||
      !data.cuentaContableHaber
    ) {
      throw new ValidationError(
        "Empresa, Tipo de Movimiento, Cuenta Debe y Cuenta Haber son obligatorios"
      );
    }

    // Validar formato de cuentas contables (máximo 20 caracteres)
    if (data.cuentaContableDebe.length > 20) {
      throw new ValidationError("La cuenta contable Debe no puede exceder 20 caracteres");
    }
    if (data.cuentaContableHaber.length > 20) {
      throw new ValidationError("La cuenta contable Haber no puede exceder 20 caracteres");
    }

    await validarReferencias(data);
    await validarDuplicado(data);

    // Preparar datos con auditoría automática
    const datosConAuditoria = {
      ...data,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const resultado = await prisma.configuracionCuentaContable.create({
      data: datosConAuditoria,
    });
    return resultado;
  } catch (err) {
    // Manejar error de restricción única específicamente
    if (err.code === "P2002") {
      throw new ConflictError(
        "Ya existe una configuración con esa combinación"
      );
    }

    // Solo convertir otros errores de Prisma que NO sean de validación de negocio
    if (
      err.code &&
      err.code.startsWith("P") &&
      !err.message.includes("no existente") &&
      !err.message.includes("obligatorios")
    ) {
      throw new DatabaseError(
        `Error de base de datos: ${err.code} - ${err.message}`,
        err.message
      );
    }

    throw err;
  }
};

/**
 * Actualiza una configuración existente.
 * @param {BigInt|number} id - ID de la configuración a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Configuración actualizada
 */
const actualizar = async (id, data) => {
  try {
    // Primero valida existencia de la configuración
    const existente = await prisma.configuracionCuentaContable.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Configuración no encontrada");

    // Validar formato de cuentas contables si se proporcionan
    if (data.cuentaContableDebe && data.cuentaContableDebe.length > 20) {
      throw new ValidationError("La cuenta contable Debe no puede exceder 20 caracteres");
    }
    if (data.cuentaContableHaber && data.cuentaContableHaber.length > 20) {
      throw new ValidationError("La cuenta contable Haber no puede exceder 20 caracteres");
    }

    // Validar referencias y duplicados
    await validarReferencias({ ...existente, ...data });
    await validarDuplicado({ ...existente, ...data }, id);

    // Preparar datos con auditoría automática
    const datosConAuditoria = {
      ...data,
      actualizadoEn: new Date(),
    };

    // Realiza la actualización
    const actualizada = await prisma.configuracionCuentaContable.update({
      where: { id },
      data: datosConAuditoria,
    });
    return actualizada;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Configuración no encontrada");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Elimina una configuración.
 * @param {BigInt|number} id - ID de la configuración a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const eliminar = async (id) => {
  try {
    await prisma.configuracionCuentaContable.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Configuración no encontrada");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerConfiguracion,
  crear,
  actualizar,
  eliminar,
};