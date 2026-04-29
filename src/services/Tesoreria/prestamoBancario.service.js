import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import lineaCreditoService from "./lineaCredito.service.js";
import integracionContablePrestamo from './integracionContablePrestamo.service.js';
const { obtenerTipoCambio } = lineaCreditoService;
/**
 * Servicio CRUD para PrestamoBancario
 * Gestiona préstamos bancarios con cronogramas de pago, desembolsos y garantías.
 * Actualiza automáticamente los saldos de las líneas de crédito vinculadas.
 * Documentado en español.
 */
/**
 * Valida los datos de un préstamo bancario.
 * @param {Object} data - Datos del préstamo
 */
async function validarPrestamoBancario(data) {
  // Validar empresa
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa) {
      throw new ValidationError("La empresa referenciada no existe.");
    }
  }

  // Validar banco
  if (data.bancoId) {
    const banco = await prisma.banco.findUnique({
      where: { id: data.bancoId },
    });
    if (!banco) {
      throw new ValidationError("El banco referenciado no existe.");
    }
  }

  // Validar cuenta corriente si existe
  if (data.cuentaCorrienteId) {
    const cuenta = await prisma.cuentaCorriente.findUnique({
      where: { id: data.cuentaCorrienteId },
    });
    if (!cuenta) {
      throw new ValidationError("La cuenta corriente referenciada no existe.");
    }
  }

  // Validar moneda
  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) {
      throw new ValidationError("La moneda referenciada no existe.");
    }
  }

  // Validar estado
  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: data.estadoId },
    });
    if (!estado) {
      throw new ValidationError("El estado referenciado no existe.");
    }
  }

  // Validar línea de crédito si existe
  if (data.lineaCreditoId) {
    const lineaCredito = await prisma.lineaCredito.findUnique({
      where: { id: data.lineaCreditoId },
    });
    if (!lineaCredito) {
      throw new ValidationError("La línea de crédito referenciada no existe.");
    }

    // Validar que la línea de crédito esté vigente
    // Estados: 86=APROBADA, 87=VIGENTE
    if (![86n, 87n].includes(lineaCredito.estadoId)) {
      throw new ValidationError(
        "La línea de crédito seleccionada no está vigente.",
      );
    }
  }

  // Validar número de préstamo único por empresa
  if (data.numeroPrestamo && data.empresaId) {
    const existente = await prisma.prestamoBancario.findFirst({
      where: {
        empresaId: data.empresaId,
        numeroPrestamo: data.numeroPrestamo,
        id: data.id ? { not: data.id } : undefined,
      },
    });
    if (existente) {
      throw new ValidationError(
        `El número de préstamo "${data.numeroPrestamo}" ya existe para esta empresa.`,
      );
    }
  }

  // Validar montos
  if (data.montoDesembolsado && data.montoAprobado) {
    if (data.montoDesembolsado > data.montoAprobado) {
      throw new ValidationError(
        "El monto desembolsado no puede ser mayor al monto aprobado.",
      );
    }
  }

  // Validar fechas
  if (data.fechaContrato && data.fechaVencimiento) {
    if (new Date(data.fechaVencimiento) <= new Date(data.fechaContrato)) {
      throw new ValidationError(
        "La fecha de vencimiento debe ser posterior a la fecha de contrato.",
      );
    }
  }

  // Validar plazo y cuotas
  if (data.plazoMeses && data.numeroCuotas) {
    if (data.numeroCuotas > data.plazoMeses) {
      throw new ValidationError(
        "El número de cuotas no puede ser mayor al plazo en meses.",
      );
    }
  }

  // Validar frecuencia de pago
  if (data.frecuenciaPago) {
    const frecuenciasValidas = [
      "DIAS",
      "MENSUAL",
      "BIMESTRAL",
      "TRIMESTRAL",
      "CUATRIMESTRAL",
      "SEMESTRAL",
      "ANUAL",
    ];
    if (!frecuenciasValidas.includes(data.frecuenciaPago)) {
      throw new ValidationError("La frecuencia de pago no es válida.");
    }
  }
  // Validar tipo de préstamo
  if (data.tipoPrestamoId) {
    const tipoPrestamo = await prisma.tipoPrestamo.findUnique({
      where: { id: data.tipoPrestamoId },
    });
    if (!tipoPrestamo) {
      throw new ValidationError("El tipo de préstamo referenciado no existe.");
    }
    if (!tipoPrestamo.activo) {
      throw new ValidationError(
        "El tipo de préstamo seleccionado no está activo.",
      );
    }
  }

  // Validar tipo de amortización
  if (data.tipoAmortizacion) {
    const tiposValidos = ["FRANCES", "ALEMAN", "AMERICANO"];
    if (!tiposValidos.includes(data.tipoAmortizacion)) {
      throw new ValidationError("El tipo de amortización no es válido.");
    }
  }

  // Validar préstamo refinanciado si existe
  if (data.prestamoRefinanciadoId) {
    const prestamoRef = await prisma.prestamoBancario.findUnique({
      where: { id: data.prestamoRefinanciadoId },
    });
    if (!prestamoRef) {
      throw new ValidationError(
        "El préstamo refinanciado referenciado no existe.",
      );
    }
  }
}

