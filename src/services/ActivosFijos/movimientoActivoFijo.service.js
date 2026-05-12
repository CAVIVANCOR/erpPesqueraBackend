import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';

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
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }
  // Validar activoId
  if (data.activoId !== undefined && data.activoId !== null) {
    const activo = await prisma.activo.findUnique({ where: { id: data.activoId } });
    if (!activo) throw new ValidationError('El activo fijo referenciado no existe.');
  }
  // Validar tipoMovimientoId
  if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
    const tipo = await prisma.tipoMovimientoActivoFijo.findUnique({ where: { id: data.tipoMovimientoId } });
    if (!tipo) throw new ValidationError('El tipo de movimiento referenciado no existe.');
  }
  // Validar monedaId
  if (data.monedaId !== undefined && data.monedaId !== null) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }
  // Validar asientoContableId (opcional)
  if (data.asientoContableId !== undefined && data.asientoContableId !== null) {
    const asiento = await prisma.asientoContable.findUnique({ where: { id: data.asientoContableId } });
    if (!asiento) throw new ValidationError('El asiento contable referenciado no existe.');
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
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      } 
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
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
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      } 
    });
    if (!mov) throw new NotFoundError('MovimientoActivoFijo no encontrado');
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un movimiento validando claves foráneas.
 */
