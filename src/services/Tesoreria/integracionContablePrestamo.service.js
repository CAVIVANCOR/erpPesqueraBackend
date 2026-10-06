import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import { ESTADO_ASIENTO_CONTABLE, ESTADO_CUOTA_PRESTAMO } from "../../utils/estados.constants.js";
import { SUBMODULO_ORIGEN } from "../../utils/submodulos.constants.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";

/**
 * Servicio de integración contable para Préstamos Bancarios
 * Genera asientos contables automáticos para:
 * - Desembolso de préstamo
 * - Pago de cuota (capital + interés)
 */
/**
 * Convierte monto a soles si el préstamo está en dólares
 */
const convertirMontoASoles = (monto, prestamo) => {
  const MONEDA_USD_ID = 2;
  if (Number(prestamo.monedaId) === MONEDA_USD_ID) {
    const montoConvertido = Number(monto) * Number(prestamo.tipoCambioAplicado);
    return Math.round(montoConvertido * 100) / 100;
  }
  return Math.round(Number(monto) * 100) / 100;
};
/**
 * Genera asiento contable para desembolso de préstamo
 * @param {Object} prestamo - Datos del préstamo
 * @param {Object} tx - Transacción de Prisma
 * @param {Number} creadoPor - ID del usuario
 * @returns {Promise<Object>} - Asiento contable creado
 */
