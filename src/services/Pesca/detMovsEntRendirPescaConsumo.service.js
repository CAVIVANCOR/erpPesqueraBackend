import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetMovsEntRendirPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const validaciones = [
    prisma.entregaARendirPescaConsumo.findUnique({ where: { id: data.entregaARendirPescaConsumoId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
  ];

  // Agregar validación de Moneda si se proporciona monedaId
  if (data.monedaId) {
    validaciones.push(
      prisma.moneda.findUnique({ where: { id: data.monedaId } })
    );
  }

  // Agregar validación de EntidadComercial si se proporciona entidadComercialId
  if (data.entidadComercialId) {
    validaciones.push(
      prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } })
    );
  }

  // Agregar validación de ModuloSistema si se proporciona moduloOrigenMovCajaId
  if (data.moduloOrigenMovCajaId) {
    validaciones.push(
      prisma.moduloSistema.findUnique({ where: { id: data.moduloOrigenMovCajaId } })
    );
  }

  // Agregar validación de TipoDocumento si se proporciona tipoDocumentoId
  if (data.tipoDocumentoId) {
    validaciones.push(
      prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } })
    );
  }

  // Agregar validación de Producto si se proporciona productoId
  if (data.productoId) {
    validaciones.push(
      prisma.producto.findUnique({ where: { id: data.productoId } })
    );
  }

  const [entrega, responsable, tipoMovimiento, centroCosto, moneda, entidadComercial, moduloSistema, tipoDocumento, producto] = await Promise.all(validaciones);
  
  if (!entrega) throw new ValidationError('El entregaARendirPescaConsumoId no existe.');
  if (!responsable) throw new ValidationError('El responsableId no existe.');
  if (!tipoMovimiento) throw new ValidationError('El tipoMovimientoId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
  if (data.monedaId && !moneda) throw new ValidationError('El monedaId no existe.');
  if (data.entidadComercialId && !entidadComercial) throw new ValidationError('El entidadComercialId no existe.');
  if (data.moduloOrigenMovCajaId && !moduloSistema) throw new ValidationError('El moduloOrigenMovCajaId no existe.');
  if (data.tipoDocumentoId && !tipoDocumento) throw new ValidationError('El tipoDocumentoId no existe.');
  if (data.productoId && !producto) throw new ValidationError('El productoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detMovsEntRendirPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P'))
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detMovsEntRendirPescaConsumo.findUnique({ 
      where: { id: BigInt(id) } 
    });
    if (!det) throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P'))
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

async function crear(data) {
  try {
    const obligatorios = [
      'entregaARendirPescaConsumoId',
      'responsableId',
      'fechaMovimiento',
      'tipoMovimientoId',
      'centroCostoId',
      'monto',
    ];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.detMovsEntRendirPescaConsumo.create({ data });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    if (error.code && error.code.startsWith('P'))
      throw new DatabaseError('Error de base de datos', error.message);
    throw error;
  }
}

async function actualizar(id, data) {
  try {
    const existente = await prisma.detMovsEntRendirPescaConsumo.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existente)
      throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = [
      'entregaARendirPescaConsumoId',
      'responsableId',
      'tipoMovimientoId',
      'centroCostoId',
      'moduloOrigenMovCajaId',
      'entidadComercialId',
      'monedaId',
      'tipoDocumentoId',
    ];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detMovsEntRendirPescaConsumo.update({ 
      where: { id: BigInt(id) }, 
      data 
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith('P'))
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

const eliminar = async (id) => {
  try {
    const existente = await prisma.detMovsEntRendirPescaConsumo.findUnique({ where: { id: BigInt(id) } });
    if (!existente) throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    await prisma.detMovsEntRendirPescaConsumo.delete({ where: { id: BigInt(id) } });
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