// Importa la instancia de Prisma Client para acceder a la base de datos
import prisma from "../../config/prismaClient.js";
// Importa los errores personalizados para manejo consistente de errores
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
// Importa servicios necesarios para generación de asientos contables
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import { ESTADO_ASIENTO_CONTABLE } from "../../utils/estados.constants.js";

// Define las relaciones que se incluirán al consultar saldos
const incluirRelaciones = {
  cuentaCorriente: {
    include: {
      banco: true,
      moneda: true,
      empresa: true,
      cuentaContable: true,
      tipoCuentaCorriente: true
    },
  },
  empresa: true,
  movimientoCaja: true,
  centroCosto: true,
  asientosContables: {
    // Relación 1:N
    include: {
      detalles: {
        include: {
          planCuenta: true,
        },
        orderBy: { numeroLinea: "asc" },
      },
    },
    orderBy: { fechaAsiento: "desc" },
  },
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
    include: {
      cuentaContable: true,
      banco: true,
    },
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

  return cuenta;
}

/**
 * Genera un BORRADOR de asiento contable (sin guardarlo en BD).
 * El usuario podrá revisar y modificar las cuentas antes de guardarlo.
 * @param {BigInt} saldoId - ID del saldo
 * @returns {Promise<Object>} - Borrador del asiento contable
 */
const generarBorradorAsiento = async (saldoId) => {
  try {
    const saldo = await prisma.saldoCuentaCorriente.findUnique({
      where: { id: saldoId },
      include: {
        cuentaCorriente: {
          include: {
            cuentaContable: true,
            banco: true,
            moneda: true,
          },
        },
        empresa: true,
      },
    });

    if (!saldo) {
      throw new NotFoundError("Saldo no encontrado");
    }

    const cuentaCorriente = saldo.cuentaCorriente;

    if (!cuentaCorriente.cuentaContableId || !cuentaCorriente.cuentaContable) {
      throw new ValidationError(
        "La cuenta corriente no tiene una cuenta contable vinculada",
      );
    }

    // Obtener período contable activo o el más reciente
    let periodoContable = null;
    try {
      periodoContable = await periodoContableService.obtenerPeriodoActivo(
        saldo.empresaId,
      );
    } catch (error) {
      // Si no hay período activo, buscar el período más reciente (estado ABIERTO = 50)
      const periodos = await prisma.periodoContable.findMany({
        where: {
          empresaId: saldo.empresaId,
          estadoId: 50n, // Estado ABIERTO
        },
        orderBy: { fechaInicio: "desc" },
        take: 1,
      });

      if (periodos.length > 0) {
        periodoContable = periodos[0];
      } else {
        // Si no hay períodos abiertos, buscar cualquier período de la empresa
        const cualquierPeriodo = await prisma.periodoContable.findFirst({
          where: { empresaId: saldo.empresaId },
          orderBy: { fechaInicio: "desc" },
        });

        if (!cualquierPeriodo) {
          throw new ValidationError(
            "No hay períodos contables configurados para esta empresa. " +
            "Por favor, cree un período contable antes de generar asientos.",
          );
        }
        periodoContable = cualquierPeriodo;
      }
    }

    // Buscar cuenta de Resultados Acumulados
    const cuentaContrapartida = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "591" },
        activo: true,
      },
    });

    if (!cuentaContrapartida) {
      throw new ValidationError(
        "No se encontró la cuenta de Resultados Acumulados (591)",
      );
    }

    const montoSaldo = Number(saldo.saldoActual);
    const esSaldoPositivo = montoSaldo > 0;

    // Generar estructura del borrador (SIN guardarlo)
    const borrador = {
      empresaId: saldo.empresaId,
      periodoContableId: periodoContable.id,
      fechaAsiento: saldo.fecha || new Date(),
      glosa: `Saldo inicial de cuenta corriente ${cuentaCorriente.numeroCuenta} - ${cuentaCorriente.descripcion || cuentaCorriente.banco?.nombre || ""}`,
      tipoLibro: "FISCAL",
      origenAsiento: "AUTOMATICO",
      monedaId: cuentaCorriente.monedaId,
      detalles: [],
    };

    // Generar detalles según si es positivo o negativo
    if (esSaldoPositivo) {
      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: cuentaCorriente.cuentaContableId,
          glosa: `Saldo inicial ${cuentaCorriente.numeroCuenta}`,
          debe: montoSaldo,
          haber: 0,
          centroCostoId: saldo.centroCostoId || null,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaContrapartida.id,
          glosa: `Saldo inicial ${cuentaCorriente.numeroCuenta}`,
          debe: 0,
          haber: montoSaldo,
          centroCostoId: saldo.centroCostoId || null,
        },
      ];
    } else {
      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: cuentaContrapartida.id,
          glosa: `Sobregiro inicial ${cuentaCorriente.numeroCuenta}`,
          debe: Math.abs(montoSaldo),
          haber: 0,
          centroCostoId: saldo.centroCostoId || null,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaCorriente.cuentaContableId,
          glosa: `Sobregiro inicial ${cuentaCorriente.numeroCuenta}`,
          debe: 0,
          haber: Math.abs(montoSaldo),
          centroCostoId: saldo.centroCostoId || null,
        },
      ];
    }

    return borrador;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Guarda el asiento contable editado por el usuario y lo vincula al saldo.
 * @param {BigInt} saldoId - ID del saldo
 * @param {Object} asientoData - Datos del asiento editado por el usuario
 * @param {BigInt} creadoPor - ID del usuario que crea el asiento
 * @returns {Promise<Object>} - Asiento contable creado
 */
