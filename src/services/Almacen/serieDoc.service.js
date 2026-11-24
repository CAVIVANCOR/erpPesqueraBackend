import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SerieDoc
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la serie
 */
async function validarForaneas(data) {
  // empresaId
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }
  // tipoDocumentoId
  if (data.tipoDocumentoId !== undefined && data.tipoDocumentoId !== null) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
    if (!tipoDoc) throw new ValidationError('El tipo de documento referenciado no existe.');
  }
  // tipoAlmacenId
  if (data.tipoAlmacenId !== undefined && data.tipoAlmacenId !== null) {
    const tipoAlm = await prisma.tipoAlmacen.findUnique({ where: { id: data.tipoAlmacenId } });
    if (!tipoAlm) throw new ValidationError('El tipo de almacén referenciado no existe.');
  }
}

// Prefijos que SUNAT exige a la serie según el tipo de comprobante: factura F, boleta B; las notas de crédito y de
// débito empiezan con F o B según el comprobante que modifican (código del tipo de documento del ERP).
const PREFIJOS_SERIE_ELECTRONICA = { FAC: ['F'], BV: ['B'], NC: ['F', 'B'], ND: ['F', 'B'] };

/**
 * Valida una serie marcada como electrónica (SUNAT): formato de 4 caracteres con el prefijo del tipo de comprobante,
 * 8 dígitos de correlativo, única por empresa y tipo, y correlativo que nunca retrocede (SUNAT no admite reutilizar
 * un número ya emitido).
 * @param {Object} data - Datos de la serie ya combinados con los existentes
 * @param {Object|null} existente - Serie actual (solo al actualizar)
 */
async function validarSerieElectronica(data, existente = null) {
  if (!data.esElectronica) return;

  const tipoDoc = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
  const prefijos = PREFIJOS_SERIE_ELECTRONICA[String(tipoDoc?.codigo || '').toUpperCase()];
  if (!prefijos) {
    throw new ValidationError(
      `El tipo de documento "${tipoDoc?.descripcion || data.tipoDocumentoId}" no admite series electrónicas (solo factura, boleta, nota de crédito y nota de débito).`,
    );
  }

  const serie = String(data.serie || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(serie) || !prefijos.includes(serie[0])) {
    throw new ValidationError(
      `La serie electrónica "${data.serie}" no es válida: debe tener 4 caracteres alfanuméricos y empezar con ${prefijos.join(' o ')} (por ejemplo ${prefijos[0]}001).`,
    );
  }
  if (Number(data.numCerosIzqCorre) !== 8) {
    throw new ValidationError('Una serie electrónica debe tener 8 ceros a la izquierda en el correlativo (formato SUNAT).');
  }
  if (!data.empresaId) {
    throw new ValidationError('Una serie electrónica debe pertenecer a una empresa.');
  }

  const duplicada = await prisma.serieDoc.findFirst({
    where: {
      empresaId: data.empresaId,
      tipoDocumentoId: data.tipoDocumentoId,
      serie,
      esElectronica: true,
      ...(existente ? { id: { not: existente.id } } : {}),
    },
  });
  if (duplicada) {
    throw new ConflictError(`La empresa ya tiene la serie electrónica ${serie} para este tipo de comprobante.`);
  }

  if (existente?.esElectronica && Number(data.correlativo) < Number(existente.correlativo)) {
    throw new ValidationError(
      `El correlativo de una serie electrónica no puede retroceder (actual ${existente.correlativo}): SUNAT no admite reutilizar números emitidos.`,
    );
  }
}

/**
 * Lista todas las series de documento.
 */
const listar = async () => {
  try {
    return await prisma.serieDoc.findMany({ include: { movimientos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una serie por ID (incluyendo movimientos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const serie = await prisma.serieDoc.findUnique({ where: { id }, include: { movimientos: true } });
    if (!serie) throw new NotFoundError('SerieDoc no encontrada');
    return serie;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una serie validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.tipoDocumentoId || !data.tipoAlmacenId || !data.serie) {
      throw new ValidationError('Los campos tipoDocumentoId, tipoAlmacenId y serie son obligatorios.');
    }
    await validarForaneas(data);
    await validarSerieElectronica(data);
    return await prisma.serieDoc.create({
      data: data.esElectronica ? { ...data, serie: String(data.serie).trim().toUpperCase() } : data,
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una serie existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.serieDoc.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('SerieDoc no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    await validarSerieElectronica({ ...existente, ...data }, existente);
    const combinado = { ...existente, ...data };
    return await prisma.serieDoc.update({
      where: { id },
      data: combinado.esElectronica && data.serie ? { ...data, serie: String(data.serie).trim().toUpperCase() } : data,
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una serie por ID, validando existencia y que no tenga movimientos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.serieDoc.findUnique({ where: { id }, include: { movimientos: true } });
    if (!existente) throw new NotFoundError('SerieDoc no encontrada');
    // Una serie electrónica con números emitidos no se elimina: SUNAT no admite reutilizarlos
    if (existente.esElectronica && Number(existente.correlativo) > 0) {
      throw new ConflictError('No se puede eliminar una serie electrónica que ya emitió comprobantes. Desactívela en su lugar.');
    }
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos de almacén asociados.');
    }
    await prisma.serieDoc.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Generar nuevo correlativo (incrementa SerieDoc.correlativo)
 */
const generarCorrelativo = async (serieDocId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const serie = await tx.serieDoc.findUnique({
        where: { id: Number(serieDocId) }
      });

      if (!serie) {
        throw new NotFoundError('Serie no encontrada');
      }

      const nuevoCorrelativo = Number(serie.correlativo) + 1;
      const numSerieDoc = String(serie.serie).padStart(Number(serie.numCerosIzqSerie), '0');
      const numCorreDoc = String(nuevoCorrelativo).padStart(Number(serie.numCerosIzqCorre), '0');
      const numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;

      await tx.serieDoc.update({
        where: { id: Number(serieDocId) },
        data: { correlativo: nuevoCorrelativo }
      });

      return {
        tipoDocumentoId: Number(serie.tipoDocumentoId),
        serieDocId: Number(serie.id),
        numSerieDoc,
        numCorreDoc,
        numeroDocumento
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const buscarPorEmpresaYTipo = async (empresaId, tipoDocumentoId) => {
  try {
    const series = await prisma.serieDoc.findMany({
      where: {
        empresaId: Number(empresaId),
        tipoDocumentoId: Number(tipoDocumentoId),
        activo: true
      },
      orderBy: {
        serie: 'asc'
      }
    });
    return series;
  } catch (err) {
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
  generarCorrelativo,
  buscarPorEmpresaYTipo

};