/**
 * Calcula el cronograma de cuotas según el tipo de amortización.
 * @param {Object} prestamo - Datos del préstamo
 * @returns {Array} Array de cuotas
 */
function calcularCronogramaCuotas(prestamo) {
  const {
    montoDesembolsado,
    tasaInteresAnual,
    numeroCuotas,
    fechaDesembolso,
    frecuenciaPago,
    tipoAmortizacion,
    comisionMantenimiento,
    seguroDesgravamen,
    periodoGracia,
  } = prestamo;

  const cuotas = [];
  const tasaMensual = tasaInteresAnual / 100 / 12;
  let saldoCapital = parseFloat(montoDesembolsado);

  // Calcular meses entre cuotas según frecuencia
  const mesesEntreCuotas =
    {
      MENSUAL: 1,
      BIMESTRAL: 2,
      TRIMESTRAL: 3,
      CUATRIMESTRAL: 4,
      SEMESTRAL: 6,
      ANUAL: 12,
    }[frecuenciaPago] || 1;

  const tasaPorPeriodo = tasaMensual * mesesEntreCuotas;
  const graciaMeses = periodoGracia || 0;

  for (let i = 1; i <= numeroCuotas; i++) {
    const fechaVencimiento = new Date(fechaDesembolso);
    fechaVencimiento.setMonth(
      fechaVencimiento.getMonth() + i * mesesEntreCuotas,
    );

    let montoCapital = 0;
    let montoInteres = saldoCapital * tasaPorPeriodo;

    // Aplicar período de gracia
    const enGracia = i <= graciaMeses / mesesEntreCuotas;

    if (!enGracia) {
      // Calcular amortización según tipo
      switch (tipoAmortizacion) {
        case "FRANCES": {
          // Cuota fija
          const cuotaFija =
            (saldoCapital *
              (tasaPorPeriodo *
                Math.pow(1 + tasaPorPeriodo, numeroCuotas - i + 1))) /
            (Math.pow(1 + tasaPorPeriodo, numeroCuotas - i + 1) - 1);
          montoCapital = cuotaFija - montoInteres;
          break;
        }
        case "ALEMAN": {
          // Amortización constante
          montoCapital = montoDesembolsado / numeroCuotas;
          break;
        }
        case "AMERICANO": {
          // Solo intereses, capital en última cuota
          montoCapital = i === numeroCuotas ? saldoCapital : 0;
          break;
        }
        default:
          montoCapital = montoDesembolsado / numeroCuotas;
      }
    }

    const montoComision = comisionMantenimiento
      ? parseFloat(comisionMantenimiento)
      : 0;
    const montoSeguro = seguroDesgravamen ? parseFloat(seguroDesgravamen) : 0;
    const montoTotal =
      montoCapital + montoInteres + montoComision + montoSeguro;

    const saldoCapitalAntes = saldoCapital;
    saldoCapital -= montoCapital;

    cuotas.push({
      numeroCuota: i,
      fechaVencimiento,
      montoCapital: parseFloat(montoCapital.toFixed(2)),
      montoInteres: parseFloat(montoInteres.toFixed(2)),
      montoComision: parseFloat(montoComision.toFixed(2)),
      montoSeguro: parseFloat(montoSeguro.toFixed(2)),
      montoTotal: parseFloat(montoTotal.toFixed(2)),
      saldoCapitalAntes: parseFloat(saldoCapitalAntes.toFixed(2)),
      saldoCapitalDespues: parseFloat(Math.max(0, saldoCapital).toFixed(2)),
      estadoPago: "PENDIENTE",
      diasMora: null,
      fechaPago: null,
      montoPagado: null,
      montoMora: null,
      movimientoCajaId: null,
      asientoContableId: null,
      observaciones: null,
    });
  }

  return cuotas;
}

