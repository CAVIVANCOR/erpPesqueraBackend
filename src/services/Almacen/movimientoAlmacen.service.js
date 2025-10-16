import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import kardexService from './kardexAlmacen.service.js';

/**
 * Servicio CRUD para MovimientoAlmacen
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del movimiento
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarForaneas(data) {
  // Validar tipoDocumentoId
  if (data.tipoDocumentoId !== undefined && data.tipoDocumentoId !== null) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
    if (!tipoDoc) throw new ValidationError('El tipo de documento referenciado no existe.');
  }
  // Validar conceptoMovAlmacenId
  if (data.conceptoMovAlmacenId !== undefined && data.conceptoMovAlmacenId !== null) {
    const concepto = await prisma.conceptoMovAlmacen.findUnique({ where: { id: data.conceptoMovAlmacenId } });
    if (!concepto) throw new ValidationError('El concepto de movimiento de almacén referenciado no existe.');
  }
  // Validar serieDocId (opcional)
  if (data.serieDocId !== undefined && data.serieDocId !== null) {
    const serie = await prisma.serieDoc.findUnique({ where: { id: data.serieDocId } });
    if (!serie) throw new ValidationError('La serie de documento referenciada no existe.');
  }
  // Validar entidadComercialId (opcional)
  if (data.entidadComercialId !== undefined && data.entidadComercialId !== null) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!entidad) throw new ValidationError('La entidad comercial referenciada no existe.');
  }
}

/**
 * Lista todos los movimientos de almacén.
 */
const listar = async () => {
  try {
    return await prisma.movimientoAlmacen.findMany({ include: { detalles: true, preFacturasSalida: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un movimiento por ID (incluyendo detalles y prefacturas asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const mov = await prisma.movimientoAlmacen.findUnique({ where: { id }, include: { detalles: true, preFacturasSalida: true } });
    if (!mov) throw new NotFoundError('MovimientoAlmacen no encontrado');
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un movimiento de almacén en estado PENDIENTE (30).
 */
const crear = async (data) => {
  try {
    if (!data.empresaId || !data.tipoDocumentoId || !data.conceptoMovAlmacenId || !data.fechaDocumento) {
      throw new ValidationError('Los campos empresaId, tipoDocumentoId, conceptoMovAlmacenId y fechaDocumento son obligatorios.');
    }
    if (!data.serieDocId) {
      throw new ValidationError('El campo serieDocId es obligatorio.');
    }
    await validarForaneas(data);
    
    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener la serie seleccionada
      const serie = await tx.serieDoc.findUnique({
        where: { id: BigInt(data.serieDocId) }
      });
      
      if (!serie) {
        throw new ValidationError('Serie de documento no encontrada.');
      }
      
      // 2. Calcular nuevo correlativo
      const nuevoCorrelativo = Number(serie.correlativo) + 1;
      
      // 3. Generar números con formato
      const numSerie = String(serie.serie).padStart(serie.numCerosIzqSerie, '0');
      const numCorre = String(nuevoCorrelativo).padStart(serie.numCerosIzqCorre, '0');
      const numeroDocumento = `${numSerie}-${numCorre}`;
      
      // 4. Extraer detalles del data
      const { detalles, ...dataMovimiento } = data;
      
      // 5. Preparar data con números generados y estado PENDIENTE (30)
      const dataConEstado = {
        ...dataMovimiento,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        numeroDocumento: numeroDocumento,
        estadoDocAlmacenId: BigInt(30),
        actualizadoEn: new Date()
      };
      
      // 6. Si hay detalles, agregarlos con la sintaxis correcta de Prisma
      if (detalles && detalles.length > 0) {
        dataConEstado.detalles = {
          create: detalles.map(detalle => ({
            productoId: BigInt(detalle.productoId),
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precioUnitario || 0,
            observaciones: detalle.observaciones || null
          }))
        };
      }
      
      // 7. Crear el movimiento de almacén
      const movimiento = await tx.movimientoAlmacen.create({ 
        data: dataConEstado,
        include: {
          detalles: true,
          conceptoMovAlmacen: true
        }
      });
      
      // 8. Actualizar el correlativo en SerieDoc
      await tx.serieDoc.update({
        where: { id: BigInt(data.serieDocId) },
        data: { correlativo: BigInt(nuevoCorrelativo) }
      });
      
      return movimiento;
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movimientoAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    
    // Extraer detalles del data (no se actualizan aquí, se manejan por separado)
    const { detalles, ...dataMovimiento } = data;
    
    // Actualizar solo los campos del movimiento, sin detalles
    return await prisma.movimientoAlmacen.update({ 
      where: { id }, 
      data: dataMovimiento,
      include: {
        detalles: true,
        conceptoMovAlmacen: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento de almacén por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.movimientoAlmacen.findUnique({ where: { id }, include: { detalles: true } });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.movimientoAlmacen.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Rellena un número con ceros a la izquierda
 * @param {number} numero - Número a rellenar
 * @param {number} cantidadCeros - Cantidad de ceros a la izquierda
 * @returns {string} - Número con ceros a la izquierda
 */
function llenaNumerosIzquierda(numero, cantidadCeros) {
  return String(numero).padStart(cantidadCeros, '0');
}

/**
 * Obtiene series de documentos filtradas por empresaId, tipoDocumentoId y tipoAlmacenId
 * @param {BigInt} empresaId
 * @param {BigInt} tipoDocumentoId
 * @param {BigInt} tipoAlmacenId
 * @returns {Array} - Array de series de documentos
 */
const obtenerSeriesDoc = async (empresaId, tipoDocumentoId, tipoAlmacenId) => {
  try {
    const where = {
      activo: true
    };

    if (empresaId) where.empresaId = BigInt(empresaId);
    if (tipoDocumentoId) where.tipoDocumentoId = BigInt(tipoDocumentoId);
    if (tipoAlmacenId) where.tipoAlmacenId = BigInt(tipoAlmacenId);

    const series = await prisma.serieDoc.findMany({ where });
    return series;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Genera el número de documento automáticamente basado en la serie seleccionada
 * Incrementa el correlativo y genera numSerieDoc, numCorreDoc y numeroDocumento
 * @param {BigInt} serieDocId - ID de la serie de documento
 * @returns {Object} - Objeto con serieDocId, numSerieDoc, numCorreDoc, numeroDocumento
 */
const generarNumeroDocumento = async (serieDocId) => {
  try {
    // Obtener la serie de documento
    const serieDoc = await prisma.serieDoc.findUnique({
      where: { id: BigInt(serieDocId) }
    });

    if (!serieDoc) {
      throw new NotFoundError('Serie de documento no encontrada');
    }

    // Incrementar el correlativo
    const nuevoCorrelativo = Number(serieDoc.correlativo) + 1;

    // Actualizar el correlativo en la base de datos
    await prisma.serieDoc.update({
      where: { id: BigInt(serieDocId) },
      data: { correlativo: BigInt(nuevoCorrelativo) }
    });

    // Generar los números con ceros a la izquierda
    const numSerieDoc = llenaNumerosIzquierda(
      serieDoc.serie,
      serieDoc.numCerosIzqSerie
    );
    
    const numCorreDoc = llenaNumerosIzquierda(
      nuevoCorrelativo,
      serieDoc.numCerosIzqCorre
    );

    const numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;

    return {
      serieDocId: serieDoc.id,
      numSerieDoc,
      numCorreDoc,
      numeroDocumento
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerSeriesDoc,
  generarNumeroDocumento
};
