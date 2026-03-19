import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

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
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) {
      throw new ValidationError('La empresa referenciada no existe.');
    }
  }

  if (data.periodoContableId) {
    const periodo = await prisma.periodoContable.findUnique({ 
      where: { id: data.periodoContableId },
      include: { estado: true }
    });
    if (!periodo) {
      throw new ValidationError('El período contable referenciado no existe.');
    }
    
    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'ABIERTO' }
    });
    if (!estadoPeriodoAbierto || Number(periodo.estadoId) !== Number(estadoPeriodoAbierto.id)) {
      throw new ValidationError('El período contable no está ABIERTO. No se pueden crear o modificar asientos.');
    }
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) {
      throw new ValidationError('El estado referenciado no existe.');
    }
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) {
      throw new ValidationError('La moneda referenciada no existe.');
    }
  }
}

/**
 * Valida los detalles de un asiento contable (partida doble).
 * @param {Array} detalles - Array de detalles del asiento
 */
async function validarDetallesAsiento(detalles) {
  if (!detalles || detalles.length === 0) {
    throw new ValidationError('El asiento debe tener al menos un detalle.');
  }

  let totalDebe = 0;
  let totalHaber = 0;

  for (const detalle of detalles) {
    if (!detalle.planCuentaId) {
      throw new ValidationError('Cada detalle debe tener una cuenta contable.');
    }

    const cuenta = await prisma.planCuentasContable.findUnique({ 
      where: { id: detalle.planCuentaId } 
    });
    if (!cuenta) {
      throw new ValidationError(`La cuenta contable con ID ${detalle.planCuentaId} no existe.`);
    }

    const debe = detalle.debe || 0;
    const haber = detalle.haber || 0;

    if (debe < 0 || haber < 0) {
      throw new ValidationError('Los montos del debe y haber no pueden ser negativos.');
    }

    if (debe > 0 && haber > 0) {
      throw new ValidationError('Un detalle no puede tener monto en debe y haber simultáneamente.');
    }

    if (debe === 0 && haber === 0) {
      throw new ValidationError('Un detalle debe tener monto en debe o haber.');
    }

    totalDebe += debe;
    totalHaber += haber;
  }

  const diferencia = Math.abs(totalDebe - totalHaber);
  if (diferencia > 0.01) {
    throw new ValidationError(
      `El asiento no está balanceado. Debe: ${totalDebe.toFixed(2)}, Haber: ${totalHaber.toFixed(2)}, Diferencia: ${diferencia.toFixed(2)}`
    );
  }

  return { totalDebe, totalHaber };
}

