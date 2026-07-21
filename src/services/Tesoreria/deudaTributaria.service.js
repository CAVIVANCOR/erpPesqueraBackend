import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';
import { SUBMODULO_ORIGEN } from '../../utils/submodulos.constants.js';
/**
 * Servicio CRUD para DeudaTributaria
 * Gestiona las deudas tributarias con SUNAT, ESSALUD, ONP, etc.
 * Documentado en español.
 */

/**
 * Estados disponibles para deudas tributarias (tipoProvieneDeId = 27)
 * Estos estados se obtienen de EstadoMultiFuncion
 * - 120: PENDIENTE (danger) - Deuda sin pagos
 * - 121: PAGO PARCIAL (warning) - Deuda con pagos parciales
 * - 122: PAGADO (success) - Deuda totalmente pagada
 * - 123: VENCIDO (danger) - Deuda vencida sin pagar completamente
 * - 124: ANULADO (secondary) - Deuda anulada
 * - 125: CANJEADO (contrast) - Deuda canjeada por otro documento
 */
const ESTADO_DEFAULT_PENDIENTE = 120;

const ESTADOS_DEUDA_TRIBUTARIA = {
  PENDIENTE: 120,
  PAGO_PARCIAL: 121,
  PAGADO: 122,
  VENCIDO: 123,
  ANULADO: 124,
  CANJEADO: 125,
};

