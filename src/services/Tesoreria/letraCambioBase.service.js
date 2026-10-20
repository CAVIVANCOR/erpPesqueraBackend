import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { ESTADO_ASIENTO_CONTABLE, ESTADO_PERIODO_CONTABLE } from "../../utils/estados.constants.js";
import {
  ESTADOS_LETRA,
  TIPO_PROVIENE_DE_LETRA,
  TIPO_DOCUMENTO_LETRA,
  PREFIJO_NUMERO_LETRA,
  RUTA_SUBMODULO_LETRA,
  MONEDA_SOLES_ID,
} from "../../utils/letrasCambio.constants.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * BASE COMÚN DE LETRAS DE CAMBIO
 * ════════════════════════════════════════════════════════════════════════════
 * Helpers compartidos por canje, pago, refinanciación y proceso diario. Todos reciben el cliente (db / tx)
 * para ejecutarse dentro de la transacción de la operación.
 */

// ── Números ─────────────────────────────────────────────────
export const num = (valor) => Number(valor ?? 0);
export const r2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
export const aCentimos = (valor) => BigInt(Math.round(Number(valor) * 100));
export const deCentimos = (centimos) => Number(centimos) / 100;
export const TOLERANCIA = 0.01;

/** Reparte `totalCent` entre los pesos de forma proporcional (método del mayor resto): la suma es exacta. */
export const repartirProporcional = (pesosCent, totalCent) => {
  const suma = pesosCent.reduce((acc, p) => acc + p, 0n);
  if (suma === 0n) return pesosCent.map(() => 0n);
  const partes = pesosCent.map((p) => (totalCent * p) / suma);
  const restos = pesosCent.map((p) => (totalCent * p) % suma);
  let faltante = totalCent - partes.reduce((acc, p) => acc + p, 0n);
  const orden = restos
    .map((resto, indice) => ({ resto, indice }))
    .sort((a, b) => (a.resto === b.resto ? a.indice - b.indice : a.resto > b.resto ? -1 : 1));
  for (const { indice } of orden) {
    if (faltante <= 0n) break;
    partes[indice] += 1n;
    faltante -= 1n;
  }
  return partes;
};

// ── Fechas ──────────────────────────────────────────────────
/** Suma días hábiles (lunes a viernes) a una fecha. El sistema no maneja feriados. */
export const sumarDiasHabiles = (fecha, dias) => {
  const resultado = new Date(fecha);
  let restantes = dias;
  while (restantes > 0) {
    resultado.setUTCDate(resultado.getUTCDate() + 1);
    const dia = resultado.getUTCDay();
    if (dia !== 0 && dia !== 6) restantes--;
  }
  return resultado;
};

export const formatearFecha = (fecha) => {
  const f = new Date(fecha);
  return `${String(f.getUTCDate()).padStart(2, "0")}/${String(f.getUTCMonth() + 1).padStart(2, "0")}/${f.getUTCFullYear()}`;
};

// ── Datos base (se crean una sola vez si faltan) ────────────
/** IDs de los estados de la letra por clave (VIGENTE, VENCIDA, ...). Crea el tipo y los estados si no existen. */
export async function obtenerEstadosLetra(db) {
  let tipo = await db.tipoProvieneDe.findFirst({ where: { descripcion: TIPO_PROVIENE_DE_LETRA } });
  if (!tipo) tipo = await db.tipoProvieneDe.create({ data: { descripcion: TIPO_PROVIENE_DE_LETRA, updatedAt: new Date() } });

  const existentes = await db.estadoMultiFuncion.findMany({ where: { tipoProvieneDeId: tipo.id } });
  const resultado = {};
  for (const [clave, def] of Object.entries(ESTADOS_LETRA)) {
    let estado = existentes.find((e) => e.descripcion === def.descripcion);
    if (!estado) {
      estado = await db.estadoMultiFuncion.create({
        data: {
          descripcion: def.descripcion,
          severityColor: def.severityColor,
          tipoProvieneDeId: tipo.id,
          updatedAt: new Date(),
        },
      });
    }
    resultado[clave] = estado.id;
  }
  return resultado;
}