const listar = async () => {
  try {
    return await prisma.asientoContable.findMany({
      include: {
        empresa: true,
        periodoContable: true,
        estado: true,
        moneda: true,
        personalAprobador: true,
        personalAnulador: true,
        detalles: {
          include: {
            planCuenta: true
          },
          orderBy: { numeroLinea: 'asc' }
        }
      },
      orderBy: { fechaAsiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
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
            planCuenta: true
          },
          orderBy: { numeroLinea: 'asc' }
        }
      }
    });
    if (!asiento) throw new NotFoundError('Asiento contable no encontrado');
    return asiento;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.empresaId || !data.periodoContableId || !data.fechaAsiento || !data.monedaId) {
      throw new ValidationError('Los campos empresaId, periodoContableId, fechaAsiento y monedaId son obligatorios.');
    }

    // Siempre crear en estado PENDIENTE (76)
    const estadoPendiente = await prisma.estadoMultiFuncion.findUnique({ where: { id: BigInt(76) } });
    if (!estadoPendiente) {
      throw new ValidationError('Estado PENDIENTE (76) no encontrado en el sistema.');
    }
    data.estadoId = BigInt(76);

    await validarAsientoContable(data);
    
    // Validar detalles solo si vienen
    if (data.detalles && data.detalles.length > 0) {
      await validarDetallesAsiento(data.detalles);
    }

    return await prisma.$transaction(async (tx) => {
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: { 
          empresaId: data.empresaId,
          periodoContableId: data.periodoContableId
        },
        orderBy: { correlativo: 'desc' }
      });
      const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
      const numeroAsiento = data.numeroAsiento || `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, '0')}`;

      const asiento = await tx.asientoContable.create({
        data: {
          empresaId: data.empresaId,
          periodoContableId: data.periodoContableId,
          numeroAsiento,
          correlativo,
          fechaAsiento: new Date(data.fechaAsiento),
          glosa: data.glosa || '',
          tipoLibro: data.tipoLibro || 'FISCAL',
          origenAsiento: data.origenAsiento || 'MANUAL',
          estadoId: data.estadoId,
          totalDebe: data.totalDebe || 0,
          totalHaber: data.totalHaber || 0,
          diferencia: data.diferencia || 0,
          estaCuadrado: data.estaCuadrado || false,
          monedaId: data.monedaId,
          tipoCambio: data.tipoCambio,
          creadoPor: data.creadoPor
        }
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
                codigoCuenta: detalle.codigoCuenta,
                nombreCuenta: detalle.nombreCuenta,
                glosa: detalle.glosa,
                debe: detalle.debe || 0,
                haber: detalle.haber || 0,
                monedaId: detalle.monedaId,
                tipoCambio: detalle.tipoCambio,
                creadoPor: data.creadoPor
              }
            })
          )
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
              planCuenta: true
            },
            orderBy: { numeroLinea: 'asc' }
          }
        }
      });
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.asientoContable.findUnique({ 
      where: { id },
      include: { periodoContable: true }
    });
    if (!existente) throw new NotFoundError('Asiento contable no encontrado');

    // Solo se pueden modificar asientos en estado PENDIENTE (76)
    if (Number(existente.estadoId) !== 76) {
      throw new ConflictError('Solo se pueden modificar asientos en estado PENDIENTE (76).');
    }

    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'ABIERTO' }
    });
    if (!estadoPeriodoAbierto || Number(existente.periodoContable.estadoId) !== Number(estadoPeriodoAbierto.id)) {
      throw new ConflictError('No se puede modificar un asiento de un período que no está ABIERTO.');
    }

    await validarAsientoContable({ ...data, id });
    
    if (data.detalles && data.detalles.length > 0) {
      await validarDetallesAsiento(data.detalles);
    }

    return await prisma.$transaction(async (tx) => {
      await tx.asientoContable.update({
        where: { id },
        data: {
          fechaAsiento: data.fechaAsiento ? new Date(data.fechaAsiento) : undefined,
          glosa: data.glosa,
          tipoLibro: data.tipoLibro,
          origenAsiento: data.origenAsiento,
          monedaId: data.monedaId,
          tipoCambio: data.tipoCambio,
          totalDebe: data.totalDebe,
          totalHaber: data.totalHaber,
          diferencia: data.diferencia,
          estaCuadrado: data.estaCuadrado,
          actualizadoPor: data.actualizadoPor
        }
      });

      if (data.detalles && data.detalles.length > 0) {
        await tx.detalleAsientoContable.deleteMany({
          where: { asientoContableId: id }
        });

        await Promise.all(
          data.detalles.map((detalle) =>
            tx.detalleAsientoContable.create({
              data: {
                asientoContableId: id,
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                codigoCuenta: detalle.codigoCuenta,
                nombreCuenta: detalle.nombreCuenta,
                glosa: detalle.glosa,
                debe: detalle.debe || 0,
                haber: detalle.haber || 0,
                monedaId: detalle.monedaId,
                tipoCambio: detalle.tipoCambio,
                actualizadoPor: data.actualizadoPor
              }
            })
          )
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
              planCuenta: true
            },
            orderBy: { numeroLinea: 'asc' }
          }
        }
      });
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.asientoContable.findUnique({
      where: { id },
      include: { 
        periodoContable: true,
        detalles: true
      }
    });

    if (!existente) throw new NotFoundError('Asiento contable no encontrado');

    // Solo se pueden eliminar asientos en estado PENDIENTE (76)
    if (Number(existente.estadoId) !== 76) {
      throw new ConflictError('Solo se pueden eliminar asientos en estado PENDIENTE (76).');
    }

    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'ABIERTO' }
    });
    if (!estadoPeriodoAbierto || Number(existente.periodoContable.estadoId) !== Number(estadoPeriodoAbierto.id)) {
      throw new ConflictError('No se puede eliminar un asiento de un período que no está ABIERTO.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.detalleAsientoContable.deleteMany({
        where: { asientoContableId: id }
      });
      await tx.asientoContable.delete({ where: { id } });
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
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
            planCuenta: true
          },
          orderBy: { numeroLinea: 'asc' }
        }
      },
      orderBy: { fechaAsiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
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
            planCuenta: true
          },
          orderBy: { numeroLinea: 'asc' }
        }
      },
      orderBy: { fechaAsiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const aprobarAsiento = async (id, aprobadoPorId) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      include: { periodoContable: true, detalles: true, estado: true }
    });

    if (!asiento) throw new NotFoundError('Asiento contable no encontrado');

    // Solo se pueden aprobar asientos en estado PENDIENTE (76)
    if (Number(asiento.estadoId) !== 76) {
      throw new ConflictError('Solo se pueden aprobar asientos en estado PENDIENTE (76).');
    }

    // Validar que tenga al menos un detalle
    if (!asiento.detalles || asiento.detalles.length === 0) {
      throw new ValidationError('El asiento no tiene detalles. Debe agregar al menos un detalle antes de aprobar.');
    }

    // Validar que esté cuadrado
    if (!asiento.estaCuadrado) {
      throw new ConflictError('El asiento no está cuadrado (debe = haber). No se puede aprobar.');
    }

    // Validar que el período esté abierto
    const estadoPeriodoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'ABIERTO' }
    });
    if (!estadoPeriodoAbierto || Number(asiento.periodoContable.estadoId) !== Number(estadoPeriodoAbierto.id)) {
      throw new ConflictError('No se puede aprobar un asiento de un período que no está ABIERTO.');
    }

    // Validar que el estado APROBADO (77) exista
    const estadoAprobado = await prisma.estadoMultiFuncion.findUnique({ where: { id: BigInt(77) } });
    if (!estadoAprobado) {
      throw new ValidationError('Estado APROBADO (77) no encontrado en el sistema.');
    }

    return await prisma.asientoContable.update({
      where: { id },
      data: {
        estadoId: BigInt(77), // Estado APROBADO
        fechaAprobacion: new Date(),
        aprobadoPor: aprobadoPorId
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
            planCuenta: true
          },
          orderBy: { numeroLinea: 'asc' }
        }
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const anularAsiento = async (id, anuladoPorId, motivoAnulacion) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      include: { periodoContable: true, estado: true }
    });

    if (!asiento) throw new NotFoundError('Asiento contable no encontrado');

    // Solo se pueden anular asientos APROBADOS (77)
    if (Number(asiento.estadoId) !== 77) {
      throw new ConflictError('Solo se pueden anular asientos APROBADOS (77).');
    }

    const estadoPeriodoBloqueado = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'BLOQUEADO' }
    });
    if (estadoPeriodoBloqueado && Number(asiento.periodoContable.estadoId) === Number(estadoPeriodoBloqueado.id)) {
      throw new ConflictError('No se puede anular un asiento de un período BLOQUEADO.');
    }

    if (!motivoAnulacion) {
      throw new ValidationError('Debe proporcionar un motivo de anulación.');
    }

    // Validar que el estado ANULADO (78) exista
    const estadoAnulado = await prisma.estadoMultiFuncion.findUnique({ where: { id: BigInt(78) } });
    if (!estadoAnulado) {
      throw new ValidationError('Estado ANULADO (78) no encontrado en el sistema.');
    }

    return await prisma.asientoContable.update({
      where: { id },
      data: {
        estadoId: BigInt(78), // Estado ANULADO
        fechaAnulacion: new Date(),
        anuladoPor: anuladoPorId,
        motivoAnulacion
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
            planCuenta: true
          },
          orderBy: { numeroLinea: 'asc' }
        }
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
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
      origenAsiento: 'AUTOMATICO'
    };

    // Si se proporciona submoduloId, agregarlo al filtro
    if (submoduloId) {
      whereClause.submoduloOrigenId = Number(submoduloId);
    }

    const asientos = await prisma.asientoContable.findMany({
      where: whereClause,
      include: incluirRelaciones,
      orderBy: {
        fechaAsiento: 'desc'
      }
    });

    return asientos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar asientos por movimiento', err.message);
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
  listarPorEmpresa,
  listarPorPeriodo,
  aprobarAsiento,
  anularAsiento,
  listarPorMovimiento
};