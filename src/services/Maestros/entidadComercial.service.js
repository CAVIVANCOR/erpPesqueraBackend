import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntidadComercial
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de numeroDocumento+empresaId y existencia de claves foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos de la entidad comercial
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarEntidadComercial(data, excluirId = null) {
  // Validar unicidad de numeroDocumento+empresaId
  if (data.numeroDocumento && data.empresaId) {
    const where = excluirId ? {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId,
      id: { not: excluirId }
    } : {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId
    };
    const existe = await prisma.entidadComercial.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una entidad comercial con ese número de documento para la empresa.');
  }
  // Validar existencia de claves foráneas obligatorias
  const claves = [
    { campo: 'empresaId', modelo: 'empresa' },
    { campo: 'tipoDocumentoId', modelo: 'tiposDocIdentidad' },
    { campo: 'tipoEntidadId', modelo: 'tipoEntidad' },
    { campo: 'formaPagoId', modelo: 'formaPago' },
    { campo: 'vendedorId', modelo: 'personal' },
    { campo: 'agenciaEnvioId', modelo: 'entidadComercial' } // autoconsulta para agencia
  ];
  for (const ref of claves) {
    if (data[ref.campo]) {
      const existe = await prisma[ref.modelo].findUnique({ where: { id: data[ref.campo] } });
      if (!existe) throw new ValidationError(`Referencia foránea inválida: ${ref.campo}`);
    }
  }
  // Validar agrupacionEntidadId si se provee
  if (data.agrupacionEntidadId) {
    const agrup = await prisma.agrupacionEntidad.findUnique({ where: { id: data.agrupacionEntidadId } });
    if (!agrup) throw new ValidationError('Agrupación de entidad no existente.');
  }
}

/**
 * Lista todas las entidades comerciales, incluyendo relaciones principales.
 */
const listar = async () => {
  try {
    return await prisma.entidadComercial.findMany({
      include: {
        tipoDocumento: true,
        tipoEntidad: true,
        formaPago: true,
        agrupacionEntidad: true,
        contactos: true,
        direcciones: {
          include: {
            ubigeo: true
          }
        },
        precios: true,
        vehiculos: true,
        lineasCredito: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una entidad comercial por ID (incluyendo relaciones principales).
 */
const obtenerPorId = async (id) => {
  try {
    const entidad = await prisma.entidadComercial.findUnique({
      where: { id },
      include: {
        tipoDocumento: true,
        tipoEntidad: true,
        formaPago: true,
        agrupacionEntidad: true,
        contactos: true,
        direcciones: {
          include: {
            ubigeo: true
          }
        },
        precios: true,
        vehiculos: true,
        lineasCredito: true
      }
    });
    if (!entidad) throw new NotFoundError('Entidad comercial no encontrada');
    return entidad;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una entidad comercial validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarEntidadComercial(data);
    return await prisma.entidadComercial.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una entidad comercial existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entidadComercial.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Entidad comercial no encontrada');
    await validarEntidadComercial(data, id);
    return await prisma.entidadComercial.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una entidad comercial por ID, validando existencia y que no tenga relaciones dependientes.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.entidadComercial.findUnique({
      where: { id },
      include: {
        contactos: true,
        direcciones: true,
        precios: true,
        vehiculos: true,
        lineasCredito: true,
        movimientosAlmacen: true,
        kardexAlmacenes: true,
        requerimientosCompra: true,
        ordenesCompra: true,
        preFacturasCliente: true
      }
    });
    if (!existente) throw new NotFoundError('Entidad comercial no encontrada');
    const dependientes = [
      'contactos', 'direcciones', 'precios', 'vehiculos', 'lineasCredito',
      'movimientosAlmacen', 'kardexAlmacenes', 'requerimientosCompra', 'ordenesCompra', 'preFacturasCliente'
    ];
    for (const rel of dependientes) {
      if (Array.isArray(existente[rel]) && existente[rel].length > 0) {
        throw new ConflictError(`No se puede eliminar la entidad comercial porque tiene ${rel} asociados.`);
      }
    }
    await prisma.entidadComercial.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene las agencias de envío (entidades comerciales del tipo "AGENCIA DE ENVIO")
 */
const obtenerAgenciasEnvio = async () => {
  try {
    // Primero buscar el ID del tipo de entidad "AGENCIA DE ENVIO"
    const tipoAgencia = await prisma.tipoEntidad.findFirst({
      where: { nombre: "AGENCIA DE ENVIO" }
    });
    
    if (!tipoAgencia) {
      return []; // Si no existe el tipo, retornar array vacío
    }
    
    // Buscar todas las entidades comerciales de este tipo
    return await prisma.entidadComercial.findMany({
      where: { 
        tipoEntidadId: tipoAgencia.id,
        estado: true // Solo agencias activas
      },
      select: {
        id: true,
        razonSocial: true,
        nombreComercial: true
      },
      orderBy: {
        razonSocial: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene los proveedores GPS (entidades comerciales del tipo "PROVEEDOR EQUIPOS GEOLOCALIZACION")
 */
const obtenerProveedoresGps = async () => {
  try {
    // Primero buscar el ID del tipo de entidad "PROVEEDOR EQUIPOS GEOLOCALIZACION"
    const tipoProveedorGps = await prisma.tipoEntidad.findFirst({
      where: { nombre: "PROVEEDOR EQUIPOS GEOLOCALIZACION" }
    });
    
    if (!tipoProveedorGps) {
      return []; // Si no existe el tipo, retornar array vacío
    }
    
    // Buscar todas las entidades comerciales de este tipo
    return await prisma.entidadComercial.findMany({
      where: { 
        tipoEntidadId: tipoProveedorGps.id,
        estado: true // Solo proveedores activos
      },
      select: {
        id: true,
        razonSocial: true,
        nombreComercial: true
      },
      orderBy: {
        razonSocial: 'asc'
      }
    });
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
  obtenerAgenciasEnvio,
  obtenerProveedoresGps
};
