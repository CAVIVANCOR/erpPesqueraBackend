import prisma from "../../config/prismaClient.js";
import { NotFoundError, DatabaseError } from "../../utils/errors.js";
import { buscarSubmoduloLetra, num, obtenerEstadosLetra, TOLERANCIA } from "./letraCambioBase.service.js";

/**
 * Consultas de letras de cambio: lista con saldos y detalle completo (facturas que respalda, pagos con sus
 * movimientos de caja, refinanciaciones y asientos del canje).
 */

const incluirLista = {
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  estado: { select: { id: true, descripcion: true, severityColor: true } },
  girado: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  beneficiario: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  empresa: { select: { id: true, razonSocial: true } },
  letraRenovada: { select: { id: true, numeroDocumento: true } },
};

/** Filtros: tipoLetra, empresaId, estadoId, entidadId (girado o beneficiario), soloPendientes ("true"). */
export async function listar({ tipoLetra, empresaId, estadoId, entidadId, soloPendientes } = {}) {
  try {
    const where = {
      ...(tipoLetra ? { tipoLetra } : {}),
      ...(empresaId ? { empresaId: BigInt(empresaId) } : {}),
      ...(estadoId ? { estadoId: BigInt(estadoId) } : {}),
      ...(entidadId ? { OR: [{ giradoId: BigInt(entidadId) }, { beneficiarioId: BigInt(entidadId) }] } : {}),
      ...(String(soloPendientes) === "true" ? { saldoCapital: { gt: 0 } } : {}),
    };
    return await prisma.letraCambio.findMany({
      where,
      include: incluirLista,
      orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
    });
  } catch (err) {
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar las letras de cambio", err.message);
    throw err;
  }
}

export async function obtenerDetalle(id, db = prisma) {
  try {
    const letra = await db.letraCambio.findUnique({
      where: { id: BigInt(id) },
      include: {
        ...incluirLista,
        aval: { select: { id: true, razonSocial: true, numeroDocumento: true } },
        documentos: {
          orderBy: { id: "asc" },
          include: {
            cuentaPorPagar: { select: { id: true, numeroOrdenCompra: true, montoTotal: true, tieneDetraccion: true, tieneRetencion: true, tienePercepcion: true, ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } } },
            cuentaPorCobrar: { select: { id: true, numeroPreFactura: true, montoTotal: true, tieneDetraccion: true, tieneRetencion: true, tienePercepcion: true, preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } } },
          },
        },
        pagos: {
          orderBy: [{ fechaPago: "asc" }, { id: "asc" }],
          include: { moneda: { select: { id: true, simbolo: true } }, medioPago: { select: { id: true, nombre: true } } },
        },
        renovaciones: { select: { id: true, numeroDocumento: true, fechaVencimiento: true, montoOriginal: true, saldoCapital: true, estado: { select: { id: true, descripcion: true, severityColor: true } } }, orderBy: { id: "asc" } },
      },
    });
    if (!letra) throw new NotFoundError("Letra de cambio no encontrada.");

    // Movimientos de caja de cada pago (principal, ITF y comisión): el correlativo se repite entre empresas
    const correlativos = letra.pagos.map((p) => p.refOperacionEspecializadaMovCaja).filter(Boolean);
    const movimientos = correlativos.length
      ? await db.movimientoCaja.findMany({
          where: { empresaId: letra.empresaId, refOperacionEspecializadaMovCaja: { in: correlativos } },
          include: {
            tipoMovimiento: { select: { id: true, nombre: true, esIngreso: true } },
            moneda: { select: { id: true, simbolo: true } },
            medioPago: { select: { id: true, nombre: true } },
            cuentaCorrienteOrigen: { select: { id: true, numeroCuenta: true, banco: { select: { nombre: true } } } },
            cuentaCorrienteDestino: { select: { id: true, numeroCuenta: true, banco: { select: { nombre: true } } } },
          },
          orderBy: { id: "asc" },
        })
      : [];
    const pagos = letra.pagos.map((p) => ({
      ...p,
      movimientos: movimientos.filter((m) => Number(m.refOperacionEspecializadaMovCaja) === Number(p.refOperacionEspecializadaMovCaja)),
    }));

    // Asientos del canje
    const submodulo = await buscarSubmoduloLetra(db).catch(() => null);
    const asientosCanje = submodulo
      ? await db.asientoContable.findMany({
          where: { submoduloOrigenId: submodulo.id, procesoOrigenId: letra.id, esSaldoInicial: false },
          select: { id: true, numeroAsiento: true, fechaAsiento: true, glosa: true, totalDebe: true, estadoId: true },
          orderBy: { id: "asc" },
        })
      : [];

    const estados = await obtenerEstadosLetra(db);
    const capitalPagado = num(letra.montoOriginal) - num(letra.saldoCapital);
    return {
      ...letra,
      pagos,
      asientosCanje,
      resumen: {
        capitalPagado: Math.max(0, capitalPagado),
        interesPagado: num(letra.interesPagado),
        moraPagada: num(letra.moraPagada),
        saldoCapital: num(letra.saldoCapital),
        puedeAnularCanje: letra.pagos.length === 0 && !letra.renovada && !letra.letraRenovadaId && !letra.protestada && Number(letra.estadoId) !== Number(estados.ANULADA),
        puedePagar: num(letra.saldoCapital) > TOLERANCIA && ![estados.PAGADA, estados.ANULADA, estados.REFINANCIADA].some((e) => Number(e) === Number(letra.estadoId)),
        puedeRefinanciar: num(letra.saldoCapital) > TOLERANCIA && ![estados.PAGADA, estados.ANULADA, estados.REFINANCIADA].some((e) => Number(e) === Number(letra.estadoId)),
      },
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar la letra de cambio", err.message);
    throw err;
  }
}

export default { listar, obtenerDetalle };
