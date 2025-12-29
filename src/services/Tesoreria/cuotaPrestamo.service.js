import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CuotaPrestamo
 * Gestiona las cuotas de préstamos bancarios y sus pagos.
 * Documentado en español.
 */

/**
 * Valida los datos de una cuota de préstamo.
 * @param {Object} data - Datos de la cuota
 */
async function validarCuotaPrestamo(data) {
  // Validar préstamo
  if (data.prestamoBancarioId) {
    const prestamo = await prisma.prestamoBancario.findUnique({ 
      where: { id: data.prestamoBancarioId } 
    });
    if (!prestamo) {
      throw new ValidationError('El préstamo bancario referenciado no existe.');
    }
  }

  // Validar movimiento de caja si existe
  if (data.movimientoCajaId) {
    const movimiento = await prisma.movimientoCaja.findUnique({ 
      where: { id: data.movimientoCajaId } 
    });
    if (!movimiento) {
      throw new ValidationError('El movimiento de caja referenciado no existe.');
    }
  }

  // Validar asiento contable si existe
  if (data.asientoContableId) {
    const asiento = await prisma.asientoContable.findUnique({ 
      where: { id: data.asientoContableId } 
    });
    if (!asiento) {
      throw new ValidationError('El asiento contable referenciado no existe.');
    }
  }

  // Validar estado de pago
  if (data.estadoPago) {
    const estadosValidos = ['PENDIENTE', 'PAGADO', 'VENCIDO', 'PARCIAL'];
    if (!estadosValidos.includes(data.estadoPago)) {
      throw new ValidationError('El estado de pago no es válido.');
    }
  }

  // Validar que monto pagado no sea mayor al monto total
  if (data.montoPagado && data.montoTotal) {
    if (data.montoPagado > data.montoTotal) {
      throw new ValidationError('El monto pagado no puede ser mayor al monto total de la cuota.');
    }
  }
}

/**
 * Calcula los días de mora de una cuota.
 * @param {Date} fechaVencimiento - Fecha de vencimiento
 * @param {Date} fechaPago - Fecha de pago (o fecha actual si no está pagada)
 * @returns {number} Días de mora
 */
function calcularDiasMora(fechaVencimiento, fechaPago = null) {
  const fechaComparacion = fechaPago ? new Date(fechaPago) : new Date();
  const fechaVenc = new Date(fechaVencimiento);
  
  if (fechaComparacion <= fechaVenc) {
    return 0;
  }
  
  const diferenciaMilisegundos = fechaComparacion - fechaVenc;
  const diasMora = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
  return diasMora;
}

/**
 * Actualiza los saldos del préstamo después de un pago.
 * @param {BigInt} prestamoBancarioId - ID del préstamo
 */
async function actualizarSaldosPrestamo(prestamoBancarioId) {
  const cuotas = await prisma.cuotaPrestamo.findMany({
    where: { prestamoBancarioId }
  });

  const capitalPagado = cuotas
    .filter(c => c.estadoPago === 'PAGADO')
    .reduce((sum, c) => sum + parseFloat(c.montoCapital), 0);

  const interesPagado = cuotas
    .filter(c => c.estadoPago === 'PAGADO')
    .reduce((sum, c) => sum + parseFloat(c.montoInteres), 0);

  const prestamo = await prisma.prestamoBancario.findUnique({
    where: { id: prestamoBancarioId }
  });

  const saldoCapital = parseFloat(prestamo.montoDesembolsado) - capitalPagado;
  const saldoInteres = 0; // Se recalcula según cuotas pendientes

  await prisma.prestamoBancario.update({
    where: { id: prestamoBancarioId },
    data: {
      capitalPagado,
      interesPagado,
      saldoCapital,
      saldoInteres
    }
  });
}

/**
 * Lista todas las cuotas de préstamo.
 */
