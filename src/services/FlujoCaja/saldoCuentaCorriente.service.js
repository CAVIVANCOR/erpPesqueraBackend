// Importa la instancia de Prisma Client para acceder a la base de datos
import prisma from "../../config/prismaClient.js";
// Importa los errores personalizados para manejo consistente de errores
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

// Define las relaciones que se incluirán al consultar saldos
const incluirRelaciones = {
  cuentaCorriente: {
    include: {
      banco: true,
      moneda: true,
      empresa: true,
    }
  },
  empresa: true,
  movimientoCaja: true,
  centroCosto: true,
};

/**
 * Valida que existan las referencias foráneas requeridas antes de crear un saldo.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} param0 - Objeto con los IDs a validar
 */
async function validarReferencias({
  cuentaCorrienteId,
  empresaId,
  movimientoCajaId,
  centroCostoId,
}) {
  // Valida existencia de la cuenta corriente
  const cuenta = await prisma.cuentaCorriente.findUnique({
    where: { id: cuentaCorrienteId },
  });
  if (!cuenta) throw new ValidationError("Cuenta corriente no existente");

  // Valida existencia de la empresa
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
  });
  if (!empresa) throw new ValidationError("Empresa no existente");

  // Valida existencia del movimiento de caja si se proporciona
  if (movimientoCajaId) {
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id: movimientoCajaId },
    });
    if (!movimiento)
      throw new ValidationError("Movimiento de caja no existente");
  }

  // Valida existencia del centro de costo si se proporciona
  if (centroCostoId) {
    const centroCosto = await prisma.centroCosto.findUnique({
      where: { id: centroCostoId },
    });
    if (!centroCosto) throw new ValidationError("Centro de costo no existente");
  }
}

/**
 * Obtiene todos los saldos de cuentas corrientes, incluyendo relaciones principales.
 * @returns {Promise<Array>} - Lista de saldos
 */
