import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SaldosDetProductoCliente
 * Aplica validaciones de unicidad y existencia de claves foráneas.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del saldo detallado
 */
async function validarForaneas(data) {
  // productoId
  if (data.productoId !== undefined && data.productoId !== null) {
    const prod = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!prod) throw new ValidationError('El producto referenciado no existe.');
  }
  // clienteId (opcional)
  if (data.clienteId !== undefined && data.clienteId !== null) {
    const cli = await prisma.entidadComercial.findUnique({ where: { id: data.clienteId } });
    if (!cli) throw new ValidationError('El cliente referenciado no existe.');
  }
}

/**
 * Valida unicidad compuesta antes de crear o actualizar.
 * @param {Object} data - Datos del saldo detallado
 * @param {BigInt} [id] - ID a excluir (para update)
 */
async function validarUnicidad(data, id = null) {
  const where = {
    empresaId: data.empresaId,
    almacenId: data.almacenId,
    productoId: data.productoId,
    clienteId: data.clienteId ?? null,
    esCustodia: data.esCustodia ?? false,
    lote: data.lote ?? null,
    fechaIngreso: data.fechaIngreso ?? null,
    fechaProduccion: data.fechaProduccion ?? null,
    fechaVencimiento: data.fechaVencimiento ?? null,
    estadoId: data.estadoId ?? null,
    estadoCalidadId: data.estadoCalidadId ?? null,
    numContenedor: data.numContenedor ?? null,
    nroSerie: data.nroSerie ?? null
  };
  const existe = await prisma.saldosDetProductoCliente.findFirst({ where: id ? { ...where, NOT: { id } } : where });
  if (existe) throw new ConflictError('Ya existe un saldo detallado registrado para esta combinación de atributos.');
}

/**
 * Lista todos los saldos detallados producto-cliente con filtros opcionales.
 * @param {Object} filtros - Filtros opcionales
 * @param {BigInt} [filtros.empresaId] - ID de la empresa
 * @param {BigInt} [filtros.almacenId] - ID del almacén
 * @param {BigInt} [filtros.clienteId] - ID del cliente
 * @param {boolean} [filtros.esCustodia] - Si es mercadería en custodia
 * @param {boolean} [filtros.soloConSaldo] - Solo productos con saldo > 0
 * @param {BigInt} [filtros.productoId] - ID del producto
 * @param {BigInt} [filtros.familiaId] - ID de la familia del producto
 * @param {BigInt} [filtros.subfamiliaId] - ID de la subfamilia del producto
 * @param {BigInt} [filtros.marcaId] - ID de la marca del producto
 * @param {BigInt} [filtros.procedenciaId] - ID de procedencia del producto
 * @param {BigInt} [filtros.tipoAlmacenamientoId] - ID del tipo de almacenamiento
 * @param {BigInt} [filtros.tipoMaterialId] - ID del tipo de material
 * @param {BigInt} [filtros.unidadMedidaId] - ID de la unidad de medida
 * @param {BigInt} [filtros.especieId] - ID de la especie
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    const productoWhere = {};
    
    // Filtros directos de SaldosDetProductoCliente
    if (filtros.empresaId !== undefined) where.empresaId = filtros.empresaId;
    if (filtros.almacenId !== undefined) where.almacenId = filtros.almacenId;
    if (filtros.clienteId !== undefined) where.clienteId = filtros.clienteId;
    if (filtros.esCustodia !== undefined) where.esCustodia = filtros.esCustodia;
    if (filtros.productoId !== undefined) where.productoId = filtros.productoId;
    
    // Filtro de solo con saldo
    if (filtros.soloConSaldo === true) {
      where.saldoCantidad = { gt: 0 };
    }
    
    // Filtros de producto (requieren join)
    if (filtros.familiaId !== undefined) productoWhere.familiaId = filtros.familiaId;
    if (filtros.subfamiliaId !== undefined) productoWhere.subfamiliaId = filtros.subfamiliaId;
    if (filtros.marcaId !== undefined) productoWhere.marcaId = filtros.marcaId;
    if (filtros.procedenciaId !== undefined) productoWhere.procedenciaId = filtros.procedenciaId;
    if (filtros.tipoAlmacenamientoId !== undefined) productoWhere.tipoAlmacenamientoId = filtros.tipoAlmacenamientoId;
    if (filtros.tipoMaterialId !== undefined) productoWhere.tipoMaterialId = filtros.tipoMaterialId;
    if (filtros.unidadMedidaId !== undefined) productoWhere.unidadMedidaId = filtros.unidadMedidaId;
    if (filtros.especieId !== undefined) productoWhere.especieId = filtros.especieId;
    
    // Si hay filtros de producto, agregarlos al where
    if (Object.keys(productoWhere).length > 0) {
      where.producto = productoWhere;
    }
    
    const saldos = await prisma.saldosDetProductoCliente.findMany({
      where,
      include: {
        producto: {
          include: {
            unidadMedida: true,
            familia: true,
            subfamilia: true,
            marca: true,
            tipoAlmacenamiento: true,
            tipoMaterial: true,
            color: true
          }
        },
        cliente: true
      },
      orderBy: [
        { producto: { descripcionArmada: 'asc' } },
        { lote: 'asc' },
        { fechaIngreso: 'desc' }
      ]
    });
    
    // Enriquecer con empresa, almacén y estados (no están en el schema como relaciones)
    const saldosEnriquecidos = await Promise.all(
      saldos.map(async (saldo) => {
        const empresa = await prisma.empresa.findUnique({ 
          where: { id: saldo.empresaId },
          select: { id: true, razonSocial: true }
        });
        const almacen = await prisma.almacen.findUnique({ 
          where: { id: saldo.almacenId },
          select: { id: true, nombre: true }
        });
        
        let estado = null;
        let estadoCalidad = null;
        
        if (saldo.estadoId) {
          estado = await prisma.estadoMultiFuncion.findUnique({
            where: { id: saldo.estadoId },
            select: { id: true, descripcion: true }
          });
        }
        
        if (saldo.estadoCalidadId) {
          estadoCalidad = await prisma.estadoMultiFuncion.findUnique({
            where: { id: saldo.estadoCalidadId },
            select: { id: true, descripcion: true }
          });
        }
        
        return {
          ...saldo,
          empresa,
          almacen,
          estado,
          estadoCalidad
        };
      })
    );
    
    return saldosEnriquecidos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un saldo detallado por ID con relaciones incluidas.
 */
