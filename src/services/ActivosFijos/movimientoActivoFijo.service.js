import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import lineaCreditoService from "../Tesoreria/lineaCredito.service.js";
import { ESTADO_PERIODO_CONTABLE } from "../../utils/estados.constants.js";
import { validarTipoCambio, obtenerTipoCambioSunat } from "../../utils/tipoCambio.util.js";


// Mapeo de Tipo de Movimiento → Código de Libro SUNAT
const TIPO_LIBRO_POR_MOVIMIENTO = {
  1: 5,  // SALDO INICIAL → LIBRO DIARIO (05)
  2: 7,  // COMPRA → REGISTRO ACTIVOS FIJOS (07)
  3: 5,  // DEPRECIACION MENSUAL → LIBRO DIARIO (05)
  4: 5,  // VENTA → LIBRO DIARIO (05)
  5: 5,  // BAJA → LIBRO DIARIO (05)
  6: 5,  // MEJORA → LIBRO DIARIO (05)
  7: 5,  // TRANSFERENCIA → LIBRO DIARIO (05)
  8: 5,  // REVALUACION → LIBRO DIARIO (05)
  9: 5,  // AJUSTE POR INVENTARIO → LIBRO DIARIO (05)
  10: 5, // DETERIORO → LIBRO DIARIO (05)
  11: 5, // DONACION RECIBIDA → LIBRO DIARIO (05)
  12: 5, // DONACION ENTREGADA → LIBRO DIARIO (05)
  13: 5, // REVERSION DEPRECIACION → LIBRO DIARIO (05)
  14: 5  // ARRENDAMIENTO FINANCIERO → LIBRO DIARIO (05)
};

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
    if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
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
        asientosContables: {
          // ✅ Relación 1:N
          include: {
            detalles: {
              include: {
                planCuenta: true,
                moneda: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
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
        asientosContables: {
          include: {
            estado: true,
            moneda: true,
            detalles: {
              include: {
                planCuenta: true,
                moneda: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
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
        asientosContables: {
          // ✅ Relación 1:N
          include: {
            detalles: {
              include: {
                planCuenta: true,
                moneda: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
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
        asientosContables: {
          // ✅ AGREGAR
          include: {
            detalles: {
              include: {
                planCuenta: true,
                moneda: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
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

    // ✅ AGREGAR NUEVA VALIDACIÓN:
    // Verificar si tiene asientos contables generados
    const asientosCount = await prisma.asientoContable.count({
      where: {
        movimientosActivoFijo: {
          some: {
            id: id
          }
        }
      }
    });

    if (asientosCount > 0) {
      throw new ValidationError(
        `No se puede eliminar un movimiento que tiene ${asientosCount} asiento(s) contable(s) generado(s).`,
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
        asientosContables: {
          include: {
            detalles: {
              include: {
                planCuenta: true,
                moneda: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
      },
      orderBy: { fechaMovimiento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const generarBorradorAsiento = async (movimientoId) => {
  try {
    const movimiento = await prisma.movimientoActivoFijo.findUnique({
      where: { id: movimientoId },
      include: {
        activo: {
          include: {
            cuentaContable: true,
            cuentaDepreciacion: true,
            cuentaGastoDep: true,
            producto: {
              include: {
                cuentaCompras: true,
                cuentaInventario: true,
                cuentaVentas: true,
                cuentaCostoVentas: true
              }
            }
          }
        },
        tipoMovimiento: {
          include: {
            cuentaDebe: true,
            cuentaHaber: true
          }
        },
        periodoContable: true
      }
    });

    if (!movimiento) {
      throw new NotFoundError("Movimiento de Activo Fijo no encontrado");
    }

    if (!movimiento.tipoMovimiento.generaAsientoAutomatico) {
      throw new ValidationError("Este tipo de movimiento no genera asiento automático");
    }

    const cuentaUtilidades = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: "591101",
        activo: true
      }
    });

    if (!cuentaUtilidades) {
      throw new NotFoundError("Cuenta 591101 (Utilidades Acumuladas) no encontrada");
    }

    // ⭐ Obtener tipo de cambio para la fecha del asiento
    const fechaAsiento = movimiento.fechaContable || movimiento.fechaMovimiento;
    const tipoCambioMovimiento = await obtenerTipoCambioSunat(new Date(fechaAsiento)) || 1;

    // ⭐ Convertir monto a soles si es moneda extranjera
    const MONEDA_USD_ID = 2;
    const montoOriginal = Number(movimiento.monto);
    const montoEnSoles = Number(movimiento.monedaId) === MONEDA_USD_ID
      ? Math.round(montoOriginal * tipoCambioMovimiento * 100) / 100
      : montoOriginal;

    const borrador = {
      empresaId: movimiento.empresaId,
      periodoContableId: movimiento.periodoContableId,
      fechaAsiento: fechaAsiento,
      glosa: `${movimiento.tipoMovimiento.nombre} - ${movimiento.activo.nombre}`,
      tipoLibro: "FISCAL",
      origenAsiento: "AUTOMATICO",
      monedaId: movimiento.monedaId,
      tipoCambio: tipoCambioMovimiento,
      submoduloOrigenId: 133,  // ✅ CORRECCIÓN: ID correcto MovimientoActivoFijo
      procesoOrigenId: movimiento.id,
      esSaldoInicial: Number(movimiento.tipoMovimientoId) === 1,
      detalles: []
    };

    let numeroLinea = 1;

    if (Number(movimiento.tipoMovimientoId) === 1) {
      if (!movimiento.activo.cuentaContableId) {
        throw new ValidationError(`El activo ${movimiento.activo.nombre} no tiene cuenta contable (33xxx) configurada`);
      }

      borrador.detalles.push({
        numeroLinea: numeroLinea++,
        planCuentaId: movimiento.activo.cuentaContableId,
        glosa: `Activo Fijo - ${movimiento.activo.nombre}`,
        debe: montoEnSoles,
        haber: 0,
        monedaId: 1,
        tipoCambio: tipoCambioMovimiento,
        debeMonedaExtranjera: montoOriginal,
        haberMonedaExtranjera: 0,
      });

      borrador.detalles.push({
        numeroLinea: numeroLinea++,
        planCuentaId: cuentaUtilidades.id,
        glosa: "Utilidades Acumuladas",
        debe: 0,
        haber: montoEnSoles,
        monedaId: 1,
        tipoCambio: tipoCambioMovimiento,
        debeMonedaExtranjera: 0,
        haberMonedaExtranjera: montoOriginal,
      });

      if (movimiento.depreciacionAcumulada && Number(movimiento.depreciacionAcumulada) > 0) {
        if (!movimiento.activo.cuentaDepreciacionId) {
          throw new ValidationError(`El activo ${movimiento.activo.nombre} no tiene cuenta de depreciación (39xxx) configurada`);
        }

        const depreciacionOriginal = Number(movimiento.depreciacionAcumulada);
        const depreciacionEnSoles = Number(movimiento.monedaId) === MONEDA_USD_ID
          ? Math.round(depreciacionOriginal * tipoCambioMovimiento * 100) / 100
          : depreciacionOriginal;

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaUtilidades.id,
          glosa: "Utilidades",
          debe: depreciacionEnSoles,
          haber: 0,
          monedaId: 1,
          tipoCambio: tipoCambioMovimiento,
          debeMonedaExtranjera: depreciacionOriginal,
          haberMonedaExtranjera: 0,
        });

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: movimiento.activo.cuentaDepreciacionId,
          glosa: `Depreciación Acumulada - ${movimiento.activo.nombre}`,
          debe: 0,
          haber: depreciacionEnSoles,
          monedaId: 1,
          tipoCambio: tipoCambioMovimiento,
          debeMonedaExtranjera: 0,
          haberMonedaExtranjera: depreciacionOriginal,
        });
      }
    } else {
      throw new ValidationError(`Tipo de movimiento ${movimiento.tipoMovimiento.nombre} no soportado aún`);
    }

    // ✅ CORRECTO: Calcula totales en MONEDA ORIGINAL
    const totalDebe = borrador.detalles.reduce((sum, d) => sum + Number(d.debeMonedaExtranjera || 0), 0);
    const totalHaber = borrador.detalles.reduce((sum, d) => sum + Number(d.haberMonedaExtranjera || 0), 0);
    const diferencia = totalDebe - totalHaber;

    borrador.totalDebe = totalDebe;
    borrador.totalHaber = totalHaber;
    borrador.diferencia = diferencia;
    borrador.estaCuadrado = Math.abs(diferencia) < 0.01;

    return borrador;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const guardarAsientoContable = async (movimientoId, asientoData, creadoPor) => {
  try {
    const movimiento = await prisma.movimientoActivoFijo.findUnique({
      where: { id: movimientoId }
    });

    if (!movimiento) {
      throw new NotFoundError("Movimiento de Activo Fijo no encontrado");
    }

    if (!asientoData.detalles || asientoData.detalles.length === 0) {
      throw new ValidationError("El asiento debe tener al menos un detalle");
    }

    const totalDebe = asientoData.detalles.reduce((sum, d) => sum + Number(d.debe || 0), 0);
    const totalHaber = asientoData.detalles.reduce((sum, d) => sum + Number(d.haber || 0), 0);
    const diferencia = totalDebe - totalHaber;
    const estaCuadrado = Math.abs(diferencia) < 0.01;

    if (!estaCuadrado) {
      throw new ValidationError(`El asiento no está cuadrado. Diferencia: ${diferencia}`);
    }

    // ✅ Obtener tipo de cambio validado
    const tipoCambioFinal = await validarTipoCambio(
      asientoData.tipoCambio || 0,
      asientoData.fechaAsiento || movimiento.fechaContable || movimiento.fechaMovimiento
    );

    const submodulo = await prisma.submoduloSistema.findFirst({
      where: { id: Number(133) }  // ✅ CORRECCIÓN: ID correcto es 133
    });

    if (!submodulo) {
      throw new NotFoundError("Submódulo MovimientoActivoFijo no encontrado");
    }

    // ✅ Obtener código de libro SUNAT según tipo de movimiento
    const tipoLibroId = TIPO_LIBRO_POR_MOVIMIENTO[Number(movimiento.tipoMovimientoId)] || 5;

    const esEdicion = !!asientoData.id;

    const asiento = await prisma.$transaction(async (tx) => {
      if (esEdicion) {
        await tx.asientoContable.update({
          where: { id: asientoData.id },
          data: {
            glosa: asientoData.glosa,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: estaCuadrado,
            actualizadoPor: creadoPor
          }
        });

        await tx.detalleAsientoContable.deleteMany({
          where: { asientoContableId: asientoData.id }
        });

        for (let i = 0; i < asientoData.detalles.length; i++) {
          const detalle = asientoData.detalles[i];
          await tx.detalleAsientoContable.create({
            data: {
              asientoContableId: asientoData.id,
              numeroLinea: i + 1,
              planCuentaId: detalle.planCuentaId,
              glosa: detalle.glosa,
              debe: detalle.debe,
              haber: detalle.haber,
              monedaId: 1,
              tipoCambio: tipoCambioFinal,
              debeMonedaExtranjera: detalle.debeMonedaExtranjera || null,
              haberMonedaExtranjera: detalle.haberMonedaExtranjera || null,
              activoId: Number(movimiento.activoId),
              centroCostoId: detalle.centroCostoId || movimiento.centroCostoId || null,
              entidadComercialId: detalle.entidadComercialId || null,
              tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId || null,
              numeroDocumentoOrigen: detalle.numeroDocumentoOrigen || null,
              fechaDocumentoOrigen: detalle.fechaDocumentoOrigen || null,
              submoduloOrigenLineaId: Number(submodulo.id),
              procesoOrigenLineaId: movimientoId,
              creadoPor: creadoPor
            }
          });
        }
      } else {
        // CREAR: Nuevo asiento con correlativo
        const ultimoAsiento = await tx.asientoContable.findFirst({
          where: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
          },
          orderBy: { correlativo: "desc" },
        });

        const nuevoCorrelativo = ultimoAsiento ? ultimoAsiento.correlativo + 1 : 1;
        const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(5, "0")}`;

        await tx.asientoContable.create({
          data: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
            numeroAsiento: numeroAsiento,
            correlativo: nuevoCorrelativo,
            fechaAsiento: asientoData.fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro || "FISCAL",
            tipoLibroId: Number(tipoLibroId),  // ✅ AGREGADO: Código de libro SUNAT
            origenAsiento: asientoData.origenAsiento || "AUTOMATICO",
            submoduloOrigenId: Number(submodulo.id),  // ✅ CORRECCIÓN: Convertir a BigInt
            procesoOrigenId: movimientoId,
            estadoId: Number(76),  // ✅ CORRECCIÓN: Convertir a BigInt
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: estaCuadrado,
            monedaId: asientoData.monedaId,
            tipoCambio: tipoCambioFinal,  // ✅ CORRECCIÓN: Usar tipo de cambio validado
            esSaldoInicial: asientoData.esSaldoInicial || false,
            creadoPor: creadoPor,
            movimientosActivoFijo: {
              connect: { id: movimientoId }
            },
            detalles: {
              create: asientoData.detalles.map((detalle, index) => ({
                numeroLinea: index + 1,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: 1,
                tipoCambio: tipoCambioFinal,
                debeMonedaExtranjera: detalle.debeMonedaExtranjera || null,
                haberMonedaExtranjera: detalle.haberMonedaExtranjera || null,
                activoId: Number(movimiento.activoId),
                centroCostoId: detalle.centroCostoId || movimiento.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId || null,
                numeroDocumentoOrigen: detalle.numeroDocumentoOrigen || null,
                fechaDocumentoOrigen: detalle.fechaDocumentoOrigen || null,
                submoduloOrigenLineaId: Number(submodulo.id),
                procesoOrigenLineaId: movimientoId,
                creadoPor: creadoPor
              }))
            }
          }
        });
      }

      return await tx.asientoContable.findFirst({
        where: {
          submoduloOrigenId: submodulo.id,
          procesoOrigenId: movimientoId
        },
        include: {
          estado: true,
          moneda: true,
          detalles: {
            include: {
              planCuenta: true,
              moneda: true,
            }
          }
        },
        orderBy: { id: 'desc' }
      });
    });

    return asiento;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const eliminarAsientoContable = async (asientoId) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id: asientoId },
      include: {
        estado: true
      }
    });

    if (!asiento) {
      throw new NotFoundError("Asiento contable no encontrado");
    }

    if (Number(asiento.estadoId) !== 76) {
      throw new ValidationError(
        `No se puede eliminar el asiento. Solo se pueden eliminar asientos en estado PENDIENTE. Estado actual: ${asiento.estado.descripcion}`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.detalleAsientoContable.deleteMany({
        where: { asientoContableId: asientoId }
      });

      await tx.asientoContable.delete({
        where: { id: asientoId }
      });
    });

    return true;
  } catch (err) {
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
  listarPorActivo,
  generarBorradorAsiento,
  guardarAsientoContable,
  eliminarAsientoContable,
};