const listar = async () => {
  try {
    return await prisma.saldoCuentaCorriente.findMany({
      include: incluirRelaciones,
      orderBy: {
        fecha: 'desc'
      }
    });
  } catch (err) {
    // Maneja errores de base de datos
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene un saldo por su ID.
 * @param {BigInt|number} id - ID del saldo
 * @returns {Promise<Object>} - Saldo encontrado
 */
const obtenerPorId = async (id) => {
  try {
    const saldo = await prisma.saldoCuentaCorriente.findUnique({
      where: { id },
      include: incluirRelaciones,
    });
    if (!saldo) throw new NotFoundError("Saldo no encontrado");
    return saldo;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene el historial de saldos de una cuenta corriente específica.
 * @param {BigInt|number} cuentaCorrienteId - ID de la cuenta corriente
 * @param {Date} fechaInicio - Fecha de inicio del rango (opcional)
 * @param {Date} fechaFin - Fecha de fin del rango (opcional)
 * @returns {Promise<Array>} - Historial de saldos
 */
const obtenerHistorial = async (cuentaCorrienteId, fechaInicio = null, fechaFin = null) => {
  try {
    const where = {
      cuentaCorrienteId,
    };

    // Agregar filtro de fechas si se proporcionan
    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) where.fecha.gte = new Date(fechaInicio);
      if (fechaFin) where.fecha.lte = new Date(fechaFin);
    }

    return await prisma.saldoCuentaCorriente.findMany({
      where,
      include: incluirRelaciones,
      orderBy: {
        fecha: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Calcula el saldo actual de una cuenta corriente.
 * @param {BigInt|number} cuentaCorrienteId - ID de la cuenta corriente
 * @returns {Promise<Object>} - Objeto con saldo actual y último registro
 */
const calcularSaldoActual = async (cuentaCorrienteId) => {
  try {
    // Obtener el último saldo registrado
    const ultimoSaldo = await prisma.saldoCuentaCorriente.findFirst({
      where: { cuentaCorrienteId },
      orderBy: {
        fecha: 'desc'
      },
      include: {
        cuentaCorriente: {
          include: {
            moneda: true,
          }
        }
      }
    });

    if (!ultimoSaldo) {
      return {
        saldoActual: 0,
        ultimoRegistro: null,
        mensaje: "No hay registros de saldo para esta cuenta"
      };
    }

    return {
      saldoActual: ultimoSaldo.saldoActual,
      ultimoRegistro: ultimoSaldo,
      mensaje: "Saldo actual obtenido correctamente"
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea un nuevo registro de saldo.
 * @param {Object} data - Datos del saldo
 * @returns {Promise<Object>} - Saldo creado
 */
const crear = async (data) => {
  try {
    // Validar que los campos requeridos no sean null
    if (
      !data.cuentaCorrienteId ||
      !data.empresaId ||
      data.saldoAnterior === undefined ||
      data.ingresos === undefined ||
      data.egresos === undefined ||
      data.saldoActual === undefined
    ) {
      throw new ValidationError(
        "Cuenta corriente, Empresa, Saldo anterior, Ingresos, Egresos y Saldo actual son obligatorios"
      );
    }

    // Validar que los montos no sean negativos
    if (Number(data.ingresos) < 0) {
      throw new ValidationError("Los ingresos no pueden ser negativos");
    }
    if (Number(data.egresos) < 0) {
      throw new ValidationError("Los egresos no pueden ser negativos");
    }

    // Validar la fórmula: saldoActual = saldoAnterior + ingresos - egresos
    const saldoCalculado = Number(data.saldoAnterior) + Number(data.ingresos) - Number(data.egresos);
    if (Math.abs(saldoCalculado - Number(data.saldoActual)) > 0.01) {
      throw new ValidationError(
        `El saldo actual no coincide con el cálculo. Esperado: ${saldoCalculado.toFixed(2)}, Recibido: ${Number(data.saldoActual).toFixed(2)}`
      );
    }

    await validarReferencias(data);

    // Preparar datos con auditoría automática
    const datosConAuditoria = {
      ...data,
      creadoEn: new Date(),
    };

    const resultado = await prisma.saldoCuentaCorriente.create({
      data: datosConAuditoria,
    });
    return resultado;
  } catch (err) {
    // Solo convertir errores de Prisma que NO sean de validación de negocio
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
 * Actualiza un saldo existente.
 * @param {BigInt|number} id - ID del saldo a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Saldo actualizado
 */
const actualizar = async (id, data) => {
  try {
    // Primero valida existencia del saldo
    const existente = await prisma.saldoCuentaCorriente.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Saldo no encontrado");

    // Validar que los montos no sean negativos si se proporcionan
    if (data.ingresos !== undefined && Number(data.ingresos) < 0) {
      throw new ValidationError("Los ingresos no pueden ser negativos");
    }
    if (data.egresos !== undefined && Number(data.egresos) < 0) {
      throw new ValidationError("Los egresos no pueden ser negativos");
    }

    // Si se actualizan los componentes del saldo, validar la fórmula
    if (
      data.saldoAnterior !== undefined ||
      data.ingresos !== undefined ||
      data.egresos !== undefined ||
      data.saldoActual !== undefined
    ) {
      const saldoAnt = data.saldoAnterior !== undefined ? Number(data.saldoAnterior) : Number(existente.saldoAnterior);
      const ing = data.ingresos !== undefined ? Number(data.ingresos) : Number(existente.ingresos);
      const egr = data.egresos !== undefined ? Number(data.egresos) : Number(existente.egresos);
      const saldoAct = data.saldoActual !== undefined ? Number(data.saldoActual) : Number(existente.saldoActual);

      const saldoCalculado = saldoAnt + ing - egr;
      if (Math.abs(saldoCalculado - saldoAct) > 0.01) {
        throw new ValidationError(
          `El saldo actual no coincide con el cálculo. Esperado: ${saldoCalculado.toFixed(2)}, Recibido: ${saldoAct.toFixed(2)}`
        );
      }
    }

    await validarReferencias({ ...existente, ...data });

    // Realiza la actualización
    const actualizado = await prisma.saldoCuentaCorriente.update({
      where: { id },
      data,
    });
    return actualizado;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Saldo no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Elimina un saldo.
 * @param {BigInt|number} id - ID del saldo a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const eliminar = async (id) => {
  try {
    await prisma.saldoCuentaCorriente.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Saldo no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerHistorial,
  calcularSaldoActual,
  crear,
  actualizar,
  eliminar,
};