const obtenerPorId = async (id) => {
  try {
    const saldo = await prisma.saldosDetProductoCliente.findUnique({ 
      where: { id },
      include: {
        producto: {
          include: {
            unidadMedida: true
          }
        },
        cliente: true
      }
    });
    if (!saldo) throw new NotFoundError('SaldosDetProductoCliente no encontrado');
    
    // Enriquecer con empresa, almacén y estados
    const empresa = await prisma.empresa.findUnique({ 
      where: { id: saldo.empresaId },
      select: { id: true, razonSocial: true }
    });
    const almacen = await prisma.almacen.findUnique({ 
      where: { id: saldo.almacenId },
      select: { id: true, nombre: true }
    });
    
    let estado = null;
    let estadoCalidad = null;
    
    if (saldo.estadoId) {
      estado = await prisma.estadoMultiFuncion.findUnique({
        where: { id: saldo.estadoId },
        select: { id: true, descripcion: true }
      });
    }
    
    if (saldo.estadoCalidadId) {
      estadoCalidad = await prisma.estadoMultiFuncion.findUnique({
        where: { id: saldo.estadoCalidadId },
        select: { id: true, descripcion: true }
      });
    }
    
    return {
      ...saldo,
      empresa,
      almacen,
      estado,
      estadoCalidad
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un saldo detallado validando unicidad compuesta y existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.empresaId || !data.almacenId || !data.productoId || !data.saldoCantidad) {
      throw new ValidationError('Los campos empresaId, almacenId, productoId y saldoCantidad son obligatorios.');
    }
    await validarForaneas(data);
    await validarUnicidad(data);
    return await prisma.saldosDetProductoCliente.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un saldo detallado existente, validando existencia, unicidad y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.saldosDetProductoCliente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('SaldosDetProductoCliente no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    // Validar unicidad si se modifica algún campo de la clave compuesta
    const claves = ['empresaId', 'almacenId', 'productoId', 'clienteId', 'esCustodia', 'lote', 'fechaIngreso', 'fechaProduccion', 'fechaVencimiento', 'estadoId', 'estadoCalidadId', 'numContenedor', 'nroSerie'];
    if (claves.some(k => data[k] !== undefined && data[k] !== existente[k])) {
      await validarUnicidad({ ...existente, ...data }, id);
    }
    return await prisma.saldosDetProductoCliente.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un saldo detallado por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.saldosDetProductoCliente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('SaldosDetProductoCliente no encontrado');
    await prisma.saldosDetProductoCliente.delete({ where: { id } });
    return true;
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
  eliminar
};