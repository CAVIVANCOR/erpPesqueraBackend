import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { ESTADO_ASIENTO_CONTABLE } from "../../utils/estados.constants.js";

/**
 * Maneja errores de Prisma y los convierte en errores específicos
 * @param {Error} err - Error de Prisma
 * @param {string} contexto - Contexto de la operación
 */
function manejarErrorPrisma(err, contexto = "operación") {
  if (!err.code || !err.code.startsWith("P")) {
    throw err;
  }

  // P2002: Violación de constraint único
  if (err.code === "P2002") {
    const target = err.meta?.target;
    if (target) {
      if (target.includes("numeroAsiento")) {
        throw new ValidationError(
          `El número de asiento ya existe en esta empresa. Por favor, ingrese un número diferente o deje el campo vacío para generar uno automáticamente.`,
        );
      }
      if (target.includes("correlativo")) {
        throw new ValidationError(
          `El correlativo ya existe. Por favor, intente nuevamente.`,
        );
      }
      throw new ValidationError(
        `Ya existe un registro con el mismo ${target.join(", ")}. Por favor, verifique los datos.`,
      );
    }
    throw new ValidationError("Ya existe un registro con estos datos únicos.");
  }

  // P2003: Violación de foreign key
  if (err.code === "P2003") {
    const field = err.meta?.field_name;
    throw new ValidationError(
      `Referencia inválida en el campo ${field || "desconocido"}. El registro relacionado no existe.`,
    );
  }

  // P2025: Registro no encontrado
  if (err.code === "P2025") {
    throw new NotFoundError(
      `No se encontró el registro para ${contexto}. Es posible que haya sido eliminado.`,
    );
  }

  // P2014: Violación de relación requerida
  if (err.code === "P2014") {
    throw new ValidationError(
      `No se puede eliminar este registro porque tiene datos relacionados. Elimine primero las referencias.`,
    );
  }

  // P2016: Error de interpretación de query
  if (err.code === "P2016") {
    throw new ValidationError(
      `Error en los datos proporcionados para ${contexto}. Verifique el formato.`,
    );
  }

  // Error genérico de Prisma
  throw new DatabaseError(
    `Error de base de datos en ${contexto}: ${err.code}`,
    err.message,
  );
}

/**
 * Servicio CRUD para AsientoContable con DetalleAsientoContable (maestro-detalle)
 * Gestiona los asientos contables con validación de partida doble.
 * Flujo: PENDIENTE (76) → APROBADO (77) → ANULADO (78)
 * Documentado en español.
 */

/**
 * Valida los datos de un asiento contable.
 * @param {Object} data - Datos del asiento contable
 */
async function validarAsientoContable(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa) {
      throw new ValidationError("La empresa referenciada no existe.");
    }
  }

  if (data.periodoContableId) {
    const periodo = await prisma.periodoContable.findUnique({
      where: { id: data.periodoContableId },
      include: { estado: true },
    });
    if (!periodo) {
      throw new ValidationError("El período contable referenciado no existe.");
    }

    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: "ABIERTO" },
    });
    if (
      !estadoPeriodoAbierto ||
      Number(periodo.estadoId) !== Number(estadoPeriodoAbierto.id)
    ) {
      throw new ValidationError(
        "El período contable no está ABIERTO. No se pueden crear o modificar asientos.",
      );
    }
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: data.estadoId },
    });
    if (!estado) {
      throw new ValidationError("El estado referenciado no existe.");
    }
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) {
      throw new ValidationError("La moneda referenciada no existe.");
    }
  }

  // Validación de duplicidad de número de asiento
  if (data.numeroAsiento) {
    const asientoDuplicado = await prisma.asientoContable.findFirst({
      where: {
        numeroAsiento: data.numeroAsiento,
        empresaId: data.empresaId,
        ...(data.id && { id: { not: data.id } }),
      },
    });

    if (asientoDuplicado) {
      throw new ValidationError(
        `El número de asiento "${data.numeroAsiento}" ya existe en esta empresa. Por favor, ingrese un número diferente o deje el campo vacío para generar uno automáticamente.`,
      );
    }
  }
}

