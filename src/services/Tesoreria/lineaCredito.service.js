import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LineaCredito
 * Gestiona líneas de crédito bancarias revolventes y sus utilizaciones.
 * Documentado en español.
 */

/**
 * Valida los datos de una línea de crédito.
 * @param {Object} data - Datos de la línea de crédito
 */
async function validarLineaCredito(data) {
  // Validar empresa
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) {
      throw new ValidationError('La empresa referenciada no existe.');
    }
  }

  // Validar banco
  if (data.bancoId) {
    const banco = await prisma.banco.findUnique({ where: { id: data.bancoId } });
    if (!banco) {
      throw new ValidationError('El banco referenciado no existe.');
    }
  }

  // Validar moneda
  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) {
      throw new ValidationError('La moneda referenciada no existe.');
    }
  }

  // Validar estado
  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) {
      throw new ValidationError('El estado referenciado no existe.');
    }
  }

  // Validar número de línea único por empresa
  if (data.numeroLinea && data.empresaId) {
    const existente = await prisma.lineaCredito.findFirst({
      where: {
        empresaId: data.empresaId,
        numeroLinea: data.numeroLinea,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`El número de línea "${data.numeroLinea}" ya existe para esta empresa.`);
    }
  }

  // Validar tipo de línea
  if (data.tipoLinea) {
    const tiposValidos = ['REVOLVENTE', 'CARTA_CREDITO', 'GARANTIA_BANCARIA', 'SOBREGIRO'];
    if (!tiposValidos.includes(data.tipoLinea)) {
      throw new ValidationError('El tipo de línea de crédito no es válido.');
    }
  }

  // Validar fechas
  if (data.fechaAprobacion && data.fechaVencimiento) {
    if (new Date(data.fechaVencimiento) <= new Date(data.fechaAprobacion)) {
      throw new ValidationError('La fecha de vencimiento debe ser posterior a la fecha de aprobación.');
    }
  }

  // Validar montos
  if (data.montoUtilizado && data.montoAprobado) {
    if (data.montoUtilizado > data.montoAprobado) {
      throw new ValidationError('El monto utilizado no puede ser mayor al monto aprobado.');
    }
  }
}

/**
 * Actualiza los saldos de una línea de crédito.
 * @param {BigInt} lineaCreditoId - ID de la línea de crédito
 */
async function actualizarSaldosLinea(lineaCreditoId) {
  const utilizaciones = await prisma.utilizacionLineaCredito.findMany({
    where: { 
      lineaCreditoId,
      estadoUtilizacion: 'VIGENTE'
    }
  });

  const montoUtilizado = utilizaciones.reduce((sum, u) => sum + parseFloat(u.montoUtilizado), 0);

  const linea = await prisma.lineaCredito.findUnique({
    where: { id: lineaCreditoId }
  });

  const montoDisponible = parseFloat(linea.montoAprobado) - montoUtilizado;

  await prisma.lineaCredito.update({
    where: { id: lineaCreditoId },
    data: {
      montoUtilizado,
      montoDisponible
    }
  });
}

/**
 * Lista todas las líneas de crédito.
 */