export async function obtenerTipoDocumentoLetra(db) {
  const existente = await db.tipoDocumento.findUnique({ where: { codigo: TIPO_DOCUMENTO_LETRA.codigo } });
  if (existente) return existente;
  return db.tipoDocumento.create({
    data: {
      codigo: TIPO_DOCUMENTO_LETRA.codigo,
      descripcion: TIPO_DOCUMENTO_LETRA.descripcion,
      esParaAlmacen: false,
      esParaCompras: false,
      esParaVentas: false,
      updatedAt: new Date(),
    },
  });
}

/** Número de la letra a partir de su id: LP-000001 (por pagar) / LC-000001 (por cobrar). */
export const numeroLetraDesdeId = (tipoLetra, id) => `${PREFIJO_NUMERO_LETRA[tipoLetra]}-${String(id).padStart(6, "0")}`;

export async function obtenerPersonalDeUsuario(db, usuarioId) {
  if (!usuarioId) return null;
  const usuario = await db.usuario.findUnique({ where: { id: BigInt(usuarioId) }, select: { personalId: true } });
  return usuario?.personalId || null;
}

export async function obtenerMedioPagoCanje(db, nombre) {
  const medio = await db.medioPago.findFirst({ where: { nombre } });
  if (!medio) {
    throw new ValidationError(`No existe el medio de pago "${nombre}". Créelo en el mantenimiento de medios de pago antes de continuar.`);
  }
  return medio;
}

// ── Contabilidad ────────────────────────────────────────────
export async function buscarSubmoduloLetra(db) {
  const submodulo = await db.submoduloSistema.findFirst({ where: { ruta: RUTA_SUBMODULO_LETRA, activo: true } });
  if (!submodulo) {
    throw new ValidationError(`No existe el submódulo con ruta '${RUTA_SUBMODULO_LETRA}'. Créelo en el mantenimiento de submódulos del sistema.`);
  }
  return submodulo;
}

/** Cuentas del plan por código. Si falta alguna lanza el detalle de las que hay que crear o activar. */
export async function obtenerCuentas(db, codigos) {
  const unicos = [...new Set(codigos)];
  const cuentas = await db.planCuentasContable.findMany({ where: { codigoCuenta: { in: unicos }, activo: true } });
  const faltantes = unicos.filter((c) => !cuentas.some((x) => x.codigoCuenta === c));
  if (faltantes.length > 0) {
    throw new ValidationError(`Faltan cuentas contables activas en el plan de cuentas: ${faltantes.join(", ")}. Créelas o actívelas para poder generar el asiento.`);
  }
  const porCodigo = (codigo) => cuentas.find((c) => c.codigoCuenta === codigo);
  return porCodigo;
}

/** Las cuentas de gasto exigen centro de costo: se informa cuál cuenta no lo tiene configurado. */
export function exigirCentroCosto(cuenta) {
  if (cuenta.requiereCentroCosto && !cuenta.centroCostoId) {
    throw new ValidationError(`La cuenta contable ${cuenta.codigoCuenta} (${cuenta.nombreCuenta}) exige centro de costo y no tiene uno asignado. Configúrelo en el plan de cuentas.`);
  }
  return cuenta.centroCostoId || null;
}

export async function obtenerPeriodoAbierto(db, empresaId, fecha, nombreEmpresa = "la empresa") {
  const f = new Date(fecha);
  const periodo = await db.periodoContable.findFirst({
    where: { empresaId: BigInt(empresaId), anio: f.getUTCFullYear(), mes: f.getUTCMonth() + 1 },
  });
  if (!periodo) {
    throw new ValidationError(`No existe el período contable ${f.getUTCMonth() + 1}/${f.getUTCFullYear()} de ${nombreEmpresa}. Créelo antes de registrar la operación.`);
  }
  if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
    throw new ValidationError(`El período contable ${periodo.mes}/${periodo.anio} de ${nombreEmpresa} no está abierto: no se pueden registrar asientos.`);
  }
  return periodo;
}