/**
 * Valida los detalles de un asiento contable (partida doble).
 * @param {Array} detalles - Array de detalles del asiento
 */
async function validarDetallesAsiento(detalles) {
  // VALIDACIÓN DESACTIVADA: Permitir asientos sin detalles (para asientos en proceso)
  // if (!detalles || detalles.length === 0) {
  //   throw new ValidationError('El asiento debe tener al menos un detalle.');
  // }

  if (!detalles || detalles.length === 0) {
    return { totalDebe: 0, totalHaber: 0 };
  }

  let totalDebe = 0;
  let totalHaber = 0;

  for (const detalle of detalles) {
    if (!detalle.planCuentaId) {
      throw new ValidationError("Cada detalle debe tener una cuenta contable.");
    }

    const cuenta = await prisma.planCuentasContable.findUnique({
      where: { id: detalle.planCuentaId },
    });
    if (!cuenta) {
      throw new ValidationError(
        `La cuenta contable con ID ${detalle.planCuentaId} no existe.`,
      );
    }

    const debe = detalle.debe || 0;
    const haber = detalle.haber || 0;

    if (debe < 0 || haber < 0) {
      throw new ValidationError(
        "Los montos del debe y haber no pueden ser negativos.",
      );
    }

    if (debe > 0 && haber > 0) {
      throw new ValidationError(
        "Un detalle no puede tener monto en debe y haber simultáneamente.",
      );
    }

    if (debe === 0 && haber === 0) {
      throw new ValidationError("Un detalle debe tener monto en debe o haber.");
    }

    totalDebe += debe;
    totalHaber += haber;
  }

  const diferencia = Math.abs(totalDebe - totalHaber);

  // VALIDACIÓN DESACTIVADA: Permitir asientos descuadrados (útil para asientos en proceso)
  // Los asientos descuadrados se marcarán con estaCuadrado = false
  // if (diferencia > 0.01) {
  //   throw new ValidationError(
  //     `El asiento no está balanceado. Debe: ${totalDebe.toFixed(2)}, Haber: ${totalHaber.toFixed(2)}, Diferencia: ${diferencia.toFixed(2)}`
  //   );
  // }

  return { totalDebe, totalHaber };
}

const listar = async () => {
  try {
    return await prisma.asientoContable.findMany({
      include: {
        empresa: true,
        periodoContable: {
          include: {
            estado: true, // ✅ INCLUIR ESTADO DEL PERÍODO
          },
        },
        estado: true,
        moneda: true,
        personalAprobador: true,
        personalAnulador: true,
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true,
            activo: true,
            centroCosto: true,
            moneda: true,
            tipoDocumentoOrigen: true,
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
      orderBy: { fechaAsiento: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "listar asientos contables");
  }
};
const obtenerPorId = async (id) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      include: {
        empresa: true,
        periodoContable: {
          include: {
            estado: true, // ✅ INCLUIR ESTADO DEL PERÍODO
          },
        },
        estado: true,
        moneda: true,
        personalAprobador: true,
        personalAnulador: true,
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true,
            activo: true,
            centroCosto: true,
            moneda: true,
            tipoDocumentoOrigen: true,
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
    });
    if (!asiento) throw new NotFoundError("Asiento contable no encontrado");
    return asiento;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    manejarErrorPrisma(err, "obtener asiento contable");
  }
};

