import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * ========================================
 * CONSTANTES DE ESTADOS - EstadoMultiFuncion
 * ========================================
 */

// 🔵 ESTADOS DE MOVIMIENTOS CAJA
const ESTADO_MOVIMIENTO_CAJA = {
  PENDIENTE: 20,
  VALIDADO: 21, // ✅ USAR ESTE
  ASIENTO_GENERADO: 22,
};

/**
 * Atender una asignación (Entrega de Fondos)
 * @param {Object} datos - Datos de la entrega
 * @returns {Object} Movimiento de caja creado
 */
const atenderAsignacion = async (datos) => {
  console.log("🟢 [SERVICE] Inicio atenderAsignacion");
  console.log("🟢 [SERVICE] Datos recibidos:", JSON.stringify(datos, null, 2));

  const {
    detMovsEntregaRendirId,
    cuentaCorrienteOrigenId,
    medioPagoId,
    monto,
    numeroOperacion,
    fechaEntrega,
    observaciones,
    usuarioId,
  } = datos;

  console.log("🟢 [SERVICE] Parámetros extraídos:");
  console.log("  - detMovsEntregaRendirId:", detMovsEntregaRendirId);
  console.log("  - cuentaCorrienteOrigenId:", cuentaCorrienteOrigenId);
  console.log("  - medioPagoId:", medioPagoId);
  console.log("  - monto:", monto);
  console.log("  - usuarioId:", usuarioId);

  try {
    // ========================================
    // VALIDACIONES PREVIAS
    // ========================================

    // Validar que exista el DetMovsEntregaRendir
    console.log("🟢 [SERVICE] Buscando DetMovsEntregaRendir con ID:", detMovsEntregaRendirId);

    const detMov = await prisma.detMovsEntregaRendir.findUnique({
      where: { id: BigInt(detMovsEntregaRendirId) },
      include: {
        responsable: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
          },
        },
        empresa: {
          select: {
            id: true,
            razonSocial: true,
            ruc: true,
          },
        },
        moneda: {
          select: {
            id: true,
            simbolo: true,
            codigoSunat: true,
          },
        },
        tipoMovimiento: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            esIngreso: true,
            categoria: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        moduloOrigen: {
          select: {
            id: true,
            nombre: true,
          },
        },
        embarcacion: {
          select: {
            id: true,
            activo: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!detMov) {
      console.error("❌ [SERVICE] Asignación no encontrada con ID:", detMovsEntregaRendirId);
      throw new NotFoundError("Asignación no encontrada");
    }

    console.log("✅ [SERVICE] Asignación encontrada:", detMov.id);

    // Validar que no esté ya validada
    if (detMov.validadoTesoreria) {
      throw new ValidationError("Esta asignación ya fue atendida");
    }

    // Validar monto
    console.log("🟢 [SERVICE] Validando monto:", monto, "tipo:", typeof monto);

    if (!monto || Number(monto) <= 0) {
      console.error("❌ [SERVICE] Monto inválido:", monto);
      throw new ValidationError("El monto debe ser mayor a cero");
    }

    if (Number(monto) > Number(detMov.monto)) {
      console.error("❌ [SERVICE] Monto excede el solicitado. Monto:", monto, "Solicitado:", detMov.monto);
      throw new ValidationError(
        `El monto a entregar (${detMov.moneda.simbolo} ${monto}) no puede ser mayor al monto solicitado (${detMov.moneda.simbolo} ${detMov.monto})`
      );
    }

    console.log("✅ [SERVICE] Monto válido:", monto);

    // Validar que sea una asignación (no gasto directo)
    if (
      detMov.formaParteCalculoEntregaARendir !== true ||
      detMov.entidadComercialId !== null
    ) {
      throw new ValidationError("Este registro no es una asignación válida");
    }

    // Validar que la cuenta corriente exista
    const cuentaCorriente = await prisma.cuentaCorriente.findUnique({
      where: { id: BigInt(cuentaCorrienteOrigenId) },
      include: {
        saldos: {
          where: {
            monedaId: detMov.monedaId,
          },
          orderBy: {
            fechaSaldo: "desc",
          },
          take: 1,
        },
      },
    });

    if (!cuentaCorriente) {
      throw new NotFoundError("Cuenta corriente no encontrada");
    }

    // Validar saldo suficiente
    const saldoActual = cuentaCorriente.saldos[0]?.saldo || 0;
    console.log("🟢 [SERVICE] Validando saldo. Saldo actual:", saldoActual, "Monto:", monto);

    if (Number(saldoActual) < Number(monto)) {
      console.error("❌ [SERVICE] Saldo insuficiente. Saldo:", saldoActual, "Monto:", monto);
      throw new ValidationError(
        `Saldo insuficiente. Saldo actual: ${detMov.moneda.simbolo} ${saldoActual}, Monto a entregar: ${detMov.moneda.simbolo} ${monto}`
      );
    }

    console.log("✅ [SERVICE] Saldo suficiente");

    // Obtener tipo de movimiento para EGRESO
    const tipoMovimientoEgreso = await prisma.tipoMovEntregaRendir.findFirst({
      where: { esIngreso: false },
    });

    if (!tipoMovimientoEgreso) {
      throw new NotFoundError(
        "Tipo de Movimiento EGRESO no encontrado en la base de datos"
      );
    }

    // Validar que existe el estado VALIDADO para MovimientoCaja
    const estadoValidado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: ESTADO_MOVIMIENTO_CAJA.VALIDADO },
    });

    if (!estadoValidado) {
      throw new NotFoundError(
        `Estado VALIDADO (ID: ${ESTADO_MOVIMIENTO_CAJA.VALIDADO}) no encontrado en EstadoMultiFuncion`
      );
    }

    // Construir descripción del movimiento
    const nombreResponsable = `${detMov.responsable.nombres} ${detMov.responsable.apellidos}`.trim();
    const descripcion =
      observaciones ||
      `Entrega de fondos a ${nombreResponsable} - ${detMov.tipoMovimiento.descripcion || detMov.tipoMovimiento.nombre}`;

    // ========================================
    // TRANSACCIÓN ATÓMICA
    // ========================================
    console.log("🟢 [SERVICE] Iniciando transacción...");

    const resultado = await prisma.$transaction(async (tx) => {
      // 1️⃣ CREAR MOVIMIENTO DE CAJA (EGRESO)
      console.log("🟢 [SERVICE] Creando MovimientoCaja...");

      const movimientoCaja = await tx.movimientoCaja.create({
        data: {
          empresaOrigenId: detMov.empresaId,
          tipoMovimientoId: tipoMovimientoEgreso.id,
          entidadComercialId: null, // No hay entidad comercial en asignaciones
          monto: Number(monto),
          monedaId: detMov.monedaId,
          descripcion: descripcion,
          medioPagoId: medioPagoId ? BigInt(medioPagoId) : null,
          usuarioId: usuarioId ? BigInt(usuarioId) : null,
          estadoId: ESTADO_MOVIMIENTO_CAJA.VALIDADO,
          cuentaCorrienteOrigenId: BigInt(cuentaCorrienteOrigenId),
          fechaOperacionMovCaja: fechaEntrega ? new Date(fechaEntrega) : new Date(),
          generarAsientoContable: true,
          asientosGenerados: false,

          // Trazabilidad
          moduloOrigenMotivoOperacionId: BigInt(16), // Módulo Tesorería
          origenMotivoOperacionId: detMov.id,
          fechaMotivoOperacion: new Date(),
          usuarioMotivoOperacionId: usuarioId ? BigInt(usuarioId) : null,

          // Número de operación si existe
          referenciaExtId: numeroOperacion || null,
        },
      });

      console.log("✅ [SERVICE] MovimientoCaja creado con ID:", movimientoCaja.id);

      // 2️⃣ ACTUALIZAR DetMovsEntregaRendir
      console.log("🟢 [SERVICE] Actualizando DetMovsEntregaRendir...");
      await tx.detMovsEntregaRendir.update({
        where: { id: BigInt(detMovsEntregaRendirId) },
        data: {
          monto: Number(montoEntregado),
          validadoTesoreria: true,
          operacionMovCajaId: movimientoCaja.id,
          fechaValidacionTesoreria: new Date(),
          fechaOperacionMovCaja: fechaEntrega ? new Date(fechaEntrega) : new Date(),
          urlComprobanteOperacionMovCaja: null, // Se puede agregar después
          actualizadoPorId: usuarioId ? BigInt(usuarioId) : null,
        },
      });

      console.log("✅ [SERVICE] DetMovsEntregaRendir actualizado");

      // 3️⃣ ACTUALIZAR SALDO DE CUENTA CORRIENTE
      console.log("🟢 [SERVICE] Actualizando saldo cuenta corriente...");
      const nuevoSaldo = Number(saldoActual) - Number(montoEntregado);
      await tx.saldoCuentaCorriente.create({
        data: {
          cuentaCorrienteId: BigInt(cuentaCorrienteOrigenId),
          monedaId: detMov.monedaId,
          saldo: nuevoSaldo,
          fechaSaldo: new Date(),
        },
      });

      console.log("✅ [SERVICE] Saldo actualizado");
      console.log("✅ [SERVICE] Transacción completada exitosamente");

      return movimientoCaja;
    });

    console.log("✅ [SERVICE] Operación completada exitosamente");

    return {
      success: true,
      message: `Fondos entregados exitosamente a ${nombreResponsable}`,
      data: resultado,
    };
  } catch (err) {
    console.error("❌ [SERVICE] Error capturado en atenderAsignacion:");
    console.error("❌ [SERVICE] Error name:", err.name);
    console.error("❌ [SERVICE] Error message:", err.message);
    console.error("❌ [SERVICE] Error stack:", err.stack);
    console.error("❌ [SERVICE] Error code:", err.code);
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al atender asignación",
        err.message
      );
    }
    throw err;
  }
};

export default {
  atenderAsignacion,
};