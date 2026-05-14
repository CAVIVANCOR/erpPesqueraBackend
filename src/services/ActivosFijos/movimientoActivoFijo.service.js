import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import lineaCreditoService from "../Tesoreria/lineaCredito.service.js";

const { obtenerTipoCambio } = lineaCreditoService;

/**
 * Servicio CRUD para MovimientoActivoFijo
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del movimiento
 */
async function validarForaneas(data) {
  // Validar empresaId
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa)
      throw new ValidationError("La empresa referenciada no existe.");
  }
  // Validar activoId
  if (data.activoId !== undefined && data.activoId !== null) {
    const activo = await prisma.activo.findUnique({
      where: { id: data.activoId },
    });
    if (!activo)
      throw new ValidationError("El activo fijo referenciado no existe.");
  }
  // Validar tipoMovimientoId
  if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
    const tipo = await prisma.tipoMovimientoActivoFijo.findUnique({
      where: { id: data.tipoMovimientoId },
    });
    if (!tipo)
      throw new ValidationError(
        "El tipo de movimiento referenciado no existe.",
      );
  }
  // Validar periodoContableId (obligatorio)
  if (data.periodoContableId !== undefined && data.periodoContableId !== null) {
    const periodo = await prisma.periodoContable.findUnique({
      where: { id: data.periodoContableId },
    });
    if (!periodo)
      throw new ValidationError("El período contable referenciado no existe.");

    // Validar que el período esté ABIERTO (estadoId = 73)
    if (Number(periodo.estadoId) !== 73) {
      throw new ValidationError(
        "El período contable debe estar ABIERTO para registrar movimientos.",
      );
    }
  }
  // Validar monedaId
  if (data.monedaId !== undefined && data.monedaId !== null) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) throw new ValidationError("La moneda referenciada no existe.");
  }
  // Validar centroCostoId (opcional)
  if (data.centroCostoId !== undefined && data.centroCostoId !== null) {
    const centroCosto = await prisma.centroCosto.findUnique({
      where: { id: data.centroCostoId },
    });
    if (!centroCosto)
      throw new ValidationError("El centro de costo referenciado no existe.");
  }
  // Validar asientoContableId (opcional)
  if (data.asientoContableId !== undefined && data.asientoContableId !== null) {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id: data.asientoContableId },
    });
    if (!asiento)
      throw new ValidationError("El asiento contable referenciado no existe.");
  }
}

/**
 * Lista todos los movimientos de activos fijos.
 */