const crear = async (data) => {
  try {
    if (
      !data.empresaId ||
      !data.periodoContableId ||
      !data.fechaAsiento ||
      !data.monedaId
    ) {
      throw new ValidationError(
        "Los campos empresaId, periodoContableId, fechaAsiento y monedaId son obligatorios.",
      );
    }

    // Siempre crear en estado PENDIENTE (76)
    const estadoPendiente = await prisma.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError(
        "Estado PENDIENTE (76) no encontrado en el sistema.",
      );
    }
    data.estadoId = Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE);

    await validarAsientoContable(data);

    // Validar detalles solo si vienen
    if (data.detalles && data.detalles.length > 0) {
      await validarDetallesAsiento(data.detalles);
    }

    return await prisma.$transaction(async (tx) => {
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: {
          empresaId: data.empresaId,
          periodoContableId: data.periodoContableId,
        },
        orderBy: { correlativo: "desc" },
      });
      const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
      const anioAsiento = new Date(data.fechaAsiento).getFullYear();
      const numeroAsiento =
        data.numeroAsiento ||
        `ASI-${anioAsiento}-${String(correlativo).padStart(6, "0")}`;

      const asiento = await tx.asientoContable.create({
        data: {
          empresaId: data.empresaId,
          periodoContableId: data.periodoContableId,
          numeroAsiento,
          correlativo,
          fechaAsiento: new Date(data.fechaAsiento),
          glosa: data.glosa || "",
          tipoLibro: data.tipoLibro || "FISCAL",
          origenAsiento: data.origenAsiento || "MANUAL",
          submoduloOrigenId: data.submoduloOrigenId || null,
          procesoOrigenId: data.procesoOrigenId || null,
          estadoId: data.estadoId,
          totalDebe: data.totalDebe || 0,
          totalHaber: data.totalHaber || 0,
          diferencia: data.diferencia || 0,
          estaCuadrado: data.estaCuadrado || false,
          monedaId: data.monedaId,
          tipoCambio: data.tipoCambio,
          esSaldoInicial: data.esSaldoInicial || false,
          creadoPor: data.creadoPor,
        },
      });

      // Crear detalles solo si vienen
      if (data.detalles && data.detalles.length > 0) {
        await Promise.all(
          data.detalles.map((detalle) =>
            tx.detalleAsientoContable.create({
              data: {
                asientoContableId: asiento.id,
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe || 0,
                haber: detalle.haber || 0,
                monedaId: detalle.monedaId,
                tipoCambio: detalle.tipoCambio,
                debeMonedaExtranjera: detalle.debeMonedaExtranjera,
                haberMonedaExtranjera: detalle.haberMonedaExtranjera,
                centroCostoId: detalle.centroCostoId,
                entidadComercialId: detalle.entidadComercialId,
                activoId: detalle.activoId,
                tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId,
                numeroDocumentoOrigen: detalle.numeroDocumentoOrigen,
                fechaDocumentoOrigen: detalle.fechaDocumentoOrigen
                  ? new Date(detalle.fechaDocumentoOrigen)
                  : null,
                fechaVenceDocumentoOrigen: detalle.fechaVenceDocumentoOrigen
                  ? new Date(detalle.fechaVenceDocumentoOrigen)
                  : null,
                submoduloOrigenLineaId: detalle.submoduloOrigenLineaId
                  ? Number(detalle.submoduloOrigenLineaId)
                  : null,
                procesoOrigenLineaId: detalle.procesoOrigenLineaId
                  ? Number(detalle.procesoOrigenLineaId)
                  : null,
                creadoPor: data.creadoPor,
              },
            }),
          ),
        );
      }

      return await tx.asientoContable.findUnique({
        where: { id: asiento.id },
        include: {
          empresa: true,
          periodoContable: true,
          estado: true,
          moneda: true,
          personalAprobador: true,
          personalAnulador: true,
          detalles: {
            include: {
              planCuenta: true,
              entidadComercial: true,
              activo: true,
              centroCosto: true,
              moneda: true,
              tipoDocumentoOrigen: true,
            },
            orderBy: { numeroLinea: "asc" },
          },
        },
      });
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    manejarErrorPrisma(err, "crear asiento contable");
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.asientoContable.findUnique({
      where: { id },
      include: {
        periodoContable: {
          include: { estado: true }
        }
      },
    });
    if (!existente) throw new NotFoundError("Asiento contable no encontrado");

    // Validar que el período esté ABIERTO
    if (existente.periodoContable?.estado?.descripcion !== "ABIERTO") {
      throw new ConflictError(
        "No se puede modificar un asiento de un período que no está ABIERTO.",
      );
    }

    // Solo se pueden modificar asientos PENDIENTE o APROBADO
    // Los ANULADOS NO se pueden modificar
    const estadoId = Number(existente.estadoId);
    if (estadoId !== ESTADO_ASIENTO_CONTABLE.PENDIENTE && estadoId !== ESTADO_ASIENTO_CONTABLE.APROBADO) {
      throw new ConflictError(
        "Solo se pueden modificar asientos en estado PENDIENTE o APROBADO.",
      );
    }
    // Si el asiento está APROBADO, volverlo a PENDIENTE al editar
    const estadoPendiente = await prisma.estadoMultiFuncion.findUnique({
      where: { id: ESTADO_ASIENTO_CONTABLE.PENDIENTE },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE no encontrado en el sistema.");
    }
    await validarAsientoContable({ ...data, id });

    if (data.detalles && data.detalles.length > 0) {
      await validarDetallesAsiento(data.detalles);
    }

    return await prisma.$transaction(async (tx) => {
      // Si cambió el periodo, regenerar numeroAsiento
      let nuevoNumeroAsiento = undefined;
      let nuevoCorrelativo = undefined;

      if (
        data.periodoContableId &&
        Number(data.periodoContableId) !== Number(existente.periodoContableId)
      ) {
        // Obtener el último correlativo del nuevo periodo
        const ultimoAsiento = await tx.asientoContable.findFirst({
          where: {
            empresaId: data.empresaId || existente.empresaId,
            periodoContableId: data.periodoContableId,
          },
          orderBy: { correlativo: "desc" },
        });

        nuevoCorrelativo = (ultimoAsiento?.correlativo || 0) + 1;
        const anioAsiento = new Date(
          data.fechaAsiento || existente.fechaAsiento,
        ).getFullYear();
        nuevoNumeroAsiento = `ASI-${anioAsiento}-${String(nuevoCorrelativo).padStart(6, "0")}`;
      }
      await tx.asientoContable.update({
        where: { id },
        data: {
          periodoContableId: data.periodoContableId,
          ...(nuevoNumeroAsiento && { numeroAsiento: nuevoNumeroAsiento }),
          ...(nuevoCorrelativo && { correlativo: nuevoCorrelativo }),
          fechaAsiento: data.fechaAsiento
            ? new Date(data.fechaAsiento)
            : undefined,
          glosa: data.glosa,
          tipoLibro: data.tipoLibro,
          origenAsiento: data.origenAsiento,
          monedaId: data.monedaId,
          tipoCambio: data.tipoCambio,
          esSaldoInicial: data.esSaldoInicial,
          totalDebe: data.totalDebe,
          totalHaber: data.totalHaber,
          diferencia: data.diferencia,
          estaCuadrado: data.estaCuadrado,
          estadoId: ESTADO_ASIENTO_CONTABLE.PENDIENTE, // ✅ Siempre volver a PENDIENTE al editar
          actualizadoPor: data.actualizadoPor,
        },
      });

      if (data.detalles) {
        // Obtener IDs de detalles existentes
        const detallesExistentes = await tx.detalleAsientoContable.findMany({
          where: { asientoContableId: id },
          select: { id: true, numeroLinea: true },
        });

        // Eliminar detalles que ya no existen en el nuevo array
        const nuevosNumeros = data.detalles.map((d) => d.numeroLinea);
        const idsAEliminar = detallesExistentes
          .filter((d) => !nuevosNumeros.includes(d.numeroLinea))
          .map((d) => d.id);

        if (idsAEliminar.length > 0) {
          await tx.detalleAsientoContable.deleteMany({
            where: { id: { in: idsAEliminar } },
          });
        }

        // Actualizar o crear cada detalle
        await Promise.all(
          data.detalles.map((detalle) => {
            const detalleExistente = detallesExistentes.find(
              (d) => d.numeroLinea === detalle.numeroLinea,
            );

            const detalleData = {
              asientoContableId: id,
              numeroLinea: detalle.numeroLinea,
              planCuentaId: detalle.planCuentaId,
              glosa: detalle.glosa,
              debe: detalle.debe || 0,
              haber: detalle.haber || 0,
              monedaId: detalle.monedaId,
              tipoCambio: detalle.tipoCambio,
              debeMonedaExtranjera: detalle.debeMonedaExtranjera,
              haberMonedaExtranjera: detalle.haberMonedaExtranjera,
              centroCostoId: detalle.centroCostoId,
              entidadComercialId: detalle.entidadComercialId,
              activoId: detalle.activoId,
              tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId,
              numeroDocumentoOrigen: detalle.numeroDocumentoOrigen,
              fechaDocumentoOrigen: detalle.fechaDocumentoOrigen
                ? new Date(detalle.fechaDocumentoOrigen)
                : null,
              fechaVenceDocumentoOrigen: detalle.fechaVenceDocumentoOrigen
                ? new Date(detalle.fechaVenceDocumentoOrigen)
                : null,
              submoduloOrigenLineaId: detalle.submoduloOrigenLineaId
                ? Number(detalle.submoduloOrigenLineaId)
                : null,
              procesoOrigenLineaId: detalle.procesoOrigenLineaId
                ? Number(detalle.procesoOrigenLineaId)
                : null,
              actualizadoPor: data.actualizadoPor,
            };

            if (detalleExistente) {
              // Actualizar detalle existente (preserva creadoEn y creadoPor automáticamente)
              return tx.detalleAsientoContable.update({
                where: { id: detalleExistente.id },
                data: detalleData,
              });
            } else {
              // Crear nuevo detalle
              return tx.detalleAsientoContable.create({
                data: {
                  ...detalleData,
                  creadoPor: data.actualizadoPor,
                },
              });
            }
          }),
        );
      }

      return await tx.asientoContable.findUnique({
        where: { id },
        include: {
          empresa: true,
          periodoContable: true,
          estado: true,
          moneda: true,
          personalAprobador: true,
          personalAnulador: true,
          detalles: {
            include: {
              planCuenta: true,
              entidadComercial: true,
              activo: true,
              centroCosto: true,
              moneda: true,
              tipoDocumentoOrigen: true,
            },
            orderBy: { numeroLinea: "asc" },
          },
        },
      });
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    manejarErrorPrisma(err, "actualizar asiento contable");
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.asientoContable.findUnique({
      where: { id },
      include: {
        periodoContable: true,
        detalles: true,
      },
    });

    if (!existente) throw new NotFoundError("Asiento contable no encontrado");

    // Solo se pueden eliminar asientos en estado PENDIENTE (76)
    //if (Number(existente.estadoId) !== ESTADO_ASIENTO_CONTABLE.PENDIENTE) {
    //  throw new ConflictError(
    //    "Solo se pueden eliminar asientos en estado PENDIENTE (76).",
    //  );
    //}

    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: "ABIERTO" },
    });
    if (
      !estadoPeriodoAbierto ||
      Number(existente.periodoContable.estadoId) !==
      Number(estadoPeriodoAbierto.id)
    ) {
      throw new ConflictError(
        "No se puede eliminar un asiento de un período que no está ABIERTO.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.detalleAsientoContable.deleteMany({
        where: { asientoContableId: id },
      });
      await tx.asientoContable.delete({ where: { id } });
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    manejarErrorPrisma(err, "eliminar asiento contable");
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.asientoContable.findMany({
      where: { empresaId },
      include: {
        periodoContable: true,
        estado: true,
        moneda: true,
        personalAprobador: true,
        personalAnulador: true,
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true,
            activo: true,
            centroCosto: true,
            moneda: true,
            tipoDocumentoOrigen: true,
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
      orderBy: { fechaAsiento: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "obtener asientos por empresa");
  }
};

const listarPorPeriodo = async (periodoContableId) => {
  try {
    return await prisma.asientoContable.findMany({
      where: { periodoContableId },
      include: {
        empresa: true,
        estado: true,
        moneda: true,
        personalAprobador: true,
        personalAnulador: true,
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true,
            activo: true,
            centroCosto: true,
            moneda: true,
            tipoDocumentoOrigen: true,
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
      orderBy: { fechaAsiento: "asc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "obtener asientos por periodo");
  }
};

const aprobarAsiento = async (id, aprobadoPorId) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      include: { periodoContable: true, detalles: true, estado: true },
    });

    if (!asiento) throw new NotFoundError("Asiento contable no encontrado");

    // Solo se pueden aprobar asientos en estado PENDIENTE (76)
    if (Number(asiento.estadoId) !== ESTADO_ASIENTO_CONTABLE.PENDIENTE) {
      throw new ConflictError(
        "Solo se pueden aprobar asientos en estado PENDIENTE (76).",
      );
    }

    // Validar que tenga al menos un detalle
    if (!asiento.detalles || asiento.detalles.length === 0) {
      throw new ValidationError(
        "El asiento no tiene detalles. Debe agregar al menos un detalle antes de aprobar.",
      );
    }

    // Validar que esté cuadrado
    if (!asiento.estaCuadrado) {
      throw new ConflictError(
        "El asiento no está cuadrado (debe = haber). No se puede aprobar.",
      );
    }

    // Validar que el período esté abierto
    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: "ABIERTO" },
    });
    if (
      !estadoPeriodoAbierto ||
      Number(asiento.periodoContable.estadoId) !==
      Number(estadoPeriodoAbierto.id)
    ) {
      throw new ConflictError(
        "No se puede aprobar un asiento de un período que no está ABIERTO.",
      );
    }

    // Validar que el estado APROBADO exista
    const estadoAprobado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.APROBADO) },
    });

    if (!estadoAprobado) {
      throw new ValidationError(
        "Estado APROBADO (77) no encontrado en el sistema.",
      );
    }

    return await prisma.asientoContable.update({
      where: { id },
      data: {
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.APROBADO),
        fechaAprobacion: new Date(),
        aprobadoPor: aprobadoPorId,
      },
      include: {
        empresa: true,
        periodoContable: true,
        estado: true,
        moneda: true,
        personalAprobador: true,
        personalAnulador: true,
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true,
            activo: true,
            centroCosto: true,
            moneda: true,
            tipoDocumentoOrigen: true,
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    manejarErrorPrisma(err, "aprobar asiento contable");
  }
};

