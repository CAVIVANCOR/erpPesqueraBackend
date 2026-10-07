import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';
import { TIPO_LIBRO } from '../../utils/tiposLibroContable.js';
import { obtenerTipoCambioSunat } from '../../utils/tipoCambio.util.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';
import { ESTADO_PERIODO_CONTABLE } from '../../utils/estados.constants.js';

/**
 * Servicio CRUD para DeudaConPersonal
 * Gestiona las deudas con trabajadores (sueldos, comisiones, etc.)
 * Documentado en español.
 */

async function validarDeudaConPersonal(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.personalId) {
    const personal = await prisma.personal.findUnique({ where: { id: data.personalId } });
    if (!personal) throw new ValidationError('El personal referenciado no existe.');
  }

  if (data.tipoDeudaId) {
    const tipo = await prisma.tipoDeudaPersonal.findUnique({ where: { id: data.tipoDeudaId } });
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
    return await prisma.deudaConPersonal.findMany({
      include: {
        empresa: true,
        personal: true,
        tipoDeuda: true,
        moneda: true,
        estado: true,
        periodoContable: true,
        pagos: true,
        // Solo para saber si está contabilizada (tiene al menos un asiento vinculado)
        asientosContables: { select: { id: true }, take: 1 }
      },
      orderBy: { fecha: 'desc' }
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
    const deuda = await prisma.deudaConPersonal.findUnique({
      where: { id },
      include: {
        empresa: true,
        personal: true,
        tipoDeuda: true,
        moneda: true,
        estado: true,
        periodoContable: true,
        asientosContables: {
          include: {
            estado: true,
            moneda: true,
            detalles: {
              include: {
                planCuenta: true,
                moneda: true
              }
            }
          }
        },
        pagos: {
          include: {
            medioPago: true,
            movimientoCaja: true
          },
          orderBy: { fechaPago: 'desc' }
        }
      }
    });
    if (!deuda) throw new NotFoundError('Deuda con personal no encontrada');
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
    if (!data.empresaId || !data.personalId || !data.tipoDeudaId || !data.fecha || !data.montoOriginal || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarDeudaConPersonal(data);

    const deudaData = {
      empresaId: Number(data.empresaId),
      personalId: Number(data.personalId),
      tipoDeudaId: Number(data.tipoDeudaId),
      fecha: data.fecha,
      fechaVencimiento: data.fechaVencimiento,
      numeroDocumento: data.numeroDocumento || null,
      montoPagadoAnterior: Number(data.montoPagadoAnterior || 0),
      montoOriginal: Number(data.montoOriginal),
      montoPagado: Number(data.montoPagado || 0),
      saldoPendiente: Number(data.montoOriginal || 0) - Number(data.montoPagadoAnterior || 0) - Number(data.montoPagado || 0),
      monedaId: Number(data.monedaId),
      estadoId: Number(data.estadoId),
      esGerencial: data.esGerencial !== undefined ? Boolean(data.esGerencial) : false,
      esSaldoInicial: data.esSaldoInicial !== undefined ? Boolean(data.esSaldoInicial) : false,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId ? Number(data.periodoContableId) : null,
      moduloOrigenId: data.moduloOrigenId ? Number(data.moduloOrigenId) : null,
      origenId: data.origenId ? Number(data.origenId) : null,
      observaciones: data.observaciones || null,
      creadoPor: data.creadoPor ? Number(data.creadoPor) : null,
      actualizadoPor: data.actualizadoPor ? Number(data.actualizadoPor) : null
    };

    return await prisma.deudaConPersonal.create({ data: deudaData });
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
    const existente = await prisma.deudaConPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Deuda con personal no encontrada');

    await validarDeudaConPersonal({ ...data, id });

    const pagos = await prisma.pagoDeudaPersonal.findMany({
      where: { deudaConPersonalId: id }
    });

    const montoPagadoRecalculado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoPago || 0),
      0
    );

    const montoOriginal = data.montoOriginal !== undefined ? data.montoOriginal : existente.montoOriginal;
    const montoPagado = montoPagadoRecalculado;
    const saldoPendiente = Number(montoOriginal) - Number(montoPagado);

    const deudaData = {
      ...data,
      montoPagado,
      saldoPendiente,
      actualizadoPor: data.actualizadoPor || null
    };

    return await prisma.deudaConPersonal.update({
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
    const existente = await prisma.deudaConPersonal.findUnique({
      where: { id },
      include: { pagos: true }
    });

    if (!existente) throw new NotFoundError('Deuda con personal no encontrada');

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError('No se puede eliminar la deuda porque tiene pagos asociados.');
    }

    await prisma.deudaConPersonal.delete({ where: { id } });
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
    return await prisma.deudaConPersonal.findMany({
      where: { empresaId },
      include: {
        personal: true,
        tipoDeuda: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fecha: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorPersonal = async (personalId) => {
  try {
    return await prisma.deudaConPersonal.findMany({
      where: { personalId },
      include: {
        empresa: true,
        tipoDeuda: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fecha: 'desc' }
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
    return await prisma.deudaConPersonal.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 }
      },
      include: {
        personal: true,
        tipoDeuda: true,
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
    return await prisma.deudaConPersonal.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 }
      },
      include: {
        personal: true,
        tipoDeuda: true,
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
    return await prisma.deudaConPersonal.findMany({
      where: { tipoDeudaId },
      include: {
        empresa: true,
        personal: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fecha: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Genera borrador de asiento contable para una deuda con personal
 * Retorna la estructura del asiento SIN guardarlo en BD
 * @param {BigInt} deudaId - ID de la deuda
 * @returns {Promise<Object>} Borrador del asiento
 */
const generarBorradorAsientoCTS = async (deudaId) => {
  try {
    // 1. Obtener la deuda con todas sus relaciones
    const deuda = await prisma.deudaConPersonal.findUnique({
      where: { id: deudaId },
      include: {
        empresa: true,
        personal: {
          include: {
            centroCosto: {
              include: {
                cuentaContable: true
              }
            }
          }
        },
        tipoDeuda: {
          include: {
            cuentaContable: true
          }
        },
        moneda: true,
        periodoContable: true
      }
    });

    if (!deuda) {
      throw new NotFoundError('Deuda con personal no encontrada');
    }

    // 2. Validar que tenga cuenta contable configurada
    if (!deuda.tipoDeuda?.cuentaContable) {
      throw new ValidationError(
        `El tipo de deuda "${deuda.tipoDeuda?.nombre}" no tiene cuenta contable configurada. Configure la cuenta 41.x correspondiente.`
      );
    }

    // 3. Obtener período contable
    let periodoContableId = deuda.periodoContableId;
    if (!periodoContableId) {
      const fechaContable = deuda.fechaContable || deuda.fecha;
      const periodoAbierto = await prisma.periodoContable.findFirst({
        where: {
          empresaId: deuda.empresaId,
          fechaInicio: { lte: fechaContable },
          fechaFin: { gte: fechaContable },
          estado: {
            descripcion: 'ABIERTO'
          }
        }
      });

      if (!periodoAbierto) {
        throw new ValidationError(
          `No existe un período contable ABIERTO para la fecha ${new Date(fechaContable).toLocaleDateString()}`
        );
      }
      periodoContableId = periodoAbierto.id;
    }

    // 4. Obtener cuenta de Utilidades Acumuladas
    const cuenta591101 = await prisma.planCuentasContable.findFirst({
      where: { codigoCuenta: '591101' }
    });

    if (!cuenta591101) {
      throw new ValidationError(
        'Falta cuenta contable del sistema. Debe configurar: 591101 (Utilidades Acumuladas)'
      );
    }

    const fechaAsiento = deuda.fechaContable || deuda.fecha;
    const montoOriginal = Number(deuda.montoOriginal);

    // ⭐ Obtener tipo de cambio para la fecha del asiento
    const tipoCambioDeuda = await obtenerTipoCambioSunat(new Date(fechaAsiento)) || 1;

    // ⭐ Convertir monto a soles si es moneda extranjera
    const MONEDA_USD_ID = 2;
    const montoEnSoles = Number(deuda.monedaId) === MONEDA_USD_ID
      ? Math.round(montoOriginal * tipoCambioDeuda * 100) / 100
      : montoOriginal;

    const borradores = [];
    // 5. GENERAR ASIENTO DE SALDO INICIAL
    if (deuda.esSaldoInicial) {
      const glosaAsiento = `SALDO INICIAL - ${deuda.tipoDeuda.nombre} - ${deuda.personal.nombres} ${deuda.personal.apellidos}`;

      borradores.push({
        empresaId: deuda.empresaId,
        periodoContableId: periodoContableId,
        fechaAsiento: fechaAsiento,
        glosa: glosaAsiento,
        tipoLibro: 'GERENCIAL',
        origenAsiento: 'AUTOMATICO',
        monedaId: deuda.monedaId,
        tipoCambio: tipoCambioDeuda,
        totalDebe: montoOriginal,
        totalHaber: montoOriginal,
        diferencia: 0,
        estaCuadrado: true,
        detalles: [
          {
            numeroLinea: 1,
            planCuentaId: cuenta591101.id,
            planCuenta: cuenta591101,
            glosa: glosaAsiento,
            debe: montoEnSoles,
            haber: 0,
            monedaId: 1,
            tipoCambio: tipoCambioDeuda,
            debeMonedaExtranjera: montoOriginal,
            haberMonedaExtranjera: 0
          },
          {
            numeroLinea: 2,
            planCuentaId: deuda.tipoDeuda.cuentaContable.id,
            planCuenta: deuda.tipoDeuda.cuentaContable,
            glosa: glosaAsiento,
            debe: 0,
            haber: montoEnSoles,
            monedaId: 1,
            tipoCambio: tipoCambioDeuda,
            debeMonedaExtranjera: 0,
            haberMonedaExtranjera: montoOriginal
          }
        ]
      });

    } else {
      // 6. CASO 2: PROVISIÓN MENSUAL (PENDIENTE DE IMPLEMENTAR)
      throw new ValidationError(
        'Las provisiones mensuales aún no están implementadas. Use solo "Saldo Inicial" por ahora.'
      );
    }

    return {
      deudaId: deuda.id,
      asientos: borradores
    };

  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar borrador de asiento', err.message);
    }
    throw err;
  }
};

/**
 * Guarda asiento(s) contable(s) para una deuda con personal
 * @param {BigInt} deudaId - ID de la deuda
 * @param {Array} asientosData - Array de asientos a guardar
 * @param {BigInt} usuarioId - ID del usuario
 * @returns {Promise<Object>} Asientos guardados
 */
const guardarAsientosCTS = async (deudaId, asientosData, usuarioId) => {
  try {
    const deuda = await prisma.deudaConPersonal.findUnique({
      where: { id: deudaId }
    });
    if (!deuda) throw new NotFoundError('Deuda con personal no encontrada');
    const asientosGuardados = [];

    for (const asientoData of asientosData) {
      const asiento = await asientoContableService.crear({
        ...asientoData,
        submoduloOrigenId: Number(136),
        procesoOrigenId: deudaId,
        tipoLibroId: deuda.esSaldoInicial ? TIPO_LIBRO.DIARIO : TIPO_LIBRO.PLANILLAS,
        esSaldoInicial: deuda.esSaldoInicial,
        esGerencial: deuda.esGerencial,
        creadoPor: usuarioId,
        actualizadoPor: usuarioId,
        deudas: {
          connect: { id: deudaId }
        },
        detalles: asientoData.detalles.map((d, index) => ({
          ...d,
          submoduloOrigenLineaId: Number(136),
          procesoOrigenLineaId: deudaId,
          creadoPor: usuarioId,
          actualizadoPor: usuarioId
        }))
      });
      asientosGuardados.push(asiento);
    }

    await prisma.deudaConPersonal.update({
      where: { id: deudaId },
      data: {
        periodoContableId: asientosData[0].periodoContableId,
        fechaContable: asientosData[0].fechaAsiento,
        asientosContables: {
          connect: asientosGuardados.map(a => ({ id: a.id }))
        }
      }
    });

    return {
      success: true,
      asientosGenerados: asientosGuardados.length,
      asientos: asientosGuardados
    };

  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al guardar asientos', err.message);
    }
    throw err;
  }
};

/**
 * Elimina un asiento contable de una deuda
 * @param {BigInt} deudaId - ID de la deuda
 * @param {BigInt} asientoId - ID del asiento a eliminar
 * @returns {Promise<Object>} Resultado de la eliminación
 */
const eliminarAsientoCTS = async (deudaId, asientoId) => {
  try {
    const asiento = await prisma.asientoContable.findFirst({
      where: {
        id: asientoId,
        procesoOrigenId: deudaId
      }
    });

    if (!asiento) {
      throw new NotFoundError('Asiento contable no encontrado o no pertenece a esta deuda');
    }

    await prisma.asientoContable.delete({
      where: { id: asientoId }
    });

    return {
      success: true,
      message: 'Asiento eliminado correctamente'
    };

  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al eliminar asiento', err.message);
    }
    throw err;
  }
};

// Submódulo origen de los asientos de deudas con personal (el mismo que usa guardarAsientosCTS)
const SUBMODULO_DEUDA_PERSONAL_ID = 136;

/**
 * Genera UN asiento consolidado de provisión de planilla a partir de las deudas seleccionadas.
 *
 * Por cada deuda: DEBE = tipoDeuda.cuentaProvisionId (gasto; en las retenciones, el pasivo que
 * reducen) y HABER = tipoDeuda.cuentaContableId, por el monto de la deuda. Se suma por cuenta y se
 * compensa el mismo pasivo a ambos lados (p. ej. 411101: bruto en el Haber menos retenciones en el
 * Debe = neto), de modo que queda una sola línea por cuenta. Cuadra siempre porque cada deuda
 * aporta el mismo monto a ambos lados.
 *
 * Las deudas quedan vinculadas al asiento: una deuda que ya tiene asiento (provisión o saldo
 * inicial) no se puede provisionar de nuevo.
 *
 * @param {Object} datos
 * @param {Array<number>} datos.deudaIds - Deudas a provisionar
 * @param {string|Date} [datos.fechaAsiento] - Fecha del asiento (por defecto, la fecha más reciente de las deudas)
 * @param {number} [datos.usuarioId]
 */
const generarProvisionPlanilla = async ({ deudaIds, fechaAsiento, usuarioId }) => {
  try {
    const ids = [...new Set((deudaIds || []).map(Number))];
    if (ids.length === 0) throw new ValidationError('Seleccione al menos una deuda.');

    const deudas = await prisma.deudaConPersonal.findMany({
      where: { id: { in: ids } },
      include: {
        moneda: { select: { codigoSunat: true } },
        tipoDeuda: { select: { nombre: true, cuentaContableId: true, cuentaProvisionId: true } },
        asientosContables: { select: { id: true }, take: 1 },
      },
      orderBy: { id: 'asc' },
    });
    if (deudas.length !== ids.length) throw new NotFoundError('Alguna de las deudas seleccionadas no existe.');

    const conAsiento = deudas.filter((d) => d.asientosContables.length > 0);
    if (conAsiento.length > 0) {
      throw new ConflictError(
        `Estas deudas ya tienen asiento y no se pueden provisionar: ${conAsiento.map((d) => d.id).join(', ')}.`
      );
    }

    const base = deudas[0];
    const mismoAsiento = deudas.every(
      (d) =>
        Number(d.empresaId) === Number(base.empresaId) &&
        Number(d.monedaId) === Number(base.monedaId) &&
        Boolean(d.esGerencial) === Boolean(base.esGerencial)
    );
    if (!mismoAsiento) {
      throw new ValidationError('Las deudas deben ser de la misma empresa, moneda y tipo de operación (fiscal o gerencial).');
    }
    if (base.moneda?.codigoSunat !== 'PEN') {
      throw new ValidationError('La provisión de planilla solo aplica a deudas en soles.');
    }

    const sinCuentas = [
      ...new Set(
        deudas
          .filter((d) => !d.tipoDeuda.cuentaProvisionId || !d.tipoDeuda.cuentaContableId)
          .map((d) => d.tipoDeuda.nombre)
      ),
    ];
    if (sinCuentas.length > 0) {
      throw new ValidationError(
        `Configure la cuenta de provisión (Debe) y la cuenta contable (Haber) en los tipos de deuda: ${sinCuentas.join(', ')}.`
      );
    }

    const fecha = fechaAsiento
      ? new Date(fechaAsiento)
      : new Date(Math.max(...deudas.map((d) => new Date(d.fecha).getTime())));
    const periodo = await periodoContableService.obtenerPeriodoPorFecha(base.empresaId, fecha);
    if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
      throw new ValidationError(`El período ${periodo.nombrePeriodo} no está abierto.`);
    }

    // Neto por cuenta en céntimos: positivo = Debe, negativo = Haber
    const netoPorCuenta = new Map();
    for (const deuda of deudas) {
      const centimos = Math.round(Number(deuda.montoOriginal) * 100);
      const cuentaDebe = Number(deuda.tipoDeuda.cuentaProvisionId);
      const cuentaHaber = Number(deuda.tipoDeuda.cuentaContableId);
      netoPorCuenta.set(cuentaDebe, (netoPorCuenta.get(cuentaDebe) || 0) + centimos);
      netoPorCuenta.set(cuentaHaber, (netoPorCuenta.get(cuentaHaber) || 0) - centimos);
    }

    const cuentas = await prisma.planCuentasContable.findMany({
      where: { id: { in: [...netoPorCuenta.keys()] } },
      select: { id: true, codigoCuenta: true },
    });
    const codigoPorCuenta = new Map(cuentas.map((c) => [Number(c.id), c.codigoCuenta]));

    // Primero el Debe y luego el Haber, cada grupo por código de cuenta
    const lineas = [...netoPorCuenta.entries()]
      .filter(([, neto]) => neto !== 0)
      .map(([cuentaId, neto]) => ({
        cuentaId,
        debe: neto > 0 ? neto / 100 : 0,
        haber: neto < 0 ? -neto / 100 : 0,
      }))
      .sort(
        (a, b) =>
          Number(a.haber > 0) - Number(b.haber > 0) ||
          String(codigoPorCuenta.get(a.cuentaId)).localeCompare(String(codigoPorCuenta.get(b.cuentaId)))
      );

    const totalDebe = lineas.reduce((suma, l) => suma + Math.round(l.debe * 100), 0) / 100;
    const totalHaber = lineas.reduce((suma, l) => suma + Math.round(l.haber * 100), 0) / 100;

    const mes = fecha.toLocaleDateString('es-PE', { month: 'long' }).toUpperCase();
    const glosa = `PROVISION PLANILLA MES DE ${mes} ${fecha.getFullYear()}`;

    const asiento = await asientoContableService.crear({
      empresaId: base.empresaId,
      periodoContableId: periodo.id,
      fechaAsiento: fecha,
      glosa,
      origenAsiento: 'AUTOMATICO',
      monedaId: base.monedaId,
      tipoCambio: 1,
      totalDebe,
      totalHaber,
      diferencia: 0,
      estaCuadrado: true,
      submoduloOrigenId: SUBMODULO_DEUDA_PERSONAL_ID,
      procesoOrigenId: base.id,
      tipoLibroId: TIPO_LIBRO.PLANILLAS,
      esSaldoInicial: false,
      esGerencial: base.esGerencial,
      creadoPor: usuarioId,
      actualizadoPor: usuarioId,
      deudas: { connect: deudas.map((d) => ({ id: d.id })) },
      detalles: lineas.map((l, indice) => ({
        numeroLinea: indice + 1,
        planCuentaId: l.cuentaId,
        glosa,
        debe: l.debe,
        haber: l.haber,
        monedaId: 1,
        tipoCambio: 1,
        debeMonedaExtranjera: l.debe,
        haberMonedaExtranjera: l.haber,
        submoduloOrigenLineaId: SUBMODULO_DEUDA_PERSONAL_ID,
        procesoOrigenLineaId: base.id,
        creadoPor: usuarioId,
        actualizadoPor: usuarioId,
      })),
    });

    await prisma.deudaConPersonal.updateMany({
      where: { id: { in: ids } },
      data: { periodoContableId: periodo.id, fechaContable: fecha },
    });

    return {
      success: true,
      asientoId: asiento.id,
      numeroAsiento: asiento.numeroAsiento,
      glosa,
      totalDebe,
      totalHaber,
      deudasProvisionadas: deudas.length,
      lineas: lineas.length,
    };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar la provisión de planilla', err.message);
    }
    throw err;
  }
};

export default {
  generarProvisionPlanilla,
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  listarPorPersonal,
  listarPendientes,
  listarVencidas,
  listarPorTipo,
  generarBorradorAsientoCTS,
  guardarAsientosCTS,
  eliminarAsientoCTS
};