const listar = async () => {
  try {
    return await prisma.cuotaPrestamo.findMany({
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        },
        movimientoCaja: true,
        asientoContable: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una cuota de préstamo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const cuota = await prisma.cuotaPrestamo.findUnique({
      where: { id },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        },
        movimientoCaja: true,
        asientoContable: true
      }
    });
    if (!cuota) throw new NotFoundError('Cuota de préstamo no encontrada');
    return cuota;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva cuota de préstamo.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.prestamoBancarioId || !data.numeroCuota || !data.fechaVencimiento || 
        !data.montoCapital || !data.montoInteres || !data.montoTotal || 
        !data.saldoCapitalAntes || !data.saldoCapitalDespues || !data.estadoPago) {
      throw new ValidationError('Faltan campos obligatorios para crear la cuota.');
    }

    await validarCuotaPrestamo(data);

    return await prisma.cuotaPrestamo.create({ 
      data,
      include: {
        prestamo: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza una cuota de préstamo existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cuotaPrestamo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cuota de préstamo no encontrada');

    await validarCuotaPrestamo({ ...data, id });

    return await prisma.cuotaPrestamo.update({
      where: { id },
      data,
      include: {
        prestamo: true,
        movimientoCaja: true,
        asientoContable: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Elimina una cuota de préstamo por ID.
 * Solo permite eliminar cuotas pendientes.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.cuotaPrestamo.findUnique({ where: { id } });

    if (!existente) throw new NotFoundError('Cuota de préstamo no encontrada');

    // Validar que la cuota esté pendiente
    if (existente.estadoPago !== 'PENDIENTE') {
      throw new ConflictError('Solo se pueden eliminar cuotas pendientes.');
    }

    await prisma.cuotaPrestamo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Registra el pago de una cuota.
 */
const registrarPago = async (id, dataPago) => {
  try {
    const cuota = await prisma.cuotaPrestamo.findUnique({
      where: { id },
      include: { prestamo: true }
    });

    if (!cuota) throw new NotFoundError('Cuota de préstamo no encontrada');

    if (cuota.estadoPago === 'PAGADO') {
      throw new ConflictError('La cuota ya está pagada.');
    }

    const { fechaPago, montoPagado, movimientoCajaId, asientoContableId, observaciones } = dataPago;

    if (!fechaPago || !montoPagado) {
      throw new ValidationError('Fecha de pago y monto pagado son obligatorios.');
    }

    // Calcular días de mora
    const diasMora = calcularDiasMora(cuota.fechaVencimiento, fechaPago);
    
    // Calcular mora si hay atraso
    let montoMora = 0;
    if (diasMora > 0 && cuota.prestamo.tasaMoratoria) {
      const tasaMoraDiaria = parseFloat(cuota.prestamo.tasaMoratoria) / 100 / 365;
      montoMora = parseFloat(cuota.montoTotal) * tasaMoraDiaria * diasMora;
    }

    // Determinar estado de pago
    let estadoPago = 'PAGADO';
    if (montoPagado < cuota.montoTotal) {
      estadoPago = 'PARCIAL';
    }

    // Actualizar cuota en una transacción
    const cuotaActualizada = await prisma.$transaction(async (tx) => {
      const updated = await tx.cuotaPrestamo.update({
        where: { id },
        data: {
          fechaPago,
          montoPagado,
          montoMora: montoMora > 0 ? montoMora : null,
          diasMora: diasMora > 0 ? diasMora : null,
          estadoPago,
          movimientoCajaId: movimientoCajaId || null,
          asientoContableId: asientoContableId || null,
          observaciones: observaciones || null
        },
        include: {
          prestamo: true,
          movimientoCaja: true,
          asientoContable: true
        }
      });

      // Actualizar saldos del préstamo
      await actualizarSaldosPrestamo(cuota.prestamoBancarioId);

      // Verificar si todas las cuotas están pagadas para cambiar estado del préstamo
      const cuotasPendientes = await tx.cuotaPrestamo.count({
        where: {
          prestamoBancarioId: cuota.prestamoBancarioId,
          estadoPago: { in: ['PENDIENTE', 'VENCIDO', 'PARCIAL'] }
        }
      });

      if (cuotasPendientes === 0) {
        // Todas las cuotas pagadas, actualizar estado del préstamo a PAGADO (ID 82)
        await tx.prestamoBancario.update({
          where: { id: cuota.prestamoBancarioId },
          data: { estadoId: 82 }
        });
      }

      return updated;
    });

    return cuotaActualizada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista cuotas por préstamo.
 */
const listarPorPrestamo = async (prestamoBancarioId) => {
  try {
    return await prisma.cuotaPrestamo.findMany({
      where: { prestamoBancarioId },
      include: {
        movimientoCaja: true,
        asientoContable: true
      },
      orderBy: { numeroCuota: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista cuotas pendientes de pago.
 */
const listarPendientes = async () => {
  try {
    return await prisma.cuotaPrestamo.findMany({
      where: {
        estadoPago: { in: ['PENDIENTE', 'VENCIDO', 'PARCIAL'] }
      },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista cuotas vencidas.
 */
const listarVencidas = async () => {
  try {
    const hoy = new Date();
    return await prisma.cuotaPrestamo.findMany({
      where: {
        fechaVencimiento: { lt: hoy },
        estadoPago: { in: ['PENDIENTE', 'VENCIDO', 'PARCIAL'] }
      },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza estados de cuotas vencidas.
 */
const actualizarEstadosVencidos = async () => {
  try {
    const hoy = new Date();
    const resultado = await prisma.cuotaPrestamo.updateMany({
      where: {
        fechaVencimiento: { lt: hoy },
        estadoPago: 'PENDIENTE'
      },
      data: {
        estadoPago: 'VENCIDO'
      }
    });
    return resultado;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
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
  registrarPago,
  listarPorPrestamo,
  listarPendientes,
  listarVencidas,
  actualizarEstadosVencidos
};