const listar = async () => {
  try {
    return await prisma.movimientoActivoFijo.findMany({
      include: {
        empresa: true,
        activo: {
          include: {
            tipo: true,
          },
        },
        tipoMovimiento: true,
        periodoContable: true,
        moneda: true,
        centroCosto: true,
        asientoContable: true,
      },
      orderBy: { fechaMovimiento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene un movimiento por ID (incluyendo todas las relaciones).
 */
const obtenerPorId = async (id) => {
  try {
    const mov = await prisma.movimientoActivoFijo.findUnique({
      where: { id },
      include: {
        empresa: true,
        activo: {
          include: {
            tipo: true,
          },
        },
        tipoMovimiento: true,
        periodoContable: true,
        moneda: true,
        centroCosto: true,
        asientoContable: true,
      },
    });
    if (!mov) throw new NotFoundError("MovimientoActivoFijo no encontrado");
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea un movimiento validando claves foráneas.
 */
const crear = async (data) => {
  try {
    // Validaciones de campos obligatorios
    if (!data.empresaId)
      throw new ValidationError("El campo empresaId es obligatorio.");
    if (!data.activoId)
      throw new ValidationError("El campo activoId es obligatorio.");
    if (!data.tipoMovimientoId)
      throw new ValidationError("El campo tipoMovimientoId es obligatorio.");
    if (!data.periodoContableId)
      throw new ValidationError("El campo periodoContableId es obligatorio.");
    if (!data.fechaMovimiento)
      throw new ValidationError("El campo fechaMovimiento es obligatorio.");
    if (!data.monto)
      throw new ValidationError("El campo monto es obligatorio.");
    if (!data.monedaId)
      throw new ValidationError("El campo monedaId es obligatorio.");
    if (!data.creadoPor)
      throw new ValidationError("El campo creadoPor es obligatorio.");
    if (!data.actualizadoPor)
      throw new ValidationError("El campo actualizadoPor es obligatorio.");

    await validarForaneas(data);

    // Preparar datos para creación
    const dataCreacion = {
      empresaId: data.empresaId,
      activoId: data.activoId,
      tipoMovimientoId: data.tipoMovimientoId,
      periodoContableId: data.periodoContableId,
      fechaMovimiento: new Date(data.fechaMovimiento),
      fechaContable: data.fechaContable ? new Date(data.fechaContable) : null,
      monto: data.monto,
      monedaId: data.monedaId,
      depreciacionMensual: data.depreciacionMensual || null,
      depreciacionAcumulada: data.depreciacionAcumulada || null,
      valorNeto: data.valorNeto || null,
      observaciones: data.observaciones || null,
      centroCostoId: data.centroCostoId || null,
      asientoContableId: data.asientoContableId || null,
      creadoPor: data.creadoPor,
      actualizadoPor: data.actualizadoPor,
      updatedAt: new Date(),
    };

    return await prisma.movimientoActivoFijo.create({
      data: dataCreacion,
      include: {
        empresa: true,
        activo: {
          include: {
            tipo: true,
          },
        },
        tipoMovimiento: true,
        periodoContable: true,
        moneda: true,
        centroCosto: true,
        asientoContable: true,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento existente, validando existencia y claves foráneas.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movimientoActivoFijo.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("MovimientoActivoFijo no encontrado");

    // No permitir actualizar si ya tiene asiento contable
    if (existente.asientoContableId && data.asientoContableId === undefined) {
      throw new ValidationError(
        "No se puede modificar un movimiento que ya tiene asiento contable generado.",
      );
    }

    await validarForaneas(data);

    // Preparar datos para actualización
    const dataActualizacion = {};
    if (data.empresaId !== undefined)
      dataActualizacion.empresaId = data.empresaId;
    if (data.activoId !== undefined) dataActualizacion.activoId = data.activoId;
    if (data.tipoMovimientoId !== undefined)
      dataActualizacion.tipoMovimientoId = data.tipoMovimientoId;
    if (data.periodoContableId !== undefined)
      dataActualizacion.periodoContableId = data.periodoContableId;
    if (data.fechaMovimiento !== undefined)
      dataActualizacion.fechaMovimiento = new Date(data.fechaMovimiento);
    if (data.fechaContable !== undefined)
      dataActualizacion.fechaContable = data.fechaContable
        ? new Date(data.fechaContable)
        : null;
    if (data.monto !== undefined) dataActualizacion.monto = data.monto;
    if (data.monedaId !== undefined) dataActualizacion.monedaId = data.monedaId;
    if (data.depreciacionMensual !== undefined)
      dataActualizacion.depreciacionMensual = data.depreciacionMensual;
    if (data.depreciacionAcumulada !== undefined)
      dataActualizacion.depreciacionAcumulada = data.depreciacionAcumulada;
    if (data.valorNeto !== undefined)
      dataActualizacion.valorNeto = data.valorNeto;
    if (data.observaciones !== undefined)
      dataActualizacion.observaciones = data.observaciones;
    if (data.centroCostoId !== undefined)
      dataActualizacion.centroCostoId = data.centroCostoId;
    if (data.asientoContableId !== undefined)
      dataActualizacion.asientoContableId = data.asientoContableId;
    if (data.actualizadoPor !== undefined)
      dataActualizacion.actualizadoPor = data.actualizadoPor;
    dataActualizacion.updatedAt = new Date();

    return await prisma.movimientoActivoFijo.update({
      where: { id },
      data: dataActualizacion,
      include: {
        empresa: true,
        activo: {
          include: {
            tipo: true,
          },
        },
        tipoMovimiento: true,
        periodoContable: true,
        moneda: true,
        centroCosto: true,
        asientoContable: true,
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

/**
 * Elimina un movimiento por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.movimientoActivoFijo.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("MovimientoActivoFijo no encontrado");

    // No permitir eliminar si ya tiene asiento contable
    if (existente.asientoContableId) {
      throw new ValidationError(
        "No se puede eliminar un movimiento que ya tiene asiento contable generado.",
      );
    }

    await prisma.movimientoActivoFijo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Lista movimientos por activo.
 */
const listarPorActivo = async (activoId) => {
  try {
    return await prisma.movimientoActivoFijo.findMany({
      where: { activoId },
      include: {
        empresa: true,
        activo: {
          include: {
            tipo: true,
          },
        },
        tipoMovimiento: true,
        periodoContable: true,
        moneda: true,
        centroCosto: true,
        asientoContable: true,
      },
      orderBy: { fechaMovimiento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Genera un BORRADOR de asiento contable para un movimiento de activo fijo.
 * El usuario podrá revisar y modificar las cuentas antes de guardarlo.
 * @param {BigInt} movimientoId - ID del movimiento
 * @returns {Promise<Object>} - Borrador del asiento contable
 */
const generarBorradorAsiento = async (movimientoId) => {
  try {
    const movimiento = await prisma.movimientoActivoFijo.findUnique({
      where: { id: movimientoId },
      include: {
        empresa: true,
        activo: {
          include: {
            tipo: {
              include: {
                cuentaActivo: true,
                cuentaDepreciacion: true,
                cuentaDepreciacionAcumulada: true,
              },
            },
          },
        },
        tipoMovimiento: true,
        periodoContable: true,
        moneda: true,
        centroCosto: true,
      },
    });

    if (!movimiento) {
      throw new NotFoundError("Movimiento de activo fijo no encontrado");
    }

    if (movimiento.asientoContableId) {
      throw new ValidationError(
        "Este movimiento ya tiene un asiento contable generado",
      );
    }

    const tipoActivo = movimiento.activo?.tipo;
    if (!tipoActivo) {
      throw new ValidationError(
        "El activo no tiene un tipo de activo configurado",
      );
    }

    if (!tipoActivo.cuentaActivoId || !tipoActivo.cuentaActivo) {
      throw new ValidationError(
        "El tipo de activo no tiene configurada la cuenta contable de activo. " +
          "Configure las cuentas contables en el tipo de activo antes de generar el asiento.",
      );
    }

    // Usar el período contable del movimiento
    const periodoContable = movimiento.periodoContable;
    if (!periodoContable) {
      throw new ValidationError(
        "El movimiento no tiene un período contable asignado.",
      );
    }

    // Validar que el período esté ABIERTO
    if (Number(periodoContable.estadoId) !== 73) {
      throw new ValidationError(
        "El período contable debe estar ABIERTO para generar asientos.",
      );
    }

    const monto = Number(movimiento.monto);
    const tipoMovimientoNombre = movimiento.tipoMovimiento?.nombre || "";
    const activoNombre = movimiento.activo?.nombre || "";
    const centroCostoId = movimiento.centroCostoId || null;

    const borrador = {
      empresaId: movimiento.empresaId,
      periodoContableId: periodoContable.id,
      fechaAsiento: movimiento.fechaContable || movimiento.fechaMovimiento,
      glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
      tipoLibro: "FISCAL",
      origenAsiento: "AUTOMATICO",
      monedaId: movimiento.monedaId,
      detalles: [],
    };

    const tipoMovimientoNombreLower = tipoMovimientoNombre.toLowerCase();

    if (
      tipoMovimientoNombreLower.includes("compra") ||
      tipoMovimientoNombreLower.includes("saldo inicial")
    ) {
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

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaActivoId,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: monto,
          haber: 0,
          centroCostoId: centroCostoId,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaContrapartida.id,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null,
        },
      ];
    } else if (tipoMovimientoNombreLower.includes("depreciación")) {
      if (
        !tipoActivo.cuentaDepreciacionId ||
        !tipoActivo.cuentaDepreciacionAcumuladaId
      ) {
        throw new ValidationError(
          "El tipo de activo no tiene configuradas las cuentas de depreciación. " +
            "Configure las cuentas contables en el tipo de activo antes de generar el asiento.",
        );
      }

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaDepreciacionId,
          glosa: `Depreciación ${activoNombre}`,
          debe: monto,
          haber: 0,
          centroCostoId: centroCostoId,
        },
        {
          numeroLinea: 2,
          planCuentaId: tipoActivo.cuentaDepreciacionAcumuladaId,
          glosa: `Depreciación acumulada ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null,
        },
      ];
    } else if (
      tipoMovimientoNombreLower.includes("venta") ||
      tipoMovimientoNombreLower.includes("baja")
    ) {
      const depreciacionAcumulada = Number(
        movimiento.depreciacionAcumulada || 0,
      );
      const valorNeto = Number(movimiento.valorNeto || 0);

      if (!tipoActivo.cuentaDepreciacionAcumuladaId) {
        throw new ValidationError(
          "El tipo de activo no tiene configurada la cuenta de depreciación acumulada. " +
            "Configure las cuentas contables en el tipo de activo antes de generar el asiento.",
        );
      }

      const cuentaPerdidaGanancia = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: { startsWith: "655" },
          activo: true,
        },
      });

      if (!cuentaPerdidaGanancia) {
        throw new ValidationError(
          "No se encontró la cuenta de Pérdida en Venta de Activos (655)",
        );
      }

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaDepreciacionAcumuladaId,
          glosa: `${tipoMovimientoNombre} - Depreciación acumulada ${activoNombre}`,
          debe: depreciacionAcumulada,
          haber: 0,
          centroCostoId: null,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaPerdidaGanancia.id,
          glosa: `${tipoMovimientoNombre} - Valor neto ${activoNombre}`,
          debe: valorNeto,
          haber: 0,
          centroCostoId: centroCostoId,
        },
        {
          numeroLinea: 3,
          planCuentaId: tipoActivo.cuentaActivoId,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null,
        },
      ];
    } else {
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

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaActivoId,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: monto,
          haber: 0,
          centroCostoId: centroCostoId,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaContrapartida.id,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null,
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
 * Guarda el asiento contable editado por el usuario y lo vincula al movimiento.
 * Si ya existe un asiento PENDIENTE o con estado incorrecto, lo actualiza (regeneración).
 * @param {BigInt} movimientoId - ID del movimiento
 * @param {Object} asientoData - Datos del asiento editado por el usuario
 * @param {BigInt} creadoPor - ID del usuario que crea el asiento
 * @returns {Promise<Object>} - Asiento contable creado o actualizado
 */
const guardarAsientoContable = async (movimientoId, asientoData, creadoPor) => {
  try {
    const movimiento = await prisma.movimientoActivoFijo.findUnique({
      where: { id: movimientoId },
      include: {
        periodoContable: true,
        asientoContable: true,
      },
    });

    if (!movimiento) {
      throw new NotFoundError("Movimiento no encontrado");
    }

    // Validar que el período esté ABIERTO
    if (Number(movimiento.periodoContable.estadoId) !== 73) {
      throw new ValidationError(
        "El período contable debe estar ABIERTO para generar o regenerar asientos.",
      );
    }

       // Obtener el estado PENDIENTE para Asientos Contables
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

    // No validar el estado del asiento existente
    // Solo se valida que el período contable esté ABIERTO (ya validado arriba)

    // Usar el período contable del movimiento
    const periodoContableId = movimiento.periodoContableId;

    const totalDebe = asientoData.detalles.reduce(
      (sum, d) => sum + Number(d.debe || 0),
      0,
    );
    const totalHaber = asientoData.detalles.reduce(
      (sum, d) => sum + Number(d.haber || 0),
      0,
    );
    const diferencia = Math.abs(totalDebe - totalHaber);

    if (diferencia > 0.01) {
      throw new ValidationError(
        `El asiento no está balanceado. Debe: ${totalDebe.toFixed(2)}, Haber: ${totalHaber.toFixed(2)}, Diferencia: ${diferencia.toFixed(2)}`,
      );
    }

    const moneda = await prisma.moneda.findUnique({
      where: { id: asientoData.monedaId },
    });
    if (!moneda) {
      throw new ValidationError("Moneda no encontrada");
    }

    // Obtener tipo de cambio de la fecha del asiento
    const fechaAsiento = new Date(asientoData.fechaAsiento);
    const tc = await obtenerTipoCambio(fechaAsiento);
    const tipoCambio = tc.venta; // Usar TC venta para conversiones

    return await prisma.$transaction(async (tx) => {
            // Si existe un asiento anterior, actualizarlo en lugar de eliminarlo
      if (movimiento.asientoContableId) {
        // Primero eliminar los detalles antiguos (sin validaciones)
        await tx.detalleAsientoContable.deleteMany({
          where: { asientoContableId: movimiento.asientoContableId },
        });

        // Actualizar el asiento con los nuevos datos
        const asiento = await tx.asientoContable.update({
          where: { id: movimiento.asientoContableId },
          data: {
            fechaAsiento: fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro || "FISCAL",
            origenAsiento: asientoData.origenAsiento || "AUTOMATICO",
            monedaId: asientoData.monedaId,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: true,
            tipoCambio: tipoCambio,
            estadoId: estadoPendiente.id,
            actualizadoPor: creadoPor,
            detalles: {
              create: asientoData.detalles.map((detalle, index) => ({
                numeroLinea: index + 1,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa || asientoData.glosa,
                debe: Number(detalle.debe || 0),
                haber: Number(detalle.haber || 0),
                monedaId: asientoData.monedaId,
                tipoCambio: tipoCambio,
                centroCostoId: detalle.centroCostoId || null,
                creadoPor,
                actualizadoPor: creadoPor,
              })),
            },
          },
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

        return asiento;
      }

      // Si NO existe asiento, crear uno nuevo
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: {
          empresaId: asientoData.empresaId,
          periodoContableId: periodoContableId,
        },
        orderBy: { correlativo: "desc" },
      });
      const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
      const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

      const asiento = await tx.asientoContable.create({
        data: {
          empresaId: asientoData.empresaId,
          periodoContableId: periodoContableId,
          numeroAsiento,
          correlativo,
          fechaAsiento: fechaAsiento,
          glosa: asientoData.glosa,
          tipoLibro: asientoData.tipoLibro || "FISCAL",
          origenAsiento: asientoData.origenAsiento || "AUTOMATICO",
          monedaId: asientoData.monedaId,
          totalDebe: totalDebe,
          totalHaber: totalHaber,
          diferencia: diferencia,
          estaCuadrado: true,
          tipoCambio: tipoCambio,
          estadoId: estadoPendiente.id,
          creadoPor,
          actualizadoPor: creadoPor,
          detalles: {
            create: asientoData.detalles.map((detalle, index) => ({
              numeroLinea: index + 1,
              planCuentaId: detalle.planCuentaId,
              glosa: detalle.glosa || asientoData.glosa,
              debe: Number(detalle.debe || 0),
              haber: Number(detalle.haber || 0),
              monedaId: asientoData.monedaId,
              tipoCambio: tipoCambio,
              centroCostoId: detalle.centroCostoId || null,
              creadoPor,
              actualizadoPor: creadoPor,
            })),
          },
        },
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

      await tx.movimientoActivoFijo.update({
        where: { id: movimientoId },
        data: { asientoContableId: asiento.id },
      });

      return asiento;
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
 * Elimina el asiento contable asociado a un movimiento y desvincula el movimiento.
 * Solo permite eliminar si el período contable está ABIERTO.
 * @param {BigInt} movimientoId - ID del movimiento
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const eliminarAsientoContable = async (movimientoId) => {
  try {
    const movimiento = await prisma.movimientoActivoFijo.findUnique({
      where: { id: movimientoId },
      include: {
        periodoContable: true,
        asientoContable: true,
      },
    });

    if (!movimiento) {
      throw new NotFoundError("Movimiento no encontrado");
    }

    if (!movimiento.asientoContableId) {
      throw new ValidationError("Este movimiento no tiene asiento contable asociado");
    }

    // Validar que el período esté ABIERTO
    if (Number(movimiento.periodoContable.estadoId) !== 73) {
      throw new ValidationError(
        "El período contable debe estar ABIERTO para eliminar asientos.",
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Eliminar detalles del asiento
      await tx.detalleAsientoContable.deleteMany({
        where: { asientoContableId: movimiento.asientoContableId },
      });

      // 2. Eliminar el asiento contable
      await tx.asientoContable.delete({
        where: { id: movimiento.asientoContableId },
      });

      // 3. Desvincular el asiento del movimiento
      await tx.movimientoActivoFijo.update({
        where: { id: movimientoId },
        data: { asientoContableId: null },
      });

      return true;
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

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorActivo,
  generarBorradorAsiento,
  guardarAsientoContable,
  eliminarAsientoContable
};