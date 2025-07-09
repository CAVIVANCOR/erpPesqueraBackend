import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CotizacionCompras
 * Aplica validaciones de existencia de claves foráneas y prevención de borrado si tiene detalles asociados.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la cotización
 */
async function validarForaneas(data) {
  // Validaciones principales. Solo se validan las más críticas para ejemplo, puedes ampliar según necesidad real.
  const claves = [
    { key: 'tipoProductoId', model: 'tipoProducto', label: 'Tipo de producto' },
    { key: 'tipoEstadoProductoId', model: 'tipoEstadoProducto', label: 'Tipo de estado de producto' },
    { key: 'destinoProductoId', model: 'destinoProducto', label: 'Destino de producto' },
    { key: 'formaTransaccionId', model: 'formaTransaccion', label: 'Forma de transacción' },
    { key: 'modoDespachoRecepcionId', model: 'modoDespachoRecepcion', label: 'Modo de despacho/recepción' },
    { key: 'proveedorMateriaPrimaId', model: 'entidadComercial', label: 'Proveedor de materia prima' },
    { key: 'empresaId', model: 'empresa', label: 'Empresa' }
  ];
  for (const c of claves) {
    if (data[c.key] !== undefined && data[c.key] !== null) {
      const existe = await prisma[c.model].findUnique({ where: { id: data[c.key] } });
      if (!existe) throw new ValidationError(`La clave foránea ${c.label} (${c.key}) no existe.`);
    }
  }
}

/**
 * Lista todas las cotizaciones de compras.
 */
const listar = async () => {
  try {
    return await prisma.cotizacionCompras.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una cotización por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const cot = await prisma.cotizacionCompras.findUnique({ where: { id } });
    if (!cot) throw new NotFoundError('CotizacionCompras no encontrada');
    return cot;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una cotización validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios mínimos
    const oblig = [
      'empresaId', 'tipoProductoId', 'tipoEstadoProductoId', 'destinoProductoId', 'formaTransaccionId',
      'modoDespachoRecepcionId', 'respComprasId', 'respProduccionId', 'fechaEntrega', 'autorizaCompraId',
      'tipoCambio', 'contactoProveedorId', 'direccionProveedorId', 'proveedorMateriaPrimaId', 'bancoId',
      'formaPagoId', 'respAlmacenId', 'estadoCotizacionId', 'centroCostoId'
    ];
    for (const k of oblig) if (!data[k]) throw new ValidationError(`El campo ${k} es obligatorio.`);
    await validarForaneas(data);
    return await prisma.cotizacionCompras.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una cotización existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cotizacionCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('CotizacionCompras no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.cotizacionCompras.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una cotización por ID, previniendo si tiene detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.cotizacionCompras.findUnique({
      where: { id },
      include: { detalles: true }
    });
    if (!existente) throw new NotFoundError('CotizacionCompras no encontrada');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar la cotización porque tiene detalles asociados.');
    }
    await prisma.cotizacionCompras.delete({ where: { id } });
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