const guardarAsientoContable = async (saldoId, asientoData, creadoPor) => {
  try {
    // ✅ BUSCAR SUBMÓDULO DINÁMICAMENTE
    const submodulo = await prisma.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "SaldoCuentaCorriente",
        activo: true,
      },
    });

    if (!submodulo) {
      throw new ValidationError(
        'Submódulo "SaldoCuentaCorriente" no encontrado en el sistema.',
      );
    }

    const saldo = await prisma.saldoCuentaCorriente.findUnique({
      where: { id: saldoId },
      include: {
        cuentaCorriente: true,
      },
    });

    if (!saldo) {
      throw new NotFoundError("Saldo de cuenta corriente no encontrado");
    }

    // Validar que el monto total cuadre
    const totalDebe = asientoData.detalles.reduce(
      (sum, d) => sum + Number(d.debe || 0),
      0,
    );
    const totalHaber = asientoData.detalles.reduce(
      (sum, d) => sum + Number(d.haber || 0),
      0,
    );
    const diferencia = totalDebe - totalHaber;

    if (Math.abs(diferencia) > 0.01) {
      throw new ValidationError(
        `El asiento no está cuadrado. Diferencia: ${diferencia}`,
      );
    }

    // Obtener estado PENDIENTE para Asientos Contables
    const estadoPendiente = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 20, // Tipo "ASIENTO CONTABLE"
        descripcion: "PENDIENTE",
      },
    });

    if (!estadoPendiente) {
      throw new ValidationError(
        "Estado PENDIENTE para Asientos Contables no encontrado en el sistema.",
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Obtener correlativo
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: {
          empresaId: asientoData.empresaId,
          periodoContableId: asientoData.periodoContableId,
        },
        orderBy: { correlativo: "desc" },
      });
      const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
      const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

      // Crear nuevo asiento vinculado al saldo mediante procesoOrigenId
      const asiento = await tx.asientoContable.create({
        data: {
          empresaId: asientoData.empresaId,
          periodoContableId: asientoData.periodoContableId,
          numeroAsiento,
          correlativo,
          fechaAsiento: asientoData.fechaAsiento,
          glosa: asientoData.glosa,
          tipoLibro: asientoData.tipoLibro || "FISCAL",
          origenAsiento: asientoData.origenAsiento || "AUTOMATICO",
          submoduloOrigenId: submodulo.id,
          procesoOrigenId: saldoId,
          estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE), // PENDIENTE
          totalDebe,
          totalHaber,
          diferencia,
          estaCuadrado: true,
          monedaId: asientoData.monedaId,
          tipoCambio: asientoData.tipoCambio,
          creadoPor,
          actualizadoPor: creadoPor,
        },
      });

      // Crear detalles
      await Promise.all(
        asientoData.detalles.map((detalle, index) =>
          tx.detalleAsientoContable.create({
            data: {
              asientoContableId: asiento.id,
              numeroLinea: index + 1,
              planCuentaId: detalle.planCuentaId,
              glosa: detalle.glosa || asientoData.glosa,
              debe: Number(detalle.debe || 0),
              haber: Number(detalle.haber || 0),
              monedaId: asientoData.monedaId,
              tipoCambio: asientoData.tipoCambio,
              centroCostoId: detalle.centroCostoId || null,
              creadoPor,
              actualizadoPor: creadoPor,
            },
          }),
        ),
      );

      // Retornar asiento completo con includes
      return await tx.asientoContable.findUnique({
        where: { id: asiento.id },
        include: {
          detalles: {
            include: {
              planCuenta: true,
              centroCosto: true,
            },
          },
          empresa: true,
          periodoContable: true,
          moneda: true,
          estado: true,
        },
      });
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Genera un asiento contable para el registro de saldo inicial de cuenta corriente.
 * @param {Object} saldo - Datos del saldo creado
 * @param {Object} cuentaCorriente - Datos de la cuenta corriente
 * @param {Object} tx - Transacción de Prisma
 * @param {BigInt} creadoPor - ID del usuario que crea el asiento
 * @returns {Promise<Object>} - Asiento contable creado
 */