const anularAsiento = async (id, anuladoPorId, motivoAnulacion) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      include: { periodoContable: true, estado: true },
    });

    if (!asiento) throw new NotFoundError("Asiento contable no encontrado");

    // Solo se pueden anular asientos APROBADOS
    if (Number(asiento.estadoId) !== ESTADO_ASIENTO_CONTABLE.APROBADO) {
      throw new ConflictError("Solo se pueden anular asientos APROBADOS.");
    }

    const estadoPeriodoBloqueado = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: "BLOQUEADO" },
    });
    if (
      estadoPeriodoBloqueado &&
      Number(asiento.periodoContable.estadoId) ===
      Number(estadoPeriodoBloqueado.id)
    ) {
      throw new ConflictError(
        "No se puede anular un asiento de un período BLOQUEADO.",
      );
    }

    if (!motivoAnulacion) {
      throw new ValidationError("Debe proporcionar un motivo de anulación.");
    }

    // Validar que el estado ANULADO exista
    const estadoAnulado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.ANULADO) },
    });

    if (!estadoAnulado) {
      throw new ValidationError(
        "Estado ANULADO (78) no encontrado en el sistema.",
      );
    }

    return await prisma.asientoContable.update({
      where: { id },
      data: {
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.ANULADO),
        fechaAnulacion: new Date(),
        anuladoPor: anuladoPorId,
        motivoAnulacion,
      },
      include: {
        empresa: true,
        periodoContable: true,
        estado: true,
        moneda: true,
        personalAprobador: true,
        personalAnulador: true,
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true,
            activo: true,
            centroCosto: true,
            moneda: true,
            tipoDocumentoOrigen: true,
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    manejarErrorPrisma(err, "anular asiento contable");
  }
};

