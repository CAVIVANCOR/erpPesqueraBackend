// Importa la instancia de Prisma Client para acceder a la base de datos
import prisma from "../../config/prismaClient.js";
import { Prisma } from "@prisma/client";  // ✅ AGREGAR ESTA LÍNEA
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
  moneda: true,
  empresa: true,
  movimientosOrigen: true,
  movimientosDestino: true,
  cuentaContable: {
    select: {
      id: true,
      codigoCuenta: true,
      nombreCuenta: true,
    }
  },
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
 * Valida que no exista una cuenta corriente duplicada con el mismo número, banco, empresa y descripción.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado(
  { numeroCuenta, bancoId, empresaId, descripcion },
  excluirId = null
) {
  // Normalizar descripción: trim y convertir a mayúsculas
  const descripcionNormalizada = descripcion ? descripcion.trim().toUpperCase() : null;

  try {
    // Buscar todas las cuentas con el mismo número, banco y empresa
    const cuentasExistentes = await prisma.cuentaCorriente.findMany({
      where: {
        numeroCuenta,
        bancoId,
        empresaId,
        ...(excluirId && { id: { not: excluirId } }),
      },
    });

    // Verificar si alguna tiene la misma descripción normalizada
    const duplicado = cuentasExistentes.find(cuenta => {
      const descripcionExistente = cuenta.descripcion ? cuenta.descripcion.trim().toUpperCase() : null;
      return descripcionExistente === descripcionNormalizada;
    });

    if (duplicado) {
      throw new ConflictError(
        "Ya existe una cuenta corriente con ese número, banco, empresa y descripción"
      );
    }
  } catch (error) {
    console.error("Error en consulta de duplicados:", error);
    throw error;
  }
}

const obtenerPorId = async (id) => {
  try {
    // 1. Obtener la cuenta corriente con sus relaciones
    const cuenta = await prisma.cuentaCorriente.findUnique({
      where: { id },
      include: incluirRelaciones,
    });

    if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada");

    // 2. ✅ CALCULAR saldoActual desde el último SaldoCuentaCorriente
    const ultimoSaldo = await prisma.saldoCuentaCorriente.findFirst({
      where: { cuentaCorrienteId: cuenta.id },
      orderBy: { fecha: 'desc' },
      select: { saldoActual: true, fecha: true },
    });

    // 3. Agregar el saldoActual calculado a la cuenta
    return {
      ...cuenta,
      saldoActual: ultimoSaldo?.saldoActual || 0,
      ultimaActualizacionSaldo: ultimoSaldo?.fecha || null,
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene todas las cuentas corrientes, incluyendo relaciones principales.
 * @returns {Promise<Array>} - Lista de cuentas corrientes
 */
const listar = async () => {
  try {
    // 1. Obtener todas las cuentas corrientes con sus relaciones
    const cuentas = await prisma.cuentaCorriente.findMany({
      include: incluirRelaciones,
    });

    // ✅ Si no hay cuentas, retornar array vacío
    if (cuentas.length === 0) {
      return [];
    }

    // 2. Obtener IDs de todas las cuentas
    const cuentaIds = cuentas.map(c => c.id);

    // 3. ✅ OPTIMIZADO: Una sola query para obtener todos los últimos saldos
    const ultimosSaldos = await prisma.$queryRaw`
      SELECT DISTINCT ON ("cuentaCorrienteId") 
        "cuentaCorrienteId", 
        "saldoActual", 
        "fecha"
      FROM "SaldoCuentaCorriente"
      WHERE "cuentaCorrienteId" IN (${Prisma.join(cuentaIds)})
      ORDER BY "cuentaCorrienteId", "fecha" DESC
    `;

    // 4. Mapear saldos a un objeto para búsqueda rápida
    const saldosMap = Object.fromEntries(
      ultimosSaldos.map(s => [Number(s.cuentaCorrienteId), s])
    );

    // 5. Agregar saldoActual a cada cuenta
    const cuentasConSaldo = cuentas.map(cuenta => ({
      ...cuenta,
      saldoActual: saldosMap[cuenta.id]?.saldoActual || 0,
      ultimaActualizacionSaldo: saldosMap[cuenta.id]?.fecha || null,
    }));

    return cuentasConSaldo;
  } catch (err) {
    console.error("Error en listar cuentas corrientes:", err);
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

    // Validar saldoMinimo si se proporciona
    if (data.saldoMinimo !== undefined && data.saldoMinimo !== null) {
      const saldoMin = Number(data.saldoMinimo);
      if (saldoMin < 0) {
        throw new ValidationError("El saldo mínimo no puede ser negativo");
      }
    }

    // Validar fechas de apertura y cierre
    if (data.fechaApertura && data.fechaCierre) {
      const apertura = new Date(data.fechaApertura);
      const cierre = new Date(data.fechaCierre);
      if (cierre < apertura) {
        throw new ValidationError("La fecha de cierre no puede ser anterior a la fecha de apertura");
      }
    }

    await validarReferencias(data);
    await validarDuplicado(data);

    // Preparar datos con auditoría automática
    const datosConAuditoria = {
      ...data,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const resultado = await prisma.cuentaCorriente.create({ data: datosConAuditoria });
    return resultado;
  } catch (err) {
    // Manejar error de restricción única específicamente
    if (err.code === "P2002") {
      if (err.meta?.target?.includes("unique_cuenta_banco_empresa_descripcion") ||
        err.meta?.target?.includes("unique_cuenta_banco_empresa")) {
        throw new ConflictError(
          "Ya existe una cuenta corriente con ese número, banco, empresa y descripción"
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

    // Validar saldoMinimo si se proporciona
    if (data.saldoMinimo !== undefined && data.saldoMinimo !== null) {
      const saldoMin = Number(data.saldoMinimo);
      if (saldoMin < 0) {
        throw new ValidationError("El saldo mínimo no puede ser negativo");
      }
    }

    // Validar fechas de apertura y cierre
    if (data.fechaApertura && data.fechaCierre) {
      const apertura = new Date(data.fechaApertura);
      const cierre = new Date(data.fechaCierre);
      if (cierre < apertura) {
        throw new ValidationError("La fecha de cierre no puede ser anterior a la fecha de apertura");
      }
    }

    // Luego valida referencias y duplicados
    await validarReferencias(data);
    await validarDuplicado(data, id);

    // Preparar datos con auditoría automática
    const datosConAuditoria = {
      ...data,
      actualizadoEn: new Date(),
    };

    // Realiza la actualización
    const actualizada = await prisma.cuentaCorriente.update({
      where: { id },
      data: datosConAuditoria,
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
