import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import { obtenerStockDisponible } from '../Almacen/kardexAlmacen.service.js';

/**
 * Servicio de Integración OT Mantenimiento con Almacén
 * Maneja validación de stock, reservas y movimientos automáticos
 * Documentado en español.
 */

/**
 * Valida disponibilidad de stock para los insumos de una tarea
 * @param {BigInt} tareaId - ID de la tarea
 * @param {BigInt} empresaId - ID de la empresa
 * @param {BigInt} almacenId - ID del almacén a validar
 * @returns {Object} Resultado de validación con detalles
 */
export const validarStockInsumosTarea = async (tareaId, empresaId, almacenId) => {
  try {
    const insumos = await prisma.detInsumosTareaOT.findMany({
      where: { tareaId: BigInt(tareaId) },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            descripcionBase: true,
            descripcionArmada: true
          }
        }
      }
    });

    const resultados = [];
    let todoDisponible = true;

    for (const insumo of insumos) {
      const stock = await obtenerStockDisponible(
        empresaId,
        almacenId,
        insumo.productoId,
        null, // clienteId null para mercadería propia
        false // esCustodia false para mercadería propia
      );

      const saldoTotal = stock.reduce((sum, s) => sum + Number(s.saldoCantidad), 0);
      const cantidadRequerida = Number(insumo.cantidad);
      const disponible = saldoTotal >= cantidadRequerida;

      if (!disponible) {
        todoDisponible = false;
      }

      resultados.push({
        insumoId: Number(insumo.id),
        productoId: Number(insumo.productoId),
        productoDescripcion: insumo.producto?.descripcionArmada || insumo.producto?.descripcion,
        cantidadRequerida,
        stockDisponible: saldoTotal,
        disponible,
        faltante: disponible ? 0 : cantidadRequerida - saldoTotal
      });
    }

    return {
      tareaId: Number(tareaId),
      todoDisponible,
      detalles: resultados
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Valida stock para todas las tareas de una OT
 * @param {BigInt} otMantenimientoId - ID de la OT
 * @param {BigInt} empresaId - ID de la empresa
 * @param {BigInt} almacenId - ID del almacén
 * @returns {Object} Resultado consolidado de validación
 */
export const validarStockOT = async (otMantenimientoId, empresaId, almacenId) => {
  try {
    const tareas = await prisma.detTareasOT.findMany({
      where: { otMantenimientoId: BigInt(otMantenimientoId) },
      select: { id: true, numeroTarea: true, descripcion: true }
    });

    const resultados = [];
    let todoDisponible = true;

    for (const tarea of tareas) {
      const validacion = await validarStockInsumosTarea(tarea.id, empresaId, almacenId);
      
      if (!validacion.todoDisponible) {
        todoDisponible = false;
      }

      resultados.push({
        tareaId: Number(tarea.id),
        numeroTarea: tarea.numeroTarea,
        descripcionTarea: tarea.descripcion,
        todoDisponible: validacion.todoDisponible,
        insumos: validacion.detalles
      });
    }

    return {
      otMantenimientoId: Number(otMantenimientoId),
      todoDisponible,
      tareas: resultados
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene stock disponible de un producto específico
 * @param {BigInt} empresaId - ID de la empresa
 * @param {BigInt} almacenId - ID del almacén
 * @param {BigInt} productoId - ID del producto
 * @returns {Number} Cantidad disponible
 */
export const obtenerStockProducto = async (empresaId, almacenId, productoId) => {
  try {
    const stock = await obtenerStockDisponible(
      empresaId,
      almacenId,
      productoId,
      null,
      false
    );

    return stock.reduce((sum, s) => sum + Number(s.saldoCantidad), 0);
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Genera movimiento de salida de almacén para insumos de una tarea
 * @param {BigInt} tareaId - ID de la tarea
 * @param {BigInt} empresaId - ID de la empresa
 * @param {BigInt} almacenId - ID del almacén origen
 * @param {BigInt} conceptoMovAlmacenId - ID del concepto de movimiento (salida)
 * @param {BigInt} usuarioId - ID del usuario que genera el movimiento
 * @returns {Object} Movimiento de almacén creado
 */
export const generarSalidaInsumosTarea = async (tareaId, empresaId, almacenId, conceptoMovAlmacenId, usuarioId) => {
  try {
    // Validar stock antes de generar movimiento
    const validacion = await validarStockInsumosTarea(tareaId, empresaId, almacenId);
    
    if (!validacion.todoDisponible) {
      const faltantes = validacion.detalles
        .filter(d => !d.disponible)
        .map(d => `${d.productoDescripcion}: falta ${d.faltante}`)
        .join(', ');
      
      throw new ValidationError(`Stock insuficiente. ${faltantes}`);
    }

    // Obtener datos de la tarea y OT
    const tarea = await prisma.detTareasOT.findUnique({
      where: { id: BigInt(tareaId) },
      include: {
        otMantenimiento: {
          select: {
            id: true,
            numeroCompleto: true,
            descripcion: true
          }
        }
      }
    });

    if (!tarea) throw new ValidationError('Tarea no encontrada');

    // Obtener insumos
    const insumos = await prisma.detInsumosTareaOT.findMany({
      where: { tareaId: BigInt(tareaId) },
      include: { producto: true }
    });

    // Crear movimiento de almacén (cabecera)
    const movimiento = await prisma.movimientoAlmacen.create({
      data: {
        empresaId: BigInt(empresaId),
        conceptoMovAlmacenId: BigInt(conceptoMovAlmacenId),
        fecha: new Date(),
        glosa: `Salida para OT ${tarea.otMantenimiento.numeroCompleto} - Tarea ${tarea.numeroTarea}: ${tarea.descripcion}`,
        observaciones: `Generado automáticamente desde OT Mantenimiento`,
        estadoDocumentoId: BigInt(1), // Estado inicial
        creadoPor: BigInt(usuarioId),
        fechaCreacion: new Date()
      }
    });

    // Crear detalles del movimiento
    for (const insumo of insumos) {
      await prisma.detalleMovimientoAlmacen.create({
        data: {
          movimientoAlmacenId: movimiento.id,
          productoId: insumo.productoId,
          cantidad: insumo.cantidad,
          observaciones: `Insumo para tarea ${tarea.numeroTarea}`,
          esCustodia: false,
          entidadComercialId: null
        }
      });
    }

    // Actualizar estado de insumos a "EN PROCESO" o "ENTREGADO"
    await prisma.detInsumosTareaOT.updateMany({
      where: { tareaId: BigInt(tareaId) },
      data: { estadoInsumoId: BigInt(62) } // Ajustar según ID de estado "ENTREGADO"
    });

    return {
      movimientoId: Number(movimiento.id),
      tareaId: Number(tareaId),
      cantidadInsumos: insumos.length,
      mensaje: 'Movimiento de salida generado exitosamente'
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  validarStockInsumosTarea,
  validarStockOT,
  obtenerStockProducto,
  generarSalidaInsumosTarea
};
