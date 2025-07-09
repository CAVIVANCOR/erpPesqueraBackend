import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CotizacionVentas
 * Aplica validaciones de existencia de claves foráneas y prevención de borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarForaneas(data) {
  // Validar existencia de claves foráneas principales
  const claves = [
    { campo: 'empresaId', modelo: 'empresa' },
    { campo: 'tipoProductoId', modelo: 'tipoProducto' },
    { campo: 'tipoEstadoProductoId', modelo: 'tipoEstadoProducto' },
    { campo: 'destinoProductoId', modelo: 'destinoProducto' },
    { campo: 'formaTransaccionId', modelo: 'formaTransaccion' },
    { campo: 'modoDespachoRecepcionId', modelo: 'modoDespachoRecepcion' },
    { campo: 'respVentasId', modelo: 'usuario' },
    { campo: 'autorizaVentaId', modelo: 'usuario' },
    { campo: 'contactoClienteId', modelo: 'contactoCliente' },
    { campo: 'clienteId', modelo: 'cliente' },
    { campo: 'dirFiscalId', modelo: 'direccion' },
    { campo: 'dirEntregaId', modelo: 'direccion' },
    { campo: 'bancoId', modelo: 'banco' },
    { campo: 'formaPagoId', modelo: 'formaPago' },
    { campo: 'respEmbarqueId', modelo: 'usuario' },
    { campo: 'respProduccionId', modelo: 'usuario' },
    { campo: 'respAlmacenId', modelo: 'usuario' },
    { campo: 'incotermsId', modelo: 'incoterms' },
    { campo: 'idPaisDestino', modelo: 'pais' },
    { campo: 'estadoCotizacionId', modelo: 'estadoCotizacion' },
    { campo: 'centroCostoId', modelo: 'centroCosto' }
  ];
  for (const clave of claves) {
    if (data[clave.campo] !== undefined && data[clave.campo] !== null) {
      const existe = await prisma[clave.modelo].findUnique({ where: { id: data[clave.campo] } });
      if (!existe) throw new ValidationError(`La clave foránea ${clave.campo} (${clave.modelo}) no existe.`);
    }
  }
}

const listar = async () => {
  try {
    return await prisma.cotizacionVentas.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const cot = await prisma.cotizacionVentas.findUnique({ where: { id } });
    if (!cot) throw new NotFoundError('CotizacionVentas no encontrada');
    return cot;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios
    const obligatorios = [
      'empresaId','tipoProductoId','tipoEstadoProductoId','destinoProductoId','formaTransaccionId','modoDespachoRecepcionId','respVentasId','fechaEntrega','autorizaVentaId','tipoCambio','contactoClienteId','clienteId','dirFiscalId','dirEntregaId','bancoId','formaPagoId','respEmbarqueId','respProduccionId','respAlmacenId','incotermsId','idPaisDestino','estadoCotizacionId','centroCostoId'
    ];
    for (const campo of obligatorios) {
      if (data[campo] === undefined || data[campo] === null) {
        throw new ValidationError(`El campo obligatorio ${campo} no fue proporcionado.`);
      }
    }
    await validarForaneas(data);
    return await prisma.cotizacionVentas.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cotizacionVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('CotizacionVentas no encontrada');
    await validarForaneas({ ...existente, ...data });
    return await prisma.cotizacionVentas.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.cotizacionVentas.findUnique({
      where: { id },
      include: { detalles: true, detDocsReqCotizaVentas: true, entregasARendirPVentas: true }
    });
    if (!existente) throw new NotFoundError('CotizacionVentas no encontrada');
    if ((existente.detalles && existente.detalles.length > 0) || (existente.detDocsReqCotizaVentas && existente.detDocsReqCotizaVentas.length > 0) || (existente.entregasARendirPVentas && existente.entregasARendirPVentas.length > 0)) {
      throw new ConflictError('No se puede eliminar la cotización porque tiene dependencias asociadas.');
    }
    await prisma.cotizacionVentas.delete({ where: { id } });
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
