import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';

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
            detalles: {
              include: {
                planCuenta: true
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
      ...data,
      montoPagadoAnterior: data.montoPagadoAnterior || 0,
      montoPagado: data.montoPagado || 0,
      saldoPendiente: (data.montoOriginal || 0) - (data.montoPagadoAnterior || 0) - (data.montoPagado || 0),
      esSaldoInicial: data.esSaldoInicial !== undefined ? data.esSaldoInicial : false,
      esGerencial: data.esGerencial !== undefined ? data.esGerencial : false,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      moduloOrigenId: data.moduloOrigenId || null,
      origenId: data.origenId || null,
      creadoPor: data.creadoPor || null
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
    const cuenta5911101 = await prisma.planCuentasContable.findFirst({
      where: { codigoCuenta: '5911101' }
    });

    if (!cuenta5911101) {
      throw new ValidationError(
        'Falta cuenta contable del sistema. Debe configurar: 5911101 (Utilidades Acumuladas)'
      );
    }

    const fechaAsiento = deuda.fechaContable || deuda.fecha;
    const monto = Number(deuda.montoOriginal);
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
        totalDebe: monto,
        totalHaber: monto,
        diferencia: 0,
        estaCuadrado: true,
        detalles: [
          {
            numeroLinea: 1,
            planCuentaId: deuda.tipoDeuda.cuentaContable.id,
            planCuenta: deuda.tipoDeuda.cuentaContable,
            glosa: glosaAsiento,
            debe: monto,
            haber: 0,
            monedaId: deuda.monedaId
          },
          {
            numeroLinea: 2,
            planCuentaId: cuenta5911101.id,
            planCuenta: cuenta5911101,
            glosa: glosaAsiento,
            debe: 0,
            haber: monto,
            monedaId: deuda.monedaId
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
    const asientosGuardados = [];

    for (const asientoData of asientosData) {
      const asiento = await asientoContableService.crear({
        ...asientoData,
        submoduloOrigenId: BigInt(136),
        procesoOrigenId: deudaId,
        creadoPor: usuarioId,
        deudas: {
          connect: { id: deudaId }
        },
        detalles: asientoData.detalles.map(d => ({
          ...d,
          creadoPor: usuarioId
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

export default {
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