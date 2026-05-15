import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { puedeEditarRegistroCerrado } from "../../utils/checkSuperUsuario.js";

/**
 * Servicio CRUD para EntregaARendir
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  // Convertir a BigInt para la búsqueda en Prisma
  const temporadaId = BigInt(data.temporadaPescaId);
  const responsableId = BigInt(data.respEntregaRendirId);
  const centroCostoIdBigInt = BigInt(data.centroCostoId);

  const [temporada, responsable, centroCosto] = await Promise.all([
    prisma.temporadaPesca.findUnique({ where: { id: temporadaId } }),
    prisma.personal.findUnique({ where: { id: responsableId } }),
    prisma.centroCosto.findUnique({ where: { id: centroCostoIdBigInt } }),
  ]);
  if (!temporada) throw new ValidationError("El temporadaPescaId no existe.");
  if (!responsable)
    throw new ValidationError("El respEntregaRendirId no existe.");
  if (!centroCosto) throw new ValidationError("El centroCostoId no existe.");
}

const listar = async () => {
  try {
    return await prisma.entregaARendir.findMany({
      include: {
        temporadaPesca: true,
        respLiquidacion: true, // Personal que aprobó la liquidación
        respEntregaRendir: true, // Personal responsable de la entrega
        centroCosto: true, // Centro de costo
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendir.findUnique({
      where: { id },
      include: {
        temporadaPesca: true,
        respLiquidacion: true, // Personal que aprobó la liquidación
        respEntregaRendir: true, // Personal responsable de la entrega
        centroCosto: true, // Centro de costo
      },
    });
    if (!entrega) throw new NotFoundError("EntregaARendir no encontrada");
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = [
      "temporadaPescaId",
      "respEntregaRendirId",
      "centroCostoId",
    ];
    for (const campo of obligatorios) {
      if (typeof data[campo] === "undefined" || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);

    // Preparar datos con campos opcionales explícitos
    const datosNormalizados = {
      temporadaPescaId: BigInt(data.temporadaPescaId),
      respEntregaRendirId: BigInt(data.respEntregaRendirId),
      centroCostoId: BigInt(data.centroCostoId),
      entregaLiquidada: data.entregaLiquidada || false,
      fechaLiquidacion: data.fechaLiquidacion || null,
      respLiquidacionId: data.respLiquidacionId
        ? BigInt(data.respLiquidacionId)
        : null,
      urlLiquidacionPdf: data.urlLiquidacionPdf || null,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };

    return await prisma.entregaARendir.create({
      data: datosNormalizados,
      include: {
        temporadaPesca: true,
        respLiquidacion: true,
        respEntregaRendir: true,
        centroCosto: true,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data, usuarioId = null) => {
  try {
    const existente = await prisma.entregaARendir.findUnique({
      where: { id },
      include: {
        temporadaPesca: {
          include: {
            estadoTemporada: true,
          },
        },
      },
    });
    if (!existente) throw new NotFoundError("EntregaARendir no encontrada");

    // ========================================
    // ⭐ VALIDACIÓN DE PERMISOS PARA EDITAR
    // ========================================
    const estadosCerrados = await prisma.estadoMultiFuncion.findMany({
      where: {
        tipoProvieneDeId: 4, // Temporada Pesca
        descripcion: { in: ["FINALIZADA", "CANCELADA"] },
        cesado: false,
      },
      select: { id: true },
    });

    const idsEstadosCerrados = estadosCerrados.map((e) => e.id);

    const puedeEditar = await puedeEditarRegistroCerrado(
      usuarioId,
      existente.temporadaPesca.estadoTemporadaId,
      idsEstadosCerrados,
    );

    if (!puedeEditar) {
      throw new ValidationError(
        `No se puede editar la entrega a rendir porque la temporada está en estado "${existente.temporadaPesca?.estadoTemporada?.descripcion}". ` +
          `Solo los superusuarios pueden editar entregas de temporadas finalizadas o canceladas.`,
      );
    }

    // Validar claves foráneas si cambian
    const claves = ["temporadaPescaId", "respEntregaRendirId", "centroCostoId"];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Preparar datos con SOLO campos escalares permitidos
    const datosActualizacion = {
      temporadaPescaId: data.temporadaPescaId,
      respEntregaRendirId: data.respEntregaRendirId,
      centroCostoId: data.centroCostoId,
      entregaLiquidada: data.entregaLiquidada,
      fechaLiquidacion: data.fechaLiquidacion,
      respLiquidacionId: data.respLiquidacionId,
      urlLiquidacionPdf: data.urlLiquidacionPdf,
      fechaCreacion: data.fechaCreacion,
      fechaActualizacion: new Date(),
    };

    return await prisma.entregaARendir.update({
      where: { id },
      data: datosActualizacion,
      include: {
        temporadaPesca: true,
        respLiquidacion: true,
        respEntregaRendir: true,
        centroCosto: true,
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

const eliminar = async (id) => {
  try {
    const existente = await prisma.entregaARendir.findUnique({
      where: { id },
      include: { movimientos: true },
    });
    if (!existente) throw new NotFoundError("EntregaARendir no encontrada");
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError(
        "No se puede eliminar porque tiene movimientos asociados.",
      );
    }
    await prisma.entregaARendir.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const liquidarEntregaARendir = async (
  id,
  urlLiquidacionPdf,
  usuarioId,
  permitirRegeneracion = false,
) => {
  try {
    const entregaARendir = await prisma.entregaARendir.findUnique({
      where: { id },
      include: {
        movimientos: {
          where: {
            formaParteCalculoEntregaARendir: true,
          },
        },
      },
    });

    if (!entregaARendir) {
      throw new NotFoundError("EntregaARendir no encontrada");
    }

    // ⭐ PERMITIR REGENERAR SI VIENE EL FLAG
    if (entregaARendir.entregaLiquidada && !permitirRegeneracion) {
      throw new ValidationError(
        "Esta Entrega a Rendir ya está liquidada. Solo usuarios con permiso pueden regenerar la liquidación.",
      );
    }

    // ⭐ CALCULAR SALDOS INICIAL Y FINAL PARA CADA ASIGNACIÓN PRINCIPAL
    const asignacionesPrincipales = entregaARendir.movimientos
      .filter((mov) => !mov.asignacionOrigenId || mov.asignacionOrigenId === 0n)
      .sort(
        (a, b) => new Date(a.fechaMovimiento) - new Date(b.fechaMovimiento),
      );

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🔍 LIQUIDACIÓN INICIADA");
    console.log("📋 Total movimientos:", entregaARendir.movimientos.length);
    console.log(
      "📋 Asignaciones principales encontradas:",
      asignacionesPrincipales.length,
    );
    console.log("═══════════════════════════════════════════════════════\n");

    const saldosCalculados = {};
    const saldosIniciales = {};

    for (const asignacion of asignacionesPrincipales) {
      console.log("───────────────────────────────────────────────────────");
      console.log("🔍 PROCESANDO ASIGNACIÓN:", {
        id: asignacion.id.toString(),
        responsableId: asignacion.responsableId.toString(),
        fechaMovimiento: asignacion.fechaMovimiento,
        monto: asignacion.monto,
        asignacionOrigenId: asignacion.asignacionOrigenId,
      });

      // ⭐ CALCULAR SALDO INICIAL
      const saldoInicial = Number(asignacion.saldoInicialAsignacion) || 0;
      saldosIniciales[asignacion.id.toString()] = saldoInicial;

      console.log("💰 SALDO INICIAL (de BD):", saldoInicial);

      // Obtener gastos asociados a esta asignación
      const gastosAsociados = entregaARendir.movimientos.filter(
        (mov) =>
          mov.asignacionOrigenId && mov.asignacionOrigenId === asignacion.id,
      );

      console.log("📋 GASTOS ASOCIADOS:", {
        cantidad: gastosAsociados.length,
        gastos: gastosAsociados.map((g) => ({
          id: g.id.toString(),
          descripcion: g.descripcion,
          monto: Number(g.monto),
        })),
      });

      // Calcular totales
      const montoAsignado = Number(asignacion.monto) || 0;
      const totalGastado = gastosAsociados.reduce(
        (sum, gasto) => sum + Number(gasto.monto || 0),
        0,
      );

      console.log("🧮 CÁLCULO:", {
        saldoInicial,
        montoAsignado,
        totalGastado,
        formula: `${saldoInicial} + ${montoAsignado} - ${totalGastado}`,
      });

      // ⭐ SALDO FINAL = Saldo Inicial + Monto Asignado - Total Gastado
      const saldoFinal = saldoInicial + montoAsignado - totalGastado;
      saldosCalculados[asignacion.id.toString()] = saldoFinal;

      console.log("✅ SALDO FINAL CALCULADO:", saldoFinal);
    }

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("📊 RESUMEN DE CÁLCULOS:");
    console.log("saldosIniciales:", saldosIniciales);
    console.log("saldosCalculados:", saldosCalculados);
    console.log("═══════════════════════════════════════════════════════\n");

    const fechaLiquidacion = new Date();

    console.log("🔄 INICIANDO TRANSACCIÓN...\n");

    await prisma.$transaction(async (tx) => {
      // Actualizar EntregaARendir
      await tx.entregaARendir.update({
        where: { id },
        data: {
          entregaLiquidada: true,
          fechaLiquidacion: fechaLiquidacion,
          urlLiquidacionPdf: urlLiquidacionPdf,
          respLiquidacionId: usuarioId,
          fechaActualizacion: fechaLiquidacion,
        },
      });

      console.log("✅ EntregaARendir actualizada");

      // Actualizar TODOS los movimientos
      await tx.detMovsEntregaRendir.updateMany({
        where: {
          entregaARendirId: id,
          formaParteCalculoEntregaARendir: true,
        },
        data: {
          entregaARendirLiquidada: true,
          fechaLiquidacionEntregaARendir: fechaLiquidacion,
          urlLiquidacionEntregaARendir: urlLiquidacionPdf,
          actualizadoEn: fechaLiquidacion,
        },
      });

      console.log("✅ Movimientos marcados como liquidados");

      // ⭐ ACTUALIZAR SALDO INICIAL Y SALDO FINAL DE CADA ASIGNACIÓN PRINCIPAL
      console.log("\n💾 GUARDANDO SALDOS EN BD...");

      for (const [asignacionId, saldoFinal] of Object.entries(
        saldosCalculados,
      )) {
        const saldoInicial = saldosIniciales[asignacionId];

        console.log(`\n📝 Actualizando asignación ${asignacionId}:`);
        console.log("   Datos a guardar:", {
          saldoInicial,
          saldoFinal,
        });

        const resultado = await tx.detMovsEntregaRendir.update({
          where: { id: BigInt(asignacionId) },
          data: {
            saldoInicialAsignacion: saldoInicial,
            saldoFinalAsignacion: saldoFinal,
            actualizadoEn: fechaLiquidacion,
          },
        });

        console.log("   ✅ GUARDADO EN BD:", {
          id: resultado.id.toString(),
          saldoInicialAsignacion: resultado.saldoInicialAsignacion?.toString(),
          saldoFinalAsignacion: resultado.saldoFinalAsignacion?.toString(),
        });
      }

      console.log("\n✅ TRANSACCIÓN COMPLETADA");
    });

    const movimientosActualizados = entregaARendir.movimientos.length;

    console.log("\n🎉 LIQUIDACIÓN FINALIZADA EXITOSAMENTE");
    console.log("═══════════════════════════════════════════════════════\n");

    return {
      success: true,
      movimientosActualizados,
      fechaLiquidacion,
      saldosCalculados,
    };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
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
  liquidarEntregaARendir,
};
