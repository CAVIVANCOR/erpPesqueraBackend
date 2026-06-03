import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio para consulta de saldos de cuentas corrientes
 * Para vista de Tesorería - Panel de Saldos
 * Documentado en español.
 */

/**
 * Listar todas las cuentas corrientes con sus saldos actuales
 * @param {Object} filtros - Filtros opcionales
 * @param {BigInt} filtros.empresaId - ID de empresa
 * @param {BigInt} filtros.monedaId - ID de moneda
 * @param {Boolean} filtros.soloActivas - Solo cuentas activas (default: true)
 * @returns {Array} Lista de cuentas con saldos y tendencias
 */
const listarSaldosCuentas = async (filtros = {}) => {
  try {
    const { empresaId, monedaId, soloActivas = true } = filtros;

    const where = {};

    if (empresaId) {
      where.empresaId = Number(empresaId);
    }

    if (monedaId) {
      where.monedaId = Number(monedaId);
    }

    if (soloActivas) {
      where.activa = true;
    }

    const cuentas = await prisma.cuentaCorriente.findMany({
      where,
      include: {
        banco: {
          select: {
            id: true,
            nombre: true,
            codigoSwift: true,
          },
        },
        moneda: {
          select: {
            id: true,
            simbolo: true,
            codigoSunat: true,
          },
        },
        empresa: {
          select: {
            id: true,
            razonSocial: true,
            ruc: true,
          },
        },
        tipoCuentaCorriente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        saldos: {
          select: {
            id: true,
            saldoActual: true,
            fecha: true,
          },
          orderBy: {
            fecha: "desc",
          },
          take: 5,
        },
      },
      orderBy: [{ monedaId: "asc" }, { numeroCuenta: "asc" }],
    });

    const cuentasConSaldo = cuentas.map((cuenta) => {
      const saldoActual = cuenta.saldos?.[0]?.saldoActual || 0;
      const saldoAnterior = cuenta.saldos?.[1]?.saldoActual || saldoActual;

      let tendencia = 0;
      let tendenciaTexto = "ESTABLE";

      if (saldoAnterior !== 0) {
        tendencia = ((saldoActual - saldoAnterior) / saldoAnterior) * 100;

        if (tendencia > 0) {
          tendenciaTexto = "CRECIENTE";
        } else if (tendencia < 0) {
          tendenciaTexto = "DECRECIENTE";
        }
      }

      const fechaUltimoMovimiento = cuenta.saldos?.[0]?.fecha || null;

      return {
        id: cuenta.id,
        numeroCuenta: cuenta.numeroCuenta,
        numeroCuentaCCI: cuenta.numeroCuentaCCI,
        codigoSwift: cuenta.codigoSwift,
        descripcion: cuenta.descripcion, // ✅ AGREGAR ESTA LÍNEA
        banco: cuenta.banco,
        moneda: cuenta.moneda,
        empresa: cuenta.empresa,
        tipoCuentaCorriente: cuenta.tipoCuentaCorriente,
        saldoActual,
        tendencia: Number(tendencia.toFixed(2)),
        tendenciaTexto,
        fechaUltimoMovimiento,
        activa: cuenta.activa,
      };
    });

    return cuentasConSaldo;
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar saldos de cuentas",
        err.message,
      );
    }
    throw err;
  }
};

/**
 * Obtener saldo consolidado en una moneda base (USD)
 * @param {BigInt} empresaId - ID de empresa (opcional)
 * @returns {Object} Total consolidado con tipo de cambio
 */
const obtenerSaldoConsolidado = async (empresaId = null) => {
  try {
    const where = empresaId
      ? { empresaId: Number(empresaId), activa: true }
      : { activa: true };

    const cuentas = await prisma.cuentaCorriente.findMany({
      where,
      include: {
        moneda: {
          select: {
            id: true,
            simbolo: true,
            codigoSunat: true,
          },
        },
        saldos: {
          select: {
            saldoActual: true,
          },
          orderBy: {
            fecha: "desc",
          },
          take: 1,
        },
      },
    });

    // ✅ CORREGIDO: Usar tipo de cambio fijo (NO existe modelo TipoCambio)
    const tcVenta = 3.7; // Tipo de cambio fijo o puede venir de configuración

    let totalUSD = 0;
    const desglosePorMoneda = {};

    cuentas.forEach((cuenta) => {
      const saldo = cuenta.saldos?.[0]?.saldoActual || 0;
      const codigoMoneda = cuenta.moneda.codigoSunat;

      if (!desglosePorMoneda[codigoMoneda]) {
        desglosePorMoneda[codigoMoneda] = {
          moneda: cuenta.moneda,
          total: 0,
          cantidadCuentas: 0,
        };
      }
      desglosePorMoneda[codigoMoneda].total += Number(saldo);
      desglosePorMoneda[codigoMoneda].cantidadCuentas += 1;

      if (codigoMoneda === "USD") {
        totalUSD += Number(saldo);
      } else if (codigoMoneda === "PEN") {
        totalUSD += Number(saldo) / tcVenta;
      } else if (codigoMoneda === "EUR") {
        totalUSD += Number(saldo) * 1.08;
      }
    });

    return {
      totalConsolidadoUSD: Number(totalUSD.toFixed(2)),
      tipoCambioReferencia: {
        USD_PEN: tcVenta,
        USD_EUR: 0.93,
        fecha: new Date(), // ✅ CORREGIDO: Fecha actual
      },
      desglosePorMoneda: Object.values(desglosePorMoneda).map((d) => ({
        moneda: d.moneda,
        total: Number(d.total.toFixed(2)),
        cantidadCuentas: d.cantidadCuentas,
      })),
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al obtener saldo consolidado",
        err.message,
      );
    }
    throw err;
  }
};

/**
 * Obtener detalle de movimientos de una cuenta específica
 * @param {BigInt} cuentaCorrienteId - ID de cuenta corriente
 * @param {Number} limite - Cantidad de movimientos a retornar (default: 10)
 * @returns {Object} Cuenta con sus últimos movimientos
 */
const obtenerDetalleCuenta = async (cuentaCorrienteId, limite = 10) => {
  try {
    const cuenta = await prisma.cuentaCorriente.findUnique({
      where: { id: Number(cuentaCorrienteId) },
      include: {
        banco: true,
        moneda: true,
        empresa: true,
        tipoCuentaCorriente: true,
        saldos: {
          include: {
            movimientoCaja: {
              select: {
                id: true,
                monto: true,
                descripcion: true,
                fechaOperacionMovCaja: true,
                tipoMovimiento: {
                  select: {
                    id: true,
                    nombre: true,
                    esIngreso: true,
                  },
                },
                entidadComercial: {
                  select: {
                    id: true,
                    razonSocial: true,
                  },
                },
              },
            },
          },
          orderBy: {
            fecha: "desc",
          },
          take: limite,
        },
      },
    });

    if (!cuenta) {
      throw new NotFoundError("Cuenta corriente no encontrada");
    }

    return cuenta;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al obtener detalle de cuenta",
        err.message,
      );
    }
    throw err;
  }
};

export default {
  listarSaldosCuentas,
  obtenerSaldoConsolidado,
  obtenerDetalleCuenta,
};