/**
 * Crea un asiento con N líneas ya en soles. Cada línea: { planCuentaId, debe, haber, debeME, haberME,
 * entidadComercialId, numeroDocumentoOrigen, fechaDocumentoOrigen, fechaVenceDocumentoOrigen, centroCostoId }.
 * La diferencia de redondeo se absorbe en la última línea del lado que corresponda.
 */
export async function crearAsientoLetra(tx, {
  empresaId,
  periodo,
  fecha,
  glosa,
  tipoLibroId,
  submodulo,
  procesoOrigenId,
  monedaId,
  tipoCambio,
  totalCabecera,
  lineas,
  usuarioId,
}) {
  const estadoPendiente = await tx.estadoMultiFuncion.findUnique({ where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) } });
  if (!estadoPendiente) throw new NotFoundError("No se encontró el estado PENDIENTE para asientos contables.");

  const totalDebe = r2(lineas.reduce((a, l) => a + num(l.debe), 0));
  const totalHaber = r2(lineas.reduce((a, l) => a + num(l.haber), 0));
  const diferencia = r2(totalDebe - totalHaber);
  if (Math.abs(diferencia) > 0.05) {
    throw new ValidationError(`El asiento no cuadra (debe ${totalDebe.toFixed(2)} / haber ${totalHaber.toFixed(2)}). Revise los montos de capital, interés y mora.`);
  }
  if (diferencia !== 0) {
    const ultima = [...lineas].reverse().find((l) => (diferencia > 0 ? num(l.haber) > 0 : num(l.debe) > 0));
    if (ultima) {
      if (diferencia > 0) ultima.haber = r2(num(ultima.haber) + diferencia);
      else ultima.debe = r2(num(ultima.debe) - diferencia);
    }
  }

  const ultimo = await tx.asientoContable.findFirst({
    where: { empresaId: BigInt(empresaId), periodoContableId: periodo.id },
    orderBy: { correlativo: "desc" },
  });
  const correlativo = (ultimo?.correlativo || 0) + 1;
  const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;
  const extranjera = Number(monedaId) !== MONEDA_SOLES_ID;
  const auditoria = usuarioId ? BigInt(usuarioId) : null;

  return tx.asientoContable.create({
    data: {
      empresaId: BigInt(empresaId),
      periodoContableId: periodo.id,
      numeroAsiento,
      correlativo,
      fechaAsiento: new Date(fecha),
      glosa,
      tipoLibro: "FISCAL",
      tipoLibroId,
      esGerencial: false,
      esSaldoInicial: false,
      origenAsiento: "AUTOMATICO",
      submoduloOrigenId: submodulo.id,
      procesoOrigenId: BigInt(procesoOrigenId),
      estadoId: estadoPendiente.id,
      totalDebe: totalCabecera ?? totalDebe,
      totalHaber: totalCabecera ?? totalDebe,
      diferencia: 0,
      estaCuadrado: true,
      monedaId: BigInt(monedaId),
      tipoCambio: extranjera ? tipoCambio : 1,
      creadoPor: auditoria,
      detalles: {
        create: lineas.map((l, i) => ({
          numeroLinea: i + 1,
          planCuentaId: l.planCuentaId,
          glosa: l.glosa || glosa,
          debe: r2(l.debe),
          haber: r2(l.haber),
          monedaId: MONEDA_SOLES_ID,
          tipoCambio: extranjera ? tipoCambio : 1,
          debeMonedaExtranjera: l.debeME ?? null,
          haberMonedaExtranjera: l.haberME ?? null,
          entidadComercialId: l.entidadComercialId ? BigInt(l.entidadComercialId) : null,
          tipoDocumentoOrigenId: null,
          numeroDocumentoOrigen: l.numeroDocumentoOrigen || null,
          fechaDocumentoOrigen: l.fechaDocumentoOrigen || null,
          fechaVenceDocumentoOrigen: l.fechaVenceDocumentoOrigen || null,
          centroCostoId: l.centroCostoId || null,
          submoduloOrigenLineaId: submodulo.id,
          procesoOrigenLineaId: BigInt(procesoOrigenId),
          creadoPor: auditoria,
        })),
      },
    },
  });
}
