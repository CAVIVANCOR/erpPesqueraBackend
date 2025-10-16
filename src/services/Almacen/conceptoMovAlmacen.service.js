import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ConceptoMovAlmacen
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del concepto
 */
async function validarForaneas(data) {
  // tipoConceptoId
  if (data.tipoConceptoId !== undefined && data.tipoConceptoId !== null) {
    const tipoConcepto = await prisma.tipoConcepto.findUnique({ where: { id: data.tipoConceptoId } });
    if (!tipoConcepto) throw new ValidationError('El tipo de concepto referenciado no existe.');
  }
  // tipoMovimientoId
  if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
    const tipoMov = await prisma.tipoMovimientoAlmacen.findUnique({ where: { id: data.tipoMovimientoId } });
    if (!tipoMov) throw new ValidationError('El tipo de movimiento de almacén referenciado no existe.');
  }
  // tipoAlmacenId
  if (data.tipoAlmacenId !== undefined && data.tipoAlmacenId !== null) {
    const tipoAlm = await prisma.tipoAlmacen.findUnique({ where: { id: data.tipoAlmacenId } });
    if (!tipoAlm) throw new ValidationError('El tipo de almacén referenciado no existe.');
  }
  // almacenOrigenId (opcional)
  if (data.almacenOrigenId !== undefined && data.almacenOrigenId !== null) {
    const almOrigen = await prisma.almacen.findUnique({ where: { id: data.almacenOrigenId } });
    if (!almOrigen) throw new ValidationError('El almacén origen referenciado no existe.');
  }
  // almacenDestinoId (opcional)
  if (data.almacenDestinoId !== undefined && data.almacenDestinoId !== null) {
    const almDestino = await prisma.almacen.findUnique({ where: { id: data.almacenDestinoId } });
    if (!almDestino) throw new ValidationError('El almacén destino referenciado no existe.');
  }
}

/**
 * Construye la descripción armada según la regla de negocio:
 * Si esCustodia=false: Tipo Concepto + Tipo Movimiento + Tipo Almacen + " DE " + Almacen Origen + " A " + Almacen Destino + descripcion
 * Si esCustodia=true: "CUSTODIA " + Tipo Concepto + Tipo Movimiento + Tipo Almacen + " DE " + Almacen Origen + " A " + Almacen Destino + descripcion
 * @param {Object} data - Datos del concepto con los IDs
 * @returns {Promise<string>} - Descripción armada
 */
async function construirDescripcionArmada(data) {
  const partes = [];

  // Prefijo si es custodia
  if (data.esCustodia) {
    partes.push('CUSTODIA');
  }

  // Tipo Concepto - Solo si es TRANSFERENCIA
  if (data.tipoConceptoId) {
    const tipoConcepto = await prisma.tipoConcepto.findUnique({ where: { id: data.tipoConceptoId } });
    if (tipoConcepto && tipoConcepto.nombre === 'TRANSFERENCIA') {
      partes.push(tipoConcepto.nombre);
    }
  }

  // Tipo Movimiento
  if (data.tipoMovimientoId) {
    const tipoMovimiento = await prisma.tipoMovimientoAlmacen.findUnique({ where: { id: data.tipoMovimientoId } });
    if (tipoMovimiento) partes.push(tipoMovimiento.nombre);
  }

  // Tipo Almacén
  if (data.tipoAlmacenId) {
    const tipoAlmacen = await prisma.tipoAlmacen.findUnique({ where: { id: data.tipoAlmacenId } });
    if (tipoAlmacen) partes.push(tipoAlmacen.nombre);
  }

  // Almacén Origen
  if (data.almacenOrigenId) {
    const almacenOrigen = await prisma.almacen.findUnique({ where: { id: data.almacenOrigenId } });
    if (almacenOrigen) {
      partes.push('DE');
      partes.push(almacenOrigen.nombre);
    }
  }

  // Almacén Destino
  if (data.almacenDestinoId) {
    const almacenDestino = await prisma.almacen.findUnique({ where: { id: data.almacenDestinoId } });
    if (almacenDestino) {
      partes.push('A');
      partes.push(almacenDestino.nombre);
    }
  }

  // Descripción
  if (data.descripcion) {
    partes.push(data.descripcion);
  }

  return partes.join(' ');
}

/**
 * Lista todos los conceptos de movimiento de almacén con sus relaciones.
 */
const listar = async () => {
  try {
    return await prisma.conceptoMovAlmacen.findMany({ 
      include: { 
        tipoConcepto: true,
        tipoMovimiento: true,
        tipoAlmacen: true,
        movimientos: true 
      } 
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un concepto por ID con sus relaciones.
 */
const obtenerPorId = async (id) => {
  try {
    const concepto = await prisma.conceptoMovAlmacen.findUnique({ 
      where: { id }, 
      include: { 
        tipoConcepto: true,
        tipoMovimiento: true,
        tipoAlmacen: true,
        movimientos: true 
      } 
    });
    if (!concepto) throw new NotFoundError('ConceptoMovAlmacen no encontrado');
    return concepto;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un concepto validando existencia de claves foráneas principales y campos obligatorios.
 * Construye automáticamente la descripcionArmada.
 */
const crear = async (data) => {
  try {
    if (!data.descripcion || !data.tipoConceptoId || !data.tipoMovimientoId || !data.tipoAlmacenId) {
      throw new ValidationError('Los campos descripcion, tipoConceptoId, tipoMovimientoId y tipoAlmacenId son obligatorios.');
    }
    await validarForaneas(data);
    
    // Construir descripcionArmada automáticamente
    const descripcionArmada = await construirDescripcionArmada(data);
    
    return await prisma.conceptoMovAlmacen.create({ 
      data: {
        ...data,
        descripcionArmada
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un concepto existente, validando existencia y claves foráneas si se modifican.
 * Reconstruye automáticamente la descripcionArmada.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.conceptoMovAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ConceptoMovAlmacen no encontrado');
    
    // Combinar datos existentes con los nuevos para validación
    const datosCompletos = { ...existente, ...data };
    
    // Validar foráneas si se modifican
    await validarForaneas(datosCompletos);
    
    // Reconstruir descripcionArmada automáticamente
    const descripcionArmada = await construirDescripcionArmada(datosCompletos);
    
    return await prisma.conceptoMovAlmacen.update({ 
      where: { id }, 
      data: {
        ...data,
        descripcionArmada
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un concepto por ID, validando existencia y que no tenga movimientos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.conceptoMovAlmacen.findUnique({ where: { id }, include: { movimientos: true } });
    if (!existente) throw new NotFoundError('ConceptoMovAlmacen no encontrado');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos de almacén asociados.');
    }
    await prisma.conceptoMovAlmacen.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