const listar = async () => {
  try {
    return await prisma.lineaCredito.findMany({
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        utilizaciones: {
          where: { estadoUtilizacion: 'VIGENTE' },
          orderBy: { fechaUtilizacion: 'desc' }
        }
      },
      orderBy: { fechaAprobacion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una línea de crédito por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const linea = await prisma.lineaCredito.findUnique({
      where: { id },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        utilizaciones: {
          orderBy: { fechaUtilizacion: 'desc' }
        }
      }
    });
    if (!linea) throw new NotFoundError('Línea de crédito no encontrada');
    return linea;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva línea de crédito.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.empresaId || !data.bancoId || !data.numeroLinea || !data.tipoLinea || 
        !data.montoAprobado || !data.monedaId || !data.tasaInteres || 
        !data.fechaAprobacion || !data.fechaVencimiento || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios para crear la línea de crédito.');
    }

    await validarLineaCredito(data);

    // Calcular montos iniciales
    const montoUtilizado = 0;
    const montoDisponible = parseFloat(data.montoAprobado);

    return await prisma.lineaCredito.create({
      data: {
        ...data,
        montoUtilizado,
        montoDisponible
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true
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
 * Actualiza una línea de crédito existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.lineaCredito.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Línea de crédito no encontrada');

    await validarLineaCredito({ ...data, id });

    return await prisma.lineaCredito.update({
      where: { id },
      data,
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        utilizaciones: {
          orderBy: { fechaUtilizacion: 'desc' }
        }
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
 * Elimina una línea de crédito por ID.
 * Valida que no tenga utilizaciones vigentes.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.lineaCredito.findUnique({
      where: { id },
      include: {
        utilizaciones: true
      }
    });

    if (!existente) throw new NotFoundError('Línea de crédito no encontrada');

    // Validar que no tenga utilizaciones vigentes
    const utilizacionesVigentes = existente.utilizaciones.filter(u => u.estadoUtilizacion === 'VIGENTE');
    if (utilizacionesVigentes.length > 0) {
      throw new ConflictError('No se puede eliminar la línea de crédito porque tiene utilizaciones vigentes.');
    }

    await prisma.lineaCredito.delete({ where: { id } });
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
 * Registra una utilización de línea de crédito.
 */
const registrarUtilizacion = async (lineaCreditoId, dataUtilizacion) => {
  try {
    const linea = await prisma.lineaCredito.findUnique({ where: { id: lineaCreditoId } });
    if (!linea) throw new NotFoundError('Línea de crédito no encontrada');

    const { fechaUtilizacion, montoUtilizado, movimientoCajaUtilizacionId, observaciones } = dataUtilizacion;

    if (!fechaUtilizacion || !montoUtilizado) {
      throw new ValidationError('Fecha de utilización y monto son obligatorios.');
    }

    // Validar que haya saldo disponible
    if (montoUtilizado > linea.montoDisponible) {
      throw new ValidationError(`Monto insuficiente. Disponible: ${linea.montoDisponible}`);
    }

    // Obtener número de utilización
    const ultimaUtilizacion = await prisma.utilizacionLineaCredito.findFirst({
      where: { lineaCreditoId },
      orderBy: { numeroUtilizacion: 'desc' }
    });
    const numeroUtilizacion = ultimaUtilizacion ? ultimaUtilizacion.numeroUtilizacion + 1 : 1;

    // Crear utilización en una transacción
    const utilizacion = await prisma.$transaction(async (tx) => {
      const nueva = await tx.utilizacionLineaCredito.create({
        data: {
          lineaCreditoId,
          numeroUtilizacion,
          fechaUtilizacion,
          montoUtilizado,
          estadoUtilizacion: 'VIGENTE',
          movimientoCajaUtilizacionId: movimientoCajaUtilizacionId || null,
          observaciones: observaciones || null
        }
      });

      // Actualizar saldos de la línea
      await actualizarSaldosLinea(lineaCreditoId);

      // Actualizar estado de la línea a VIGENTE (ID 87) si está APROBADA
      if (linea.estadoId === 86) {
        await tx.lineaCredito.update({
          where: { id: lineaCreditoId },
          data: { estadoId: 87 }
        });
      }

      return nueva;
    });

    return await prisma.utilizacionLineaCredito.findUnique({
      where: { id: utilizacion.id },
      include: {
        lineaCredito: {
          include: {
            empresa: true,
            banco: true,
            moneda: true
          }
        },
        movimientoCajaUtilizacion: true
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
 * Registra la devolución de una utilización.
 */
const registrarDevolucion = async (utilizacionId, dataDevolucion) => {
  try {
    const utilizacion = await prisma.utilizacionLineaCredito.findUnique({
      where: { id: utilizacionId },
      include: { lineaCredito: true }
    });

    if (!utilizacion) throw new NotFoundError('Utilización no encontrada');

    if (utilizacion.estadoUtilizacion !== 'VIGENTE') {
      throw new ConflictError('La utilización ya fue devuelta o está vencida.');
    }

    const { fechaDevolucion, montoDevuelto, interesesPagados, movimientoCajaDevolucionId, asientoContableId, observaciones } = dataDevolucion;

    if (!fechaDevolucion || !montoDevuelto) {
      throw new ValidationError('Fecha de devolución y monto devuelto son obligatorios.');
    }

    // Actualizar utilización en una transacción
    const utilizacionActualizada = await prisma.$transaction(async (tx) => {
      const updated = await tx.utilizacionLineaCredito.update({
        where: { id: utilizacionId },
        data: {
          fechaDevolucion,
          montoDevuelto,
          interesesPagados: interesesPagados || null,
          estadoUtilizacion: 'DEVUELTO',
          movimientoCajaDevolucionId: movimientoCajaDevolucionId || null,
          asientoContableId: asientoContableId || null,
          observaciones: observaciones || null
        }
      });

      // Actualizar saldos de la línea
      await actualizarSaldosLinea(utilizacion.lineaCreditoId);

      return updated;
    });

    return await prisma.utilizacionLineaCredito.findUnique({
      where: { id: utilizacionActualizada.id },
      include: {
        lineaCredito: true,
        movimientoCajaUtilizacion: true,
        movimientoCajaDevolucion: true,
        asientoContable: true
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
 * Lista líneas de crédito por empresa.
 */
const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.lineaCredito.findMany({
      where: { empresaId },
      include: {
        banco: true,
        moneda: true,
        estado: true,
        utilizaciones: {
          where: { estadoUtilizacion: 'VIGENTE' }
        }
      },
      orderBy: { fechaAprobacion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista líneas de crédito vigentes.
 */
const listarVigentes = async () => {
  try {
    // Estados: 86=APROBADA, 87=VIGENTE
    return await prisma.lineaCredito.findMany({
      where: {
        estadoId: { in: [86, 87] }
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true
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
 * Lista utilizaciones de una línea de crédito.
 */
const listarUtilizaciones = async (lineaCreditoId) => {
  try {
    return await prisma.utilizacionLineaCredito.findMany({
      where: { lineaCreditoId },
      include: {
        movimientoCajaUtilizacion: true,
        movimientoCajaDevolucion: true,
        asientoContable: true
      },
      orderBy: { fechaUtilizacion: 'desc' }
    });
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
  registrarUtilizacion,
  registrarDevolucion,
  listarPorEmpresa,
  listarVigentes,
  listarUtilizaciones
};