/**
 * Lista los asientos contables generados por un movimiento de caja específico
 * @param {number} movimientoCajaId - ID del movimiento de caja
 * @param {number} submoduloId - ID del submódulo (opcional)
 * @returns {Promise<Array>} - Lista de asientos generados por el movimiento
 */
const listarPorMovimiento = async (movimientoCajaId, submoduloId = null) => {
  try {
    const whereClause = {
      procesoOrigenId: Number(movimientoCajaId),
      origenAsiento: "AUTOMATICO",
    };

    // Si se proporciona submoduloId, agregarlo al filtro
    if (submoduloId) {
      whereClause.submoduloOrigenId = Number(submoduloId);
    }

    // Definir relaciones a incluir
    const incluirRelaciones = {
      empresa: true,
      moneda: true,
      personalAprobador: true,
      personalAnulador: true,
      detalles: {
        include: {
          planCuenta: true,
          entidadComercial: true,
          activo: true,
          centroCosto: true,
          moneda: true,
          tipoDocumentoOrigen: true,
        },
        orderBy: { numeroLinea: "asc" },
      },
    };

    const asientos = await prisma.asientoContable.findMany({
      where: whereClause,
      include: incluirRelaciones,
      orderBy: {
        fechaAsiento: "desc",
      },
    });

    return asientos;
  } catch (err) {
    manejarErrorPrisma(err, "listar asientos por movimiento");
  }
};