const crear = async (data) => {
  try {
    // Validaciones de campos obligatorios
    if (!data.empresaId) throw new ValidationError('El campo empresaId es obligatorio.');
    if (!data.activoId) throw new ValidationError('El campo activoId es obligatorio.');
    if (!data.tipoMovimientoId) throw new ValidationError('El campo tipoMovimientoId es obligatorio.');
    if (!data.fechaMovimiento) throw new ValidationError('El campo fechaMovimiento es obligatorio.');
    if (!data.monto) throw new ValidationError('El campo monto es obligatorio.');
    if (!data.monedaId) throw new ValidationError('El campo monedaId es obligatorio.');
    
    await validarForaneas(data);
    
    // Preparar datos para creación
    const dataCreacion = {
      empresaId: data.empresaId,
      activoId: data.activoId,
      tipoMovimientoId: data.tipoMovimientoId,
      fechaMovimiento: new Date(data.fechaMovimiento),
      fechaContable: data.fechaContable ? new Date(data.fechaContable) : null,
      monto: data.monto,
      monedaId: data.monedaId,
      depreciacionMensual: data.depreciacionMensual || null,
      depreciacionAcumulada: data.depreciacionAcumulada || null,
      valorNeto: data.valorNeto || null,
      observaciones: data.observaciones || null,
      asientoContableId: data.asientoContableId || null,
      creadoPor: data.creadoPor || null,
      actualizadoPor: data.actualizadoPor || null
    };
    
    return await prisma.movimientoActivoFijo.create({ 
      data: dataCreacion,
      include: { 
        empresa: true,
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento existente, validando existencia y claves foráneas.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movimientoActivoFijo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoActivoFijo no encontrado');
    
    await validarForaneas(data);
    
    // Preparar datos para actualización
    const dataActualizacion = {};
    if (data.empresaId !== undefined) dataActualizacion.empresaId = data.empresaId;
    if (data.activoId !== undefined) dataActualizacion.activoId = data.activoId;
    if (data.tipoMovimientoId !== undefined) dataActualizacion.tipoMovimientoId = data.tipoMovimientoId;
    if (data.fechaMovimiento !== undefined) dataActualizacion.fechaMovimiento = new Date(data.fechaMovimiento);
    if (data.fechaContable !== undefined) dataActualizacion.fechaContable = data.fechaContable ? new Date(data.fechaContable) : null;
    if (data.monto !== undefined) dataActualizacion.monto = data.monto;
    if (data.monedaId !== undefined) dataActualizacion.monedaId = data.monedaId;
    if (data.depreciacionMensual !== undefined) dataActualizacion.depreciacionMensual = data.depreciacionMensual;
    if (data.depreciacionAcumulada !== undefined) dataActualizacion.depreciacionAcumulada = data.depreciacionAcumulada;
    if (data.valorNeto !== undefined) dataActualizacion.valorNeto = data.valorNeto;
    if (data.observaciones !== undefined) dataActualizacion.observaciones = data.observaciones;
    if (data.asientoContableId !== undefined) dataActualizacion.asientoContableId = data.asientoContableId;
    if (data.actualizadoPor !== undefined) dataActualizacion.actualizadoPor = data.actualizadoPor;
    
    return await prisma.movimientoActivoFijo.update({ 
      where: { id }, 
      data: dataActualizacion,
      include: { 
        empresa: true,
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.movimientoActivoFijo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoActivoFijo no encontrado');
    
    await prisma.movimientoActivoFijo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
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
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      },
      orderBy: { fechaMovimiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
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
            tipoActivo: {
              include: {
                cuentaContableActivo: true,
                cuentaContableDepreciacion: true,
                cuentaContableDepreciacionAcumulada: true
              }
            }
          }
        },
        tipoMovimiento: true,
        moneda: true
      }
    });

    if (!movimiento) {
      throw new NotFoundError('Movimiento de activo fijo no encontrado');
    }

    const tipoActivo = movimiento.activo?.tipoActivo;
    if (!tipoActivo) {
      throw new ValidationError('El activo no tiene un tipo de activo configurado');
    }

    if (!tipoActivo.cuentaContableActivoId || !tipoActivo.cuentaContableActivo) {
      throw new ValidationError(
        'El tipo de activo no tiene configurada la cuenta contable de activo. ' +
        'Configure las cuentas contables en el tipo de activo antes de generar el asiento.'
      );
    }

    let periodoContable = null;
    try {
      periodoContable = await periodoContableService.obtenerPeriodoActivo(movimiento.empresaId);
    } catch (error) {
      const periodos = await prisma.periodoContable.findMany({
        where: { 
          empresaId: movimiento.empresaId,
          estadoId: 50n
        },
        orderBy: { fechaInicio: 'desc' },
        take: 1
      });
      
      if (periodos.length > 0) {
        periodoContable = periodos[0];
      } else {
        const cualquierPeriodo = await prisma.periodoContable.findFirst({
          where: { empresaId: movimiento.empresaId },
          orderBy: { fechaInicio: 'desc' }
        });
        
        if (!cualquierPeriodo) {
          throw new ValidationError(
            'No hay períodos contables configurados para esta empresa. ' +
            'Por favor, cree un período contable antes de generar asientos.'
          );
        }
        periodoContable = cualquierPeriodo;
      }
    }

    const monto = Number(movimiento.monto);
    const tipoMovimientoNombre = movimiento.tipoMovimiento?.nombre || '';
    const activoNombre = movimiento.activo?.nombre || '';
    
    const borrador = {
      empresaId: movimiento.empresaId,
      periodoContableId: periodoContable.id,
      fechaAsiento: movimiento.fechaContable || movimiento.fechaMovimiento,
      glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
      tipoLibro: 'FISCAL',
      origenAsiento: 'AUTOMATICO',
      monedaId: movimiento.monedaId,
      detalles: []
    };

    const tipoMovimientoNombreLower = tipoMovimientoNombre.toLowerCase();

    if (tipoMovimientoNombreLower.includes('compra') || tipoMovimientoNombreLower.includes('saldo inicial')) {
      const cuentaContrapartida = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: { startsWith: '591' },
          activo: true
        }
      });

      if (!cuentaContrapartida) {
        throw new ValidationError('No se encontró la cuenta de Resultados Acumulados (591)');
      }

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaContableActivoId,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: monto,
          haber: 0,
          centroCostoId: null
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaContrapartida.id,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null
        }
      ];
    } else if (tipoMovimientoNombreLower.includes('depreciación')) {
      if (!tipoActivo.cuentaContableDepreciacionId || !tipoActivo.cuentaContableDepreciacionAcumuladaId) {
        throw new ValidationError(
          'El tipo de activo no tiene configuradas las cuentas de depreciación. ' +
          'Configure las cuentas contables en el tipo de activo antes de generar el asiento.'
        );
      }

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaContableDepreciacionId,
          glosa: `Depreciación ${activoNombre}`,
          debe: monto,
          haber: 0,
          centroCostoId: null
        },
        {
          numeroLinea: 2,
          planCuentaId: tipoActivo.cuentaContableDepreciacionAcumuladaId,
          glosa: `Depreciación acumulada ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null
        }
      ];
    } else if (tipoMovimientoNombreLower.includes('venta') || tipoMovimientoNombreLower.includes('baja')) {
      const depreciacionAcumulada = Number(movimiento.depreciacionAcumulada || 0);
      const valorNeto = Number(movimiento.valorNeto || 0);

      if (!tipoActivo.cuentaContableDepreciacionAcumuladaId) {
        throw new ValidationError(
          'El tipo de activo no tiene configurada la cuenta de depreciación acumulada. ' +
          'Configure las cuentas contables en el tipo de activo antes de generar el asiento.'
        );
      }

      const cuentaPerdidaGanancia = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: { startsWith: '655' },
          activo: true
        }
      });

      if (!cuentaPerdidaGanancia) {
        throw new ValidationError('No se encontró la cuenta de Pérdida en Venta de Activos (655)');
      }

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaContableDepreciacionAcumuladaId,
          glosa: `${tipoMovimientoNombre} - Depreciación acumulada ${activoNombre}`,
          debe: depreciacionAcumulada,
          haber: 0,
          centroCostoId: null
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaPerdidaGanancia.id,
          glosa: `${tipoMovimientoNombre} - Valor neto ${activoNombre}`,
          debe: valorNeto,
          haber: 0,
          centroCostoId: null
        },
        {
          numeroLinea: 3,
          planCuentaId: tipoActivo.cuentaContableActivoId,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null
        }
      ];
    } else {
      const cuentaContrapartida = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: { startsWith: '591' },
          activo: true
        }
      });

      if (!cuentaContrapartida) {
        throw new ValidationError('No se encontró la cuenta de Resultados Acumulados (591)');
      }

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: tipoActivo.cuentaContableActivoId,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: monto,
          haber: 0,
          centroCostoId: null
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaContrapartida.id,
          glosa: `${tipoMovimientoNombre} - ${activoNombre}`,
          debe: 0,
          haber: monto,
          centroCostoId: null
        }
      ];
    }

    return borrador;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Guarda el asiento contable editado por el usuario y lo vincula al movimiento.
 * @param {BigInt} movimientoId - ID del movimiento
 * @param {Object} asientoData - Datos del asiento editado por el usuario
 * @param {BigInt} creadoPor - ID del usuario que crea el asiento
 * @returns {Promise<Object>} - Asiento contable creado
 */
const guardarAsientoContable = async (movimientoId, asientoData, creadoPor) => {
  try {
    const movimiento = await prisma.movimientoActivoFijo.findUnique({
      where: { id: movimientoId }
    });

    if (!movimiento) {
      throw new NotFoundError('Movimiento no encontrado');
    }

    if (movimiento.asientoContableId) {
      throw new ValidationError('Este movimiento ya tiene un asiento contable generado');
    }

    const totalDebe = asientoData.detalles.reduce((sum, d) => sum + Number(d.debe || 0), 0);
    const totalHaber = asientoData.detalles.reduce((sum, d) => sum + Number(d.haber || 0), 0);
    const diferencia = Math.abs(totalDebe - totalHaber);

    if (diferencia > 0.01) {
      throw new ValidationError(
        `El asiento no está balanceado. Debe: ${totalDebe.toFixed(2)}, Haber: ${totalHaber.toFixed(2)}, Diferencia: ${diferencia.toFixed(2)}`
      );
    }

    const moneda = await prisma.moneda.findUnique({
      where: { id: asientoData.monedaId }
    });
    if (!moneda) {
      throw new ValidationError('Moneda no encontrada');
    }

    return await prisma.$transaction(async (tx) => {
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: {
          empresaId: asientoData.empresaId,
          periodoContableId: asientoData.periodoContableId
        },
        orderBy: { correlativo: 'desc' }
      });
      const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
      const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, '0')}`;

      const asiento = await tx.asientoContable.create({
        data: {
          empresaId: asientoData.empresaId,
          periodoContableId: asientoData.periodoContableId,
          numeroAsiento,
          correlativo,
          fechaAsiento: new Date(asientoData.fechaAsiento),
          glosa: asientoData.glosa,
          tipoLibro: asientoData.tipoLibro || 'FISCAL',
          origenAsiento: asientoData.origenAsiento || 'AUTOMATICO',
          monedaId: asientoData.monedaId,
          totalDebe: totalDebe,
          totalHaber: totalHaber,
          estadoId: 50n,
          creadoPor,
          actualizadoPor: creadoPor,
          detalles: {
            create: asientoData.detalles.map((detalle, index) => ({
              numeroLinea: index + 1,
              planCuentaId: detalle.planCuentaId,
              glosa: detalle.glosa || asientoData.glosa,
              debe: Number(detalle.debe || 0),
              haber: Number(detalle.haber || 0),
              centroCostoId: detalle.centroCostoId || null,
              creadoPor,
              actualizadoPor: creadoPor
            }))
          }
        },
        include: {
          detalles: {
            include: {
              planCuenta: true,
              centroCosto: true
            }
          },
          empresa: true,
          periodoContable: true,
          moneda: true
        }
      });

      await tx.movimientoActivoFijo.update({
        where: { id: movimientoId },
        data: { asientoContableId: asiento.id }
      });

      return asiento;
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
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
  listarPorActivo,
  generarBorradorAsiento,
  guardarAsientoContable
};