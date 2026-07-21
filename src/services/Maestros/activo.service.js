import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para Activo
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de empresaId y tipoId.
 * Lanza ValidationError si no existen.
 * @param {Object} data - Datos del activo
 */
async function validarActivo(data) {
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const existeEmpresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!existeEmpresa)
      throw new ValidationError(
        "Empresa no existente para el campo empresaId.",
      );
  }
  if (data.tipoId !== undefined && data.tipoId !== null) {
    const existeTipo = await prisma.tipoActivo.findUnique({
      where: { id: data.tipoId },
    });
    if (!existeTipo)
      throw new ValidationError(
        "Tipo de activo no existente para el campo tipoId.",
      );
  }
  // Validar monedaId (opcional - para saldos iniciales)
  if (data.monedaId !== undefined && data.monedaId !== null) {
    const existeMoneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!existeMoneda)
      throw new ValidationError("Moneda no existente para el campo monedaId.");
  }
  // Validar cuentaContableId (opcional - para cuenta clase 33)
  if (data.cuentaContableId !== undefined && data.cuentaContableId !== null) {
    const existeCuenta = await prisma.planCuentasContable.findUnique({
      where: { id: data.cuentaContableId },
    });
    if (!existeCuenta)
      throw new ValidationError("Cuenta contable no existente para el campo cuentaContableId.");
  }

  // Validar productoId (opcional)
  if (data.productoId !== undefined && data.productoId !== null) {
    const existeProducto = await prisma.producto.findUnique({
      where: { id: data.productoId },
    });
    if (!existeProducto)
      throw new ValidationError("Producto no existente para el campo productoId.");
  }

  // Validar cuentaDepreciacionId (opcional - para cuenta clase 39)
  if (data.cuentaDepreciacionId !== undefined && data.cuentaDepreciacionId !== null) {
    const existeCuentaDep = await prisma.planCuentasContable.findUnique({
      where: { id: data.cuentaDepreciacionId },
    });
    if (!existeCuentaDep)
      throw new ValidationError("Cuenta contable no existente para el campo cuentaDepreciacionId.");
  }

  // Validar cuentaGastoDepId (opcional - para cuenta clase 68)
  if (data.cuentaGastoDepId !== undefined && data.cuentaGastoDepId !== null) {
    const existeCuentaGasto = await prisma.planCuentasContable.findUnique({
      where: { id: data.cuentaGastoDepId },
    });
    if (!existeCuentaGasto)
      throw new ValidationError("Cuenta contable no existente para el campo cuentaGastoDepId.");
  }
}

/**
 * Lista todos los activos.
 */
const listar = async () => {
  try {
    return await prisma.activo.findMany({
      include: {
        tipo: true,
        moneda: true,
        permisos: true,
        cuentaContable: true,
        producto: true,
        cuentaDepreciacion: true,
        cuentaGastoDep: true,
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene un activo por ID (incluyendo tipo y permisos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const activo = await prisma.activo.findUnique({
      where: { id },
      include: {
        tipo: true,
        moneda: true,
        permisos: true,
        movimientosActivoFijo: true,
        cuentaContable: true,
        producto: true,
        cuentaDepreciacion: true,
        cuentaGastoDep: true,
      },
    });
    if (!activo) throw new NotFoundError("Activo no encontrado");
    return activo;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene activos de tipo VEHICULO filtrados por RUC de empresa
 * @param {string} rucEmpresa - RUC de la empresa para filtrar
 */
const obtenerVehiculosPorRuc = async (rucEmpresa) => {
  try {
    // Primero obtenemos la empresa por RUC
    const empresa = await prisma.empresa.findFirst({
      where: { ruc: rucEmpresa },
    });
    if (!empresa) {
      return [];
    }

    // Luego obtenemos los activos de tipo VEHICULO para esa empresa
    return await prisma.activo.findMany({
      where: {
        cesado: false,
        empresaId: empresa.id,
        tipo: {
          codigo: "VEHICULO",
        },
      },
      include: {
        tipo: true,
      },
      orderBy: {
        nombre: "asc",
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene activos filtrados por empresa y tipo para embarcaciones pesqueras industriales
 * @param {number} empresaId - ID de la empresa
 * @param {number} tipoId - ID del tipo de activo (1 = Embarcacion pesquera Industrial)
 */
const obtenerPorEmpresaYTipo = async (empresaId, tipoId) => {
  try {
    return await prisma.activo.findMany({
      where: {
        empresaId: empresaId,
        tipoId: tipoId,
        cesado: false,
      },
      include: {
        tipo: true,
        moneda: true,
        embarcacion: true,
        cuentaContable: true,
        producto: true,
        cuentaDepreciacion: true,
        cuentaGastoDep: true,
      },
      orderBy: {
        nombre: "asc",
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};
/**
 * Crea un activo validando empresaId y tipoId.
 */
const crear = async (data) => {
  try {
    await validarActivo(data);
    return await prisma.activo.create({
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza un activo existente, validando existencia y claves foráneas.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.activo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Activo no encontrado");
    await validarActivo(data);
    return await prisma.activo.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
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
 * Elimina un activo por ID, validando existencia y que no tenga permisos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.activo.findUnique({
      where: { id },
      include: { permisos: true },
    });
    if (!existente) throw new NotFoundError("Activo no encontrado");
    if (existente.permisos && existente.permisos.length > 0) {
      throw new ConflictError(
        "No se puede eliminar el activo porque tiene permisos asociados.",
      );
    }
    await prisma.activo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerVehiculosPorRuc,
  obtenerPorEmpresaYTipo,
  crear,
  actualizar,
  eliminar,
};