async function generarAsientoPrestamoNuevo(prestamo, tx, creadoPor) {
  try {
    const fechaAsiento = prestamo.fechaContable || prestamo.fechaDesembolso;
    const periodo = await periodoContableService.obtenerPeriodoPorFecha(prestamo.empresaId, fechaAsiento);
    if (!periodo) {

      return null;
    }
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (76) no encontrado.");
    }
    // Determinar cuenta según moneda (1=MN, 2=ME)
    const codigoPrestamo = Number(prestamo.monedaId) === 1 ? "451101" : "451102";
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: codigoPrestamo, activo: true },
    });
    // Obtener cuenta contable de la cuenta corriente
    let cuentaCorriente = null;
    if (prestamo.cuentaCorrienteId) {
      cuentaCorriente = await tx.cuentaCorriente.findUnique({
        where: { id: prestamo.cuentaCorrienteId },
        include: { cuentaContable: true },
      });
    }

    // Cuenta 373101: Intereses No Devengados
    const cuentaInteresesNoDev = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: "373101", activo: true },
    });

    if (!cuentaPrestamo || !cuentaInteresesNoDev) {

      return null;
    }

    if (!cuentaCorriente?.cuentaContable) {

      return null;
    }

    // Calcular total de intereses del cronograma
    const cuotas = await tx.cuotaPrestamo.findMany({
      where: { prestamoBancarioId: prestamo.id },
    });
    const totalIntereses = cuotas.reduce((sum, c) => sum + Number(c.montoInteres), 0);

    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: { empresaId: prestamo.empresaId, periodoContableId: periodo.id },
      orderBy: { correlativo: "desc" },
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

    const montoDesembolso = Number(prestamo.montoDesembolsado);
    const montoNeto = montoDesembolso - totalIntereses;

    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: prestamo.fechaContable || prestamo.fechaDesembolso,
        glosa: `Desembolso de préstamo ${prestamo.numeroPrestamo} - ${prestamo.banco?.nombre || "Banco"}`,
        tipoLibro: "FISCAL",
        tipoLibroId: TIPO_LIBRO.DIARIO,
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenId: Number(prestamo.id),
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE),
        totalDebe: montoDesembolso,
        totalHaber: montoDesembolso,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        esSaldoInicial: prestamo.esSaldoInicial || false,
        esGerencial: false,
        creadoPor,
        prestamos: {
          connect: { id: Number(prestamo.id) }
        },
      },
    });
    const MONEDA_SOLES_ID = 1;

    const detalles = [
      {
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaCorriente.cuentaContable.id,
        glosa: `Desembolso Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
        debe: convertirMontoASoles(montoNeto, prestamo),
        haber: 0,
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: montoNeto,
        haberMonedaExtranjera: 0,
        submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenLineaId: Number(prestamo.id),
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaInteresesNoDev.id,
        glosa: `Intereses no devengados Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
        debe: convertirMontoASoles(totalIntereses, prestamo),
        haber: 0,
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: totalIntereses,
        haberMonedaExtranjera: 0,
        submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenLineaId: Number(prestamo.id),
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 3,
        planCuentaId: cuentaPrestamo.id,
        glosa: `Desembolso Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
        debe: 0,
        haber: convertirMontoASoles(montoDesembolso, prestamo),
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: 0,
        haberMonedaExtranjera: montoDesembolso,
        submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenLineaId: Number(prestamo.id),
        creadoPor,
      },
    ];

    await Promise.all(
      detalles.map((detalle) =>
        tx.detalleAsientoContable.create({ data: detalle }),
      ),
    );

    return await tx.asientoContable.findUnique({
      where: { id: asiento.id },
      include: {
        detalles: {
          include: {
            planCuenta: true,
            moneda: true,
          },
        },
        empresa: true,
        periodoContable: true,
        moneda: true,
        estado: true,
      },
    });

  } catch (err) {
    throw err;
  }
}

/**
 * Genera asiento de saldo inicial de préstamo
 * DEBE: 591101 (Utilidades Acumuladas) = Capital
 * HABER: 451101/451102 (Instituciones Financieras) = Capital
 */
async function generarAsientoSaldoInicial(prestamo, tx, creadoPor) {
  try {
    const fechaAsiento = prestamo.fechaContable || prestamo.fechaDesembolso;
    const periodo = await periodoContableService.obtenerPeriodoPorFecha(prestamo.empresaId, fechaAsiento);
    if (!periodo) {

      return null;
    }
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) throw new ValidationError("Estado PENDIENTE no encontrado");
    const codigoPrestamo = Number(prestamo.monedaId) === 1 ? "451101" : "451102";
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: codigoPrestamo, activo: true },
    });
    const cuentaUtilidades = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: "591101", activo: true },
    });
    if (!cuentaPrestamo || !cuentaUtilidades) {
      return null;
    }
    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodo.id,
      },
      orderBy: { correlativo: "desc" },
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;
    
    // ═══════════════════════════════════════════════════════════════════════
    // CÁLCULO DEL SALDO CAPITAL PARA SALDO INICIAL
    // ═══════════════════════════════════════════════════════════════════════
    // Para préstamos con esSaldoInicial=true, el asiento debe registrar
    // TODAS las cuotas IMPAGAS (sin importar fecha de vencimiento)
    // porque representan la deuda total pendiente al inicio del período
    // ═══════════════════════════════════════════════════════════════════════
    
    // Obtener todas las cuotas del préstamo
    const cuotas = await tx.cuotaPrestamo.findMany({
      where: { prestamoBancarioId: prestamo.id },
      orderBy: { numeroCuota: 'asc' }
    });
    
    // Filtrar cuotas IMPAGAS (no pagadas y no marcadas como saldo inicial pagado)
    const cuotasImpagas = cuotas.filter(c => {
      const noEstaPagada = Number(c.estadoCuotaId) !== ESTADO_CUOTA_PRESTAMO.PAGADO && !c.saldoInicialPagada;
      return noEstaPagada;
    });
    
    // Calcular capital de cuotas impagas
    const montoCapital = cuotasImpagas.reduce(
      (sum, c) => sum + Number(c.montoCapital || 0),
      0
    );
    
    // Si no hay cuotas impagas, no generar asiento
    if (montoCapital === 0 || cuotasImpagas.length === 0) {

      return null;
    }
    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: prestamo.fechaContable || prestamo.fechaDesembolso,
        glosa: `Saldo Inicial préstamo ${prestamo.numeroPrestamo} - ${prestamo.banco?.nombre || "Banco"}`,
        tipoLibro: "FISCAL",
        tipoLibroId: TIPO_LIBRO.DIARIO,
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenId: Number(prestamo.id),
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE),
        totalDebe: montoCapital,
        totalHaber: montoCapital,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        esSaldoInicial: prestamo.esSaldoInicial || false,
        creadoPor,
        prestamos: {
          connect: { id: Number(prestamo.id) }
        },
      },
    });
    // Convertir montos a SOLES para los detalles
    const MONEDA_SOLES_ID = 1;
    const montoCapitalSoles = convertirMontoASoles(montoCapital, prestamo);

    await Promise.all([
      tx.detalleAsientoContable.create({
        data: {
          asientoContableId: asiento.id,
          numeroLinea: 1,
          planCuentaId: cuentaUtilidades.id,
          glosa: `Saldo Inicial Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
          debe: montoCapitalSoles,
          haber: 0,
          monedaId: MONEDA_SOLES_ID,
          tipoCambio: prestamo.tipoCambioAplicado,
          debeMonedaExtranjera: montoCapital,
          haberMonedaExtranjera: 0,
          submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
          procesoOrigenLineaId: Number(prestamo.id),
          creadoPor,
        },
      }),
      tx.detalleAsientoContable.create({
        data: {
          asientoContableId: asiento.id,
          numeroLinea: 2,
          planCuentaId: cuentaPrestamo.id,
          glosa: `Saldo Inicial Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
          debe: 0,
          haber: montoCapitalSoles,
          monedaId: MONEDA_SOLES_ID,
          tipoCambio: prestamo.tipoCambioAplicado,
          debeMonedaExtranjera: 0,
          haberMonedaExtranjera: montoCapital,
          submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
          procesoOrigenLineaId: Number(prestamo.id),
          creadoPor,
        },
      }),
    ]);

    return await tx.asientoContable.findUnique({
      where: { id: asiento.id },
      include: {
        detalles: {
          include: {
            planCuenta: true,
            moneda: true,
          },
        },
        empresa: true,
        periodoContable: true,
        moneda: true,
        estado: true,
      },
    });
  } catch (err) {
    throw err;
  }
}



export default {
  generarAsientoPrestamoNuevo,
  generarAsientoSaldoInicial
};