/**
 * Une múltiples asientos contables en uno solo
 * El primer asiento de la lista permanece y recibe todos los detalles de los demás
 * Los asientos restantes son eliminados
 *
 * VALIDACIONES:
 * - Mínimo 2 asientos
 * - Todos en estado PENDIENTE (76)
 * - Misma empresa
 * - Mismo período
 * - Misma glosa
 *
 * @param {Array<BigInt>} asientoIds - Array de IDs de asientos a unir (el primero permanece)
 * @param {BigInt} usuarioId - ID del usuario que realiza la operación
 * @returns {Promise<Object>} - Asiento resultante con todos los detalles unidos
 */
const unirAsientos = async (asientoIds, usuarioId) => {
  try {
    // ========================================
    // VALIDACIÓN 1: Cantidad mínima
    // ========================================
    if (!asientoIds || asientoIds.length < 2) {
      throw new ValidationError(
        "Debe seleccionar al menos 2 asientos para unir.",
      );
    }

    // ========================================
    // VALIDACIÓN 2: Obtener todos los asientos con sus detalles
    // ========================================
    const asientos = await prisma.asientoContable.findMany({
      where: {
        id: { in: asientoIds.map((id) => Number(id)) },
      },
      include: {
        empresa: true,
        periodoContable: true,
        estado: true,
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true,
            activo: true,
            centroCosto: true,
            moneda: true,
            tipoDocumentoOrigen: true,
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
    });

    if (asientos.length !== asientoIds.length) {
      throw new NotFoundError("Uno o más asientos seleccionados no existen.");
    }

    // ========================================
    // VALIDACIÓN 3: Todos deben estar en estado PENDIENTE (76)
    // ========================================
    const asientosNoPendientes = asientos.filter(
      (a) => Number(a.estadoId) !== ESTADO_ASIENTO_CONTABLE.PENDIENTE,
    );
    if (asientosNoPendientes.length > 0) {
      const numerosAsientos = asientosNoPendientes
        .map((a) => a.numeroAsiento)
        .join(", ");
      throw new ConflictError(
        `Solo se pueden unir asientos en estado PENDIENTE. Los siguientes asientos tienen estado diferente: ${numerosAsientos}`,
      );
    }

    // ========================================
    // VALIDACIÓN 4: Misma empresa
    // ========================================
    const empresaId = asientos[0].empresaId;
    const asientosDiferenteEmpresa = asientos.filter(
      (a) => Number(a.empresaId) !== Number(empresaId),
    );
    if (asientosDiferenteEmpresa.length > 0) {
      throw new ValidationError(
        "Todos los asientos deben ser de la misma empresa.",
      );
    }

    // ========================================
    // VALIDACIÓN 5: Mismo período
    // ========================================
    const periodoId = asientos[0].periodoContableId;
    const asientosDiferentePeriodo = asientos.filter(
      (a) => Number(a.periodoContableId) !== Number(periodoId),
    );
    if (asientosDiferentePeriodo.length > 0) {
      throw new ValidationError(
        "Todos los asientos deben ser del mismo período contable.",
      );
    }

    // ========================================
    // VALIDACIÓN 6: Misma glosa
    // ========================================
    const glosa = asientos[0].glosa;
    const asientosDiferenteGlosa = asientos.filter((a) => a.glosa !== glosa);
    if (asientosDiferenteGlosa.length > 0) {
      throw new ValidationError(
        "Todos los asientos deben tener la misma glosa.",
      );
    }

    // ========================================
    // VALIDACIÓN 7: Período debe estar ABIERTO
    // ========================================
    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: "ABIERTO" },
    });
    if (
      !estadoPeriodoAbierto ||
      Number(asientos[0].periodoContable.estadoId) !==
      Number(estadoPeriodoAbierto.id)
    ) {
      throw new ConflictError(
        "No se pueden unir asientos de un período que no está ABIERTO.",
      );
    }

    // ========================================
    // PROCESO DE UNIÓN
    // ========================================
    return await prisma.$transaction(async (tx) => {
      // El primer asiento es el que permanece
      const asientoPrincipal = asientos[0];
      const asientosAEliminar = asientos.slice(1);

      // Obtener el último número de línea del asiento principal
      let ultimoNumeroLinea = Math.max(
        ...asientoPrincipal.detalles.map((d) => d.numeroLinea),
        0,
      );

      // Transferir detalles de los asientos a eliminar al asiento principal
      for (const asiento of asientosAEliminar) {
        for (const detalle of asiento.detalles) {
          ultimoNumeroLinea++;

          // Crear nuevo detalle en el asiento principal
          await tx.detalleAsientoContable.create({
            data: {
              asientoContableId: asientoPrincipal.id,
              numeroLinea: ultimoNumeroLinea,
              planCuentaId: detalle.planCuentaId,
              glosa: detalle.glosa,
              debe: detalle.debe,
              haber: detalle.haber,
              monedaId: detalle.monedaId,
              tipoCambio: detalle.tipoCambio,
              debeMonedaExtranjera: detalle.debeMonedaExtranjera,
              haberMonedaExtranjera: detalle.haberMonedaExtranjera,
              centroCostoId: detalle.centroCostoId,
              entidadComercialId: detalle.entidadComercialId,
              activoId: detalle.activoId,
              tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId,
              numeroDocumentoOrigen: detalle.numeroDocumentoOrigen,
              fechaDocumentoOrigen: detalle.fechaDocumentoOrigen,
              fechaVenceDocumentoOrigen: detalle.fechaVenceDocumentoOrigen,
              submoduloOrigenLineaId: detalle.submoduloOrigenLineaId,
              procesoOrigenLineaId: detalle.procesoOrigenLineaId,
              creadoPor: usuarioId,
            },
          });
        }
      }

      // Recalcular totales del asiento principal
      const todosLosDetalles = await tx.detalleAsientoContable.findMany({
        where: { asientoContableId: asientoPrincipal.id },
      });

      let totalDebe = 0;
      let totalHaber = 0;
      for (const detalle of todosLosDetalles) {
        totalDebe += Number(detalle.debe);
        totalHaber += Number(detalle.haber);
      }

      const diferencia = totalDebe - totalHaber;
      const estaCuadrado = Math.abs(diferencia) < 0.01;

      // Actualizar totales del asiento principal
      await tx.asientoContable.update({
        where: { id: asientoPrincipal.id },
        data: {
          totalDebe,
          totalHaber,
          diferencia,
          estaCuadrado,
          actualizadoPor: usuarioId,
        },
      });

      // Eliminar los asientos secundarios (sus detalles se eliminan en cascada)
      for (const asiento of asientosAEliminar) {
        await tx.detalleAsientoContable.deleteMany({
          where: { asientoContableId: asiento.id },
        });
        await tx.asientoContable.delete({
          where: { id: asiento.id },
        });
      }

      // Retornar el asiento principal actualizado con todos sus detalles
      return await tx.asientoContable.findUnique({
        where: { id: asientoPrincipal.id },
        include: {
          empresa: true,
          periodoContable: true,
          estado: true,
          moneda: true,
          personalAprobador: true,
          personalAnulador: true,
          detalles: {
            include: {
              planCuenta: true,
              entidadComercial: true,
              activo: true,
              centroCosto: true,
              moneda: true,
              tipoDocumentoOrigen: true,
            },
            orderBy: { numeroLinea: "asc" },
          },
        },
      });
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    manejarErrorPrisma(err, "unir asientos contables");
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  listarPorPeriodo,
  aprobarAsiento,
  anularAsiento,
  listarPorMovimiento,
  unirAsientos,
};