async function generarAsientoSaldoInicial(
  saldo,
  cuentaCorriente,
  tx,
  creadoPor,
) {
  try {
    if (!cuentaCorriente.cuentaContableId || !cuentaCorriente.cuentaContable) {
      console.warn(
        `Cuenta corriente ${cuentaCorriente.id} no tiene cuenta contable vinculada. No se generará asiento.`,
      );
      return null;
    }

    const periodoActivo = await periodoContableService.obtenerPeriodoActivo(
      saldo.empresaId,
    );
    if (!periodoActivo) {
      console.warn(
        `No hay período contable activo para empresa ${saldo.empresaId}. No se generará asiento.`,
      );
      return null;
    }

    const moneda = await tx.moneda.findFirst({
      where: { codigo: "PEN" },
    });
    if (!moneda) {
      throw new ValidationError("No se encontró la moneda PEN en el sistema.");
    }

    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (76) no encontrado.");
    }

    const cuentaContrapartida = await tx.planCuentasContable.findFirst({
      where: {
        empresaId: saldo.empresaId,
        codigoCuenta: { startsWith: "591" },
      },
    });

    if (!cuentaContrapartida) {
      console.warn(
        "No se encontró cuenta de Resultados Acumulados (591). No se generará asiento.",
      );
      return null;
    }

    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: {
        empresaId: saldo.empresaId,
        periodoContableId: periodoActivo.id,
      },
      orderBy: { correlativo: "desc" },
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

    const montoSaldo = Number(saldo.saldoActual);
    const esSaldoPositivo = montoSaldo > 0;

    const totalDebe = esSaldoPositivo ? montoSaldo : Math.abs(montoSaldo);
    const totalHaber = esSaldoPositivo ? montoSaldo : Math.abs(montoSaldo);

    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: saldo.empresaId,
        periodoContableId: periodoActivo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: saldo.fecha || new Date(),
        glosa: `Saldo inicial de cuenta corriente ${cuentaCorriente.numeroCuenta} - ${cuentaCorriente.descripcion || cuentaCorriente.banco?.nombre || ""}`,
        tipoLibro: "FISCAL",
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: null,
        procesoOrigenId: saldo.id,
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE),
        totalDebe,
        totalHaber,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: moneda.id,
        tipoCambio: null,
        creadoPor,
      },
    });

    const detalles = [];

    if (esSaldoPositivo) {
      detalles.push({
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaCorriente.cuentaContableId,
        glosa: `Saldo inicial ${cuentaCorriente.numeroCuenta}`,
        debe: montoSaldo,
        haber: 0,
        monedaId: moneda.id,
        centroCostoId: saldo.centroCostoId || null,
        creadoPor,
      });

      detalles.push({
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaContrapartida.id,
        glosa: `Saldo inicial ${cuentaCorriente.numeroCuenta}`,
        debe: 0,
        haber: montoSaldo,
        monedaId: moneda.id,
        centroCostoId: saldo.centroCostoId || null,
        creadoPor,
      });
    } else {
      detalles.push({
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaContrapartida.id,
        glosa: `Sobregiro inicial ${cuentaCorriente.numeroCuenta}`,
        debe: Math.abs(montoSaldo),
        haber: 0,
        monedaId: moneda.id,
        centroCostoId: saldo.centroCostoId || null,
        creadoPor,
      });

      detalles.push({
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaCorriente.cuentaContableId,
        glosa: `Sobregiro inicial ${cuentaCorriente.numeroCuenta}`,
        debe: 0,
        haber: Math.abs(montoSaldo),
        monedaId: moneda.id,
        centroCostoId: saldo.centroCostoId || null,
        creadoPor,
      });
    }

    await Promise.all(
      detalles.map((detalle) =>
        tx.detalleAsientoContable.create({ data: detalle }),
      ),
    );

    return asiento;
  } catch (err) {
    console.error("Error al generar asiento contable para saldo inicial:", err);
    return null;
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
        fecha: "desc",
      },
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
const obtenerHistorial = async (
  cuentaCorrienteId,
  fechaInicio = null,
  fechaFin = null,
) => {
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
        fecha: "desc",
      },
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
        fecha: "desc",
      },
      include: {
        cuentaCorriente: {
          include: {
            moneda: true,
          },
        },
      },
    });

    if (!ultimoSaldo) {
      return {
        saldoActual: 0,
        ultimoRegistro: null,
        mensaje: "No hay registros de saldo para esta cuenta",
      };
    }

    return {
      saldoActual: ultimoSaldo.saldoActual,
      ultimoRegistro: ultimoSaldo,
      mensaje: "Saldo actual obtenido correctamente",
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea un nuevo registro de saldo y genera automáticamente el asiento contable.
 * @param {Object} data - Datos del saldo
 * @returns {Promise<Object>} - Saldo creado con asiento contable
 */
const crear = async (data) => {
  try {
    // Validar que los campos requeridos no sean null
    if (
      !data.cuentaCorrienteId ||
      data.empresaId === undefined ||
      data.empresaId === null ||
      data.saldoAnterior === undefined ||
      data.ingresos === undefined ||
      data.egresos === undefined ||
      data.saldoActual === undefined
    ) {
      throw new ValidationError(
        "Cuenta corriente, Empresa, Saldo anterior, Ingresos, Egresos y Saldo actual son obligatorios",
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
    const saldoCalculado =
      Number(data.saldoAnterior) + Number(data.ingresos) - Number(data.egresos);
    if (Math.abs(saldoCalculado - Number(data.saldoActual)) > 0.01) {
      throw new ValidationError(
        `El saldo actual no coincide con el cálculo. Esperado: ${saldoCalculado.toFixed(2)}, Recibido: ${Number(data.saldoActual).toFixed(2)}`,
      );
    }

    await validarReferencias(data);

    // Preparar datos con auditoría automática
    const datosConAuditoria = {
      ...data,
      creadoEn: new Date(),
    };

    // Crear el saldo SIN asiento contable (se generará después deliberadamente)
    const saldoCreado = await prisma.saldoCuentaCorriente.create({
      data: datosConAuditoria,
      include: incluirRelaciones,
    });

    return saldoCreado;
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
        err.message,
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
      const saldoAnt =
        data.saldoAnterior !== undefined
          ? Number(data.saldoAnterior)
          : Number(existente.saldoAnterior);
      const ing =
        data.ingresos !== undefined
          ? Number(data.ingresos)
          : Number(existente.ingresos);
      const egr =
        data.egresos !== undefined
          ? Number(data.egresos)
          : Number(existente.egresos);
      const saldoAct =
        data.saldoActual !== undefined
          ? Number(data.saldoActual)
          : Number(existente.saldoActual);

      const saldoCalculado = saldoAnt + ing - egr;
      if (Math.abs(saldoCalculado - saldoAct) > 0.01) {
        throw new ValidationError(
          `El saldo actual no coincide con el cálculo. Esperado: ${saldoCalculado.toFixed(2)}, Recibido: ${saldoAct.toFixed(2)}`,
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
    if (err.code === "P2025") throw new NotFoundError("Saldo no encontrado");
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
    if (err.code === "P2025") throw new NotFoundError("Saldo no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Lista los saldos generados por un movimiento de caja específico
 * @param {number} movimientoCajaId - ID del movimiento de caja
 * @returns {Promise<Array>} - Lista de saldos generados por el movimiento
 */
const listarPorMovimiento = async (movimientoCajaId) => {
  try {
    const saldos = await prisma.saldoCuentaCorriente.findMany({
      where: {
        movimientoCajaId: Number(movimientoCajaId),
      },
      include: incluirRelaciones,
      orderBy: {
        fecha: "desc",
      },
    });

    return saldos;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError(
        "Error de base de datos al listar saldos por movimiento",
        err.message,
      );
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
  listarPorMovimiento,
  generarBorradorAsiento,
  guardarAsientoContable,
};