async function validarDeudaTributaria(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.tipoDeudaId) {
    const tipo = await prisma.tipoDeudaTributaria.findUnique({ where: { id: data.tipoDeudaId } });
    if (!tipo) throw new ValidationError('El tipo de deuda referenciado no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.montoOriginal !== undefined && data.montoOriginal < 0) {
    throw new ValidationError('El monto original no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoPagado < 0) {
    throw new ValidationError('El monto pagado no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoOriginal !== undefined && data.montoPagado > data.montoOriginal) {
    throw new ValidationError('El monto pagado no puede ser mayor al monto original.');
  }
}

const listar = async () => {
  try {
    return await prisma.deudaTributaria.findMany({
      include: {
        empresa: true,
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
        moneda: true,
        estado: true,
        periodoContable: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
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
    const deuda = await prisma.deudaTributaria.findUnique({
      where: { id },
      include: {
        empresa: true,
        tipoDeuda: {
          include: {
            entidadRecaudadora: true,
            cuentaContable: true
          }
        },
        moneda: true,
        estado: true,
        periodoContable: true,
        pagos: {
          include: {
            medioPago: true,
            movimientoCaja: true
          },
          orderBy: { fechaPago: 'desc' }
        }
      }
    });
    if (!deuda) throw new NotFoundError('Deuda tributaria no encontrada');
    return deuda;
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
    if (!data.empresaId || !data.tipoDeudaId || !data.periodo || !data.fechaGeneracion || !data.montoOriginal || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarDeudaTributaria(data);

    const deudaData = {
      ...data,
      montoPagadoAnterior: data.montoPagadoAnterior || 0,
      montoPagado: data.montoPagado || 0,
      saldoPendiente: (data.montoOriginal || 0) - (data.montoPagadoAnterior || 0) - (data.montoPagado || 0),
      esSaldoInicial: data.esSaldoInicial !== undefined ? data.esSaldoInicial : false,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      moduloOrigenId: data.moduloOrigenId || null,
      origenId: data.origenId || null,
      creadoPor: data.creadoPor || null
    };

    return await prisma.deudaTributaria.create({ data: deudaData });
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
    const existente = await prisma.deudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Deuda tributaria no encontrada');

    await validarDeudaTributaria({ ...data, id });

    // ✅ RECALCULAR montoPagado desde los pagos reales
    const pagos = await prisma.pagoDeudaTributaria.findMany({
      where: { deudaTributariaId: id }
    });

    const montoPagadoRecalculado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoPago || 0),
      0
    );

    // Calcular saldo pendiente
    const montoOriginal = data.montoOriginal !== undefined ? data.montoOriginal : existente.montoOriginal;
    const montoPagadoAnterior = data.montoPagadoAnterior !== undefined ? data.montoPagadoAnterior : (existente.montoPagadoAnterior || 0);
    const montoPagado = montoPagadoRecalculado;
    const saldoPendiente = Number(montoOriginal) - Number(montoPagadoAnterior) - Number(montoPagado);

    const deudaData = {
      ...data,
      montoPagado, // ✅ Forzar el montoPagado recalculado
      saldoPendiente,
      actualizadoPor: data.actualizadoPor || null
    };

    return await prisma.deudaTributaria.update({
      where: { id },
      data: deudaData
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.deudaTributaria.findUnique({
      where: { id },
      include: { pagos: true }
    });

    if (!existente) throw new NotFoundError('Deuda tributaria no encontrada');

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError('No se puede eliminar la deuda porque tiene pagos asociados.');
    }

    await prisma.deudaTributaria.delete({ where: { id } });
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
    return await prisma.deudaTributaria.findMany({
      where: { empresaId },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPendientes = async (empresaId) => {
  try {
    return await prisma.deudaTributaria.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 }
      },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
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

const listarVencidas = async (empresaId) => {
  try {
    const hoy = new Date();
    return await prisma.deudaTributaria.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 }
      },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
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

const listarPorTipo = async (tipoDeudaId) => {
  try {
    return await prisma.deudaTributaria.findMany({
      where: { tipoDeudaId },
      include: {
        empresa: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorPeriodo = async (empresaId, periodo) => {
  try {
    return await prisma.deudaTributaria.findMany({
      where: {
        empresaId,
        periodo
      },
      include: {
        tipoDeuda: {
          include: {
            entidadRecaudadora: true
          }
        },
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaGeneracion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};


/**
 * Genera un borrador de asiento contable para una Deuda Tributaria (solo Saldos Iniciales)
 * NO lo guarda en BD, solo retorna la estructura para edición
 * 
 * ASIENTO SALDO INICIAL:
 * DEBE: Cuenta del Tipo de Deuda (40.1.1, 40.2.1, etc.)
 * HABER: 591101 (Utilidades Acumuladas)
 * 
 * @param {BigInt} deudaTributariaId - ID de la Deuda Tributaria
 * @returns {Promise<Object>} - Borrador del asiento contable
 */
const generarBorradorAsiento = async (deudaTributariaId) => {
  try {
    const deuda = await prisma.deudaTributaria.findUnique({
      where: { id: deudaTributariaId },
      include: {
        empresa: true,
        tipoDeuda: {
          include: {
            cuentaContable: true,
          },
        },
        moneda: true,
        periodoContable: true,
      },
    });

    if (!deuda) {
      throw new NotFoundError('Deuda Tributaria no encontrada');
    }

    if (!deuda.periodoContable) {
      throw new ValidationError(
        'La Deuda Tributaria no tiene un período contable asignado.'
      );
    }

    // ⭐ Solo generar asientos para Saldos Iniciales
    if (!deuda.esSaldoInicial) {
      throw new ValidationError(
        'Solo se pueden generar asientos para Saldos Iniciales. Las deudas normales se contabilizan automáticamente desde su origen.'
      );
    }

    // Validar cuenta contable del tipo de deuda
    if (!deuda.tipoDeuda?.cuentaContableId || !deuda.tipoDeuda?.cuentaContable) {
      throw new ValidationError(
        `El tipo de deuda "${deuda.tipoDeuda?.nombre || 'desconocido'}" no tiene una cuenta contable asociada. ` +
        'Configure el tipo de deuda antes de generar el asiento.'
      );
    }

    // Buscar cuenta de Utilidades Acumuladas (591101)
    const cuentaUtilidades = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: '591101',
        activo: true,
      },
    });

    if (!cuentaUtilidades) {
      throw new ValidationError(
        'No se encontró la cuenta 591101 (Utilidades Acumuladas). ' +
        'Configure el plan de cuentas antes de generar el asiento para Saldos Iniciales.'
      );
    }

    const montoOriginal = Number(deuda.montoOriginal);

    if (montoOriginal === 0) {
      throw new ValidationError(
        'El monto de la deuda está en cero. Verifique los datos antes de generar el asiento.'
      );
    }

    // Generar glosa descriptiva
    const tipoDeudaNombre = deuda.tipoDeuda?.nombre || 'Deuda Tributaria';
    const periodo = deuda.periodo || '';
    const glosa = `Saldo Inicial ${tipoDeudaNombre} ${periodo}`.trim();

    // Crear borrador del asiento
    const borrador = {
      empresaId: deuda.empresaId,
      periodoContableId: deuda.periodoContableId,
      fechaAsiento: deuda.fechaContable || deuda.fechaGeneracion,
      glosa: glosa,
      tipoLibro: 'FISCAL',
      origenAsiento: 'AUTOMATICO',
      monedaId: deuda.monedaId,
      tipoCambio: 1, // Las deudas tributarias normalmente son en soles
      detalles: [
        {
          numeroLinea: 1,
          planCuentaId: deuda.tipoDeuda.cuentaContableId,
          planCuenta: deuda.tipoDeuda.cuentaContable,
          glosa: glosa,
          debe: montoOriginal,
          haber: 0,
          monedaId: 1, // Soles
          tipoCambio: 1,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaUtilidades.id,
          planCuenta: cuentaUtilidades,
          glosa: glosa,
          debe: 0,
          haber: montoOriginal,
          monedaId: 1, // Soles
          tipoCambio: 1,
        },
      ],
    };

    // Validar que el borrador esté cuadrado
    const totalDebe = borrador.detalles.reduce((sum, d) => sum + Number(d.debe || 0), 0);
    const totalHaber = borrador.detalles.reduce((sum, d) => sum + Number(d.haber || 0), 0);
    const diferencia = totalDebe - totalHaber;

    if (Math.abs(diferencia) > 0.01) {
      throw new ValidationError(
        `Error al generar borrador: asiento descuadrado. Diferencia: ${diferencia.toFixed(2)}`
      );
    }

    return borrador;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) {
      throw err;
    }
    console.error('Error al generar borrador de asiento:', err);
    throw new DatabaseError('Error al generar borrador de asiento para Deuda Tributaria');
  }
};

/**
 * Genera y guarda el asiento contable para una Deuda Tributaria (solo Saldos Iniciales)
 * 
 * @param {BigInt} deudaTributariaId - ID de la Deuda Tributaria
 * @param {BigInt} usuarioId - ID del usuario que genera el asiento
 * @returns {Promise<Object>} - Asiento contable generado
 */
const generarAsientoContable = async (deudaTributariaId, usuarioId) => {
  try {
    const deuda = await obtenerPorId(deudaTributariaId);

    if (!deuda) {
      throw new NotFoundError('Deuda Tributaria no encontrada');
    }

    // Validar que sea saldo inicial
    if (!deuda.esSaldoInicial) {
      throw new ValidationError(
        'Solo se pueden generar asientos para Saldos Iniciales.'
      );
    }

    // Validar que no tenga asiento previo
    if (deuda.asientosContables && deuda.asientosContables.length > 0) {
      throw new ValidationError(
        'Esta Deuda Tributaria ya tiene un asiento contable asociado.'
      );
    }

    // Generar borrador
    const borrador = await generarBorradorAsiento(deudaTributariaId);

    // Crear el asiento usando el servicio de asientos
    const asiento = await asientoContableService.crear({
      ...borrador,
      submoduloOrigenId: BigInt(SUBMODULO_ORIGEN.DEUDA_TRIBUTARIA),
      procesoOrigenId: deudaTributariaId,
      creadoPor: usuarioId,
      deudasTributarias: {
        connect: { id: deudaTributariaId },
      },
    });

    return asiento;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) {
      throw err;
    }
    console.error('Error al generar asiento contable:', err);
    throw new DatabaseError('Error al generar asiento contable para Deuda Tributaria');
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  listarPendientes,
  listarVencidas,
  listarPorTipo,
  listarPorPeriodo,
  generarBorradorAsiento,
  generarAsientoContable,
};