/**
 * Lista todos los préstamos bancarios.
 */
const listar = async () => {
  try {
    return await prisma.prestamoBancario.findMany({
      include: {
        empresa: true,
        banco: true,
        cuentaCorriente: true,
        moneda: true,
        estado: true,
        lineaCredito: true,
        tipoPrestamo: true,
        cuotas: {
          orderBy: { numeroCuota: "asc" },
        },
        desembolsos: {
          orderBy: { fechaDesembolso: "desc" },
        },
        garantias: {
          where: { activo: true },
        },
      },
      orderBy: { fechaContrato: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un préstamo bancario por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id },
      include: {
        empresa: true,
        banco: true,
        cuentaCorriente: true,
        moneda: true,
        estado: true,
        lineaCredito: true,
        tipoPrestamo: true,
        cuotas: {
          orderBy: { numeroCuota: "asc" },
        },
        desembolsos: {
          orderBy: { fechaDesembolso: "desc" },
        },
        garantias: true,
        prestamoRefinanciado: true,
        prestamosRefinanciadores: true,
      },
    });
    if (!prestamo) throw new NotFoundError("Préstamo bancario no encontrado");
    return prestamo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo préstamo bancario con su cronograma de cuotas.
 * Actualiza automáticamente los saldos de la línea de crédito vinculada.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios con mensajes específicos
    const camposFaltantes = [];

    if (!data.empresaId) camposFaltantes.push("Empresa");
    if (!data.bancoId) camposFaltantes.push("Banco");
    if (!data.numeroPrestamo) camposFaltantes.push("Número de Préstamo");
    if (!data.fechaContrato) camposFaltantes.push("Fecha de Contrato");
    if (!data.fechaDesembolso) camposFaltantes.push("Fecha de Desembolso");
    if (!data.fechaVencimiento) camposFaltantes.push("Fecha de Vencimiento");
    if (!data.montoAprobado) camposFaltantes.push("Monto Aprobado");
    if (!data.montoDesembolsado) camposFaltantes.push("Monto Desembolsado");
    if (!data.monedaId) camposFaltantes.push("Moneda");
    if (!data.tasaInteresAnual) camposFaltantes.push("Tasa de Interés Anual");
    if (!data.plazoMeses) camposFaltantes.push("Plazo en Meses");
    if (!data.numeroCuotas) camposFaltantes.push("Número de Cuotas");
    if (!data.frecuenciaPago) camposFaltantes.push("Frecuencia de Pago");
    if (!data.tipoPrestamoId) camposFaltantes.push("Tipo de Préstamo");
    if (!data.tipoAmortizacion) camposFaltantes.push("Tipo de Amortización");
    if (!data.estadoId) camposFaltantes.push("Estado");

    if (camposFaltantes.length > 0) {
      throw new ValidationError(
        `Faltan los siguientes campos obligatorios: ${camposFaltantes.join(", ")}`,
      );
    }

    await validarPrestamoBancario(data);

    // Calcular tipo de cambio si no viene en data
    let tipoCambioAplicado = data.tipoCambioAplicado;
    if (!tipoCambioAplicado && data.fechaDesembolso) {
      const tc = await obtenerTipoCambio(new Date(data.fechaDesembolso));
      tipoCambioAplicado = tc.venta; // Usar TC venta para conversiones
    }

    // Calcular saldos iniciales
    const saldoCapital = parseFloat(data.montoDesembolsado);
    const saldoInteres = 0;
    const capitalPagado = 0;
    const interesPagado = 0;

    // Generar cronograma de cuotas
    const cuotas = calcularCronogramaCuotas(data);

        // Crear préstamo con cuotas en una transacción
    const prestamo = await prisma.$transaction(async (tx) => {
      const nuevoPrestamo = await tx.prestamoBancario.create({
        data: {
          ...data,
          tipoCambioAplicado,
          saldoCapital,
          saldoInteres,
          capitalPagado,
          interesPagado,
        },
        include: {
          banco: true,
          moneda: true
        }
      });

      // Crear cuotas
      await tx.cuotaPrestamo.createMany({
        data: cuotas.map((cuota) => ({
          ...cuota,
          prestamoBancarioId: nuevoPrestamo.id,
        })),
      });

      // Si es refinanciamiento, actualizar el préstamo original a estado REFINANCIADO (84)
      if (data.esRefinanciamiento && data.prestamoRefinanciadoId) {
        await tx.prestamoBancario.update({
          where: { id: data.prestamoRefinanciadoId },
          data: { estadoId: BigInt(84) }, // Estado REFINANCIADO
        });
      }

      // ⭐ GENERAR ASIENTO CONTABLE DE DESEMBOLSO
      try {
        await integracionContablePrestamo.generarAsientoDesembolso(
          nuevoPrestamo,
          tx,
          data.creadoPor
        );
      } catch (err) {
        console.error('Error al generar asiento de desembolso:', err);
        // No fallar la transacción, solo registrar el error
      }

      return nuevoPrestamo;
    });

    // ⭐ ACTUALIZAR SALDOS DE LÍNEA DE CRÉDITO (SI ESTÁ VINCULADO)
    if (prestamo.lineaCreditoId) {
      await lineaCreditoService.actualizarSaldosLinea(prestamo.lineaCreditoId);
    }

    return await obtenerPorId(prestamo.id);
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un préstamo bancario existente.
 * Actualiza automáticamente los saldos de las líneas de crédito vinculadas (antigua y nueva si cambió).
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.prestamoBancario.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Préstamo bancario no encontrado");

    // Validar campos obligatorios con mensajes específicos
    const camposFaltantes = [];

    if (!data.empresaId) camposFaltantes.push("Empresa");
    if (!data.bancoId) camposFaltantes.push("Banco");
    if (!data.numeroPrestamo) camposFaltantes.push("Número de Préstamo");
    if (!data.fechaContrato) camposFaltantes.push("Fecha de Contrato");
    if (!data.fechaDesembolso) camposFaltantes.push("Fecha de Desembolso");
    if (!data.fechaVencimiento) camposFaltantes.push("Fecha de Vencimiento");
    if (!data.montoAprobado) camposFaltantes.push("Monto Aprobado");
    if (!data.montoDesembolsado) camposFaltantes.push("Monto Desembolsado");
    if (!data.monedaId) camposFaltantes.push("Moneda");
    if (!data.tasaInteresAnual) camposFaltantes.push("Tasa de Interés Anual");
    if (!data.plazoMeses) camposFaltantes.push("Plazo en Meses");
    if (!data.numeroCuotas) camposFaltantes.push("Número de Cuotas");
    if (!data.frecuenciaPago) camposFaltantes.push("Frecuencia de Pago");
    if (!data.tipoPrestamoId) camposFaltantes.push("Tipo de Préstamo");
    if (!data.tipoAmortizacion) camposFaltantes.push("Tipo de Amortización");
    if (!data.estadoId) camposFaltantes.push("Estado");

    if (camposFaltantes.length > 0) {
      throw new ValidationError(
        `Faltan los siguientes campos obligatorios: ${camposFaltantes.join(", ")}`,
      );
    }

    await validarPrestamoBancario({ ...data, id });

    // Calcular tipo de cambio SOLO si el usuario NO lo estableció manualmente
    let tipoCambioAplicado;
    
    // REGLA: Si el usuario envió un TC (cualquier valor), SIEMPRE respetarlo
    if (data.tipoCambioAplicado !== null && data.tipoCambioAplicado !== undefined) {
      // Usuario estableció un valor (puede ser 3.00, 3.361, etc.)
      tipoCambioAplicado = data.tipoCambioAplicado;
    } else if (data.fechaDesembolso && data.fechaDesembolso !== existente.fechaDesembolso) {
      // Usuario cambió la fecha pero no tiene TC, calcular
      const tc = await obtenerTipoCambio(new Date(data.fechaDesembolso));
      tipoCambioAplicado = tc.venta;
    } else {
      // No cambió nada, mantener el existente
      tipoCambioAplicado = existente.tipoCambioAplicado;
    }
    
    // Guardar lineaCreditoId anterior para actualizar saldos
    const lineaCreditoIdAnterior = existente.lineaCreditoId;

    const lineaCreditoIdNueva = data.lineaCreditoId;

    const prestamoActualizado = await prisma.prestamoBancario.update({
      where: { id },
      data: {
        ...data,
        tipoCambioAplicado: tipoCambioAplicado,
      },
      include: {
        empresa: true,
        banco: true,
        cuentaCorriente: true,
        moneda: true,
        estado: true,
        lineaCredito: true,
        tipoPrestamo: true,
        cuotas: {
          orderBy: { numeroCuota: "asc" },
        },
      },
    });

    // ⭐ ACTUALIZAR SALDOS DE LÍNEAS DE CRÉDITO
    // Si cambió la línea de crédito, actualizar ambas (antigua y nueva)
    if (
      lineaCreditoIdAnterior &&
      lineaCreditoIdAnterior !== lineaCreditoIdNueva
    ) {
      await lineaCreditoService.actualizarSaldosLinea(lineaCreditoIdAnterior);
    }
    if (lineaCreditoIdNueva) {
      await lineaCreditoService.actualizarSaldosLinea(lineaCreditoIdNueva);
    }

    return prestamoActualizado;
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
 * Elimina un préstamo bancario por ID.
 * Valida que no tenga cuotas pagadas y actualiza saldos de línea de crédito.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.prestamoBancario.findUnique({
      where: { id },
      include: {
        cuotas: true,
        desembolsos: true,
      },
    });

    if (!existente) throw new NotFoundError("Préstamo bancario no encontrado");

    // Validar que no tenga cuotas pagadas
    const cuotasPagadas = existente.cuotas.filter(
      (c) => c.estadoPago === "PAGADO" || c.estadoPago === "PARCIAL",
    );
    if (cuotasPagadas.length > 0) {
      throw new ConflictError(
        "No se puede eliminar el préstamo porque tiene cuotas pagadas.",
      );
    }

    // Validar que no tenga desembolsos registrados
    if (existente.desembolsos && existente.desembolsos.length > 0) {
      throw new ConflictError(
        "No se puede eliminar el préstamo porque tiene desembolsos registrados.",
      );
    }

    // Guardar lineaCreditoId antes de eliminar
    const lineaCreditoId = existente.lineaCreditoId;

    await prisma.prestamoBancario.delete({ where: { id } });

    // ⭐ ACTUALIZAR SALDOS DE LÍNEA DE CRÉDITO (SI ESTABA VINCULADO)
    if (lineaCreditoId) {
      await lineaCreditoService.actualizarSaldosLinea(lineaCreditoId);
    }

    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista préstamos por empresa.
 */
const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.prestamoBancario.findMany({
      where: { empresaId },
      include: {
        banco: true,
        moneda: true,
        estado: true,
        lineaCredito: true,
        tipoPrestamo: true,
        cuotas: {
          where: { estadoPago: "PENDIENTE" },
          orderBy: { fechaVencimiento: "asc" },
          take: 5,
        },
      },
      orderBy: { fechaContrato: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista préstamos vigentes.
 */
const listarVigentes = async () => {
  try {
    // Estados: 79=APROBADO, 80=DESEMBOLSADO, 81=VIGENTE
    return await prisma.prestamoBancario.findMany({
      where: {
        estadoId: { in: [79n, 80n, 81n] },
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        lineaCredito: true,
        tipoPrestamo: true,
      },
      orderBy: { fechaVencimiento: "asc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene el cronograma de cuotas de un préstamo.
 */
const obtenerCronograma = async (id) => {
  try {
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id },
      include: {
        cuotas: {
          orderBy: { numeroCuota: "asc" },
        },
      },
    });
    if (!prestamo) throw new NotFoundError("Préstamo bancario no encontrado");
    return prestamo.cuotas;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista préstamos bancarios SIN relaciones pesadas (cuotas, desembolsos, garantías).
 * Optimizado para carga rápida de lista en frontend.
 */
const listarSimple = async () => {
  try {
    return await prisma.prestamoBancario.findMany({
      include: {
        empresa: true,
        banco: true,
        cuentaCorriente: true,
        moneda: true,
        estado: true,
        lineaCredito: true,
        tipoPrestamo: true,
      },
      orderBy: { fechaContrato: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista préstamos bancarios por sublínea de crédito.
 * @param {BigInt} sublineaCreditoId - ID de la sublínea de crédito
 */
const listarPorSublinea = async (sublineaCreditoId) => {
  try {
    return await prisma.prestamoBancario.findMany({
      where: { sublineaCreditoId },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        tipoPrestamo: true,
        lineaCredito: {
          include: {
            moneda: true,
          },
        },
      },
      orderBy: { fechaDesembolso: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};
const obtenerDisponiblesParaSublinea = async (lineaCreditoId, tipoPrestamoId) => {
  try {
    const prestamos = await prisma.prestamoBancario.findMany({
      where: {
        lineaCreditoId: lineaCreditoId,
        sublineaCreditoId: null,
        tipoPrestamoId: tipoPrestamoId,
      },
      include: {
        estado: {
          select: {
            id: true,
            descripcion: true,
          },
        },
        tipoPrestamo: {
          select: {
            id: true,
            descripcion: true,
          },
        },
        moneda: {
          select: {
            id: true,
            codigoSunat: true,
            nombreLargo: true,  // ✅ CAMPO CORRECTO
            simbolo: true,
          },
        },
      },
      orderBy: {
        fechaDesembolso: 'desc',
      },
    });

    return prestamos;
  } catch (error) {
    console.error('Error al obtener préstamos disponibles:', error);
    throw error;
  }
};

const asignarASublinea = async (prestamoId, sublineaCreditoId) => {
  try {
    const prestamo = await prisma.prestamoBancario.update({
      where: { id: prestamoId },
      data: {
        sublineaCreditoId: sublineaCreditoId,
        actualizadoEn: new Date(),
      },
      include: {
        estado: true,
        tipoPrestamo: true,
        sublineaCredito: true,
      },
    });

    return prestamo;
  } catch (error) {
    console.error('Error al asignar préstamo a sublínea:', error);
    throw error;
  }
};

const desvincularDeSublinea = async (prestamoId) => {
  try {
    const prestamo = await prisma.prestamoBancario.update({
      where: { id: prestamoId },
      data: {
        sublineaCreditoId: null,
        actualizadoEn: new Date(),
      },
      include: {
        estado: true,
        tipoPrestamo: true,
      },
    });

    return prestamo;
  } catch (error) {
    console.error('Error al desvincular préstamo de sublínea:', error);
    throw error;
  }
};

export {
  // ... funciones existentes
  obtenerDisponiblesParaSublinea,
  asignarASublinea,
  desvincularDeSublinea,
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  listarVigentes,
  obtenerCronograma,
  listarSimple,
  listarPorSublinea,
  obtenerDisponiblesParaSublinea,
  asignarASublinea,
  desvincularDeSublinea
};
