import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DescargaFaenaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const validaciones = [];
  
  // Validaciones obligatorias
  validaciones.push(prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }));
  validaciones.push(prisma.personal.findUnique({ where: { id: data.patronId } }));
  validaciones.push(prisma.personal.findUnique({ where: { id: data.motoristaId } }));
  // ❌ ELIMINADO: validaciones.push(prisma.bahiaComercial.findUnique({ where: { id: data.bahiaId } }));
  // bahiaId es solo un campo numérico sin relación definida en el schema
  
  // Validaciones opcionales (solo si el campo tiene valor)
  if (data.puertoDescargaId) {
    validaciones.push(prisma.puertoPesca.findUnique({ where: { id: data.puertoDescargaId } }));
  } else {
    validaciones.push(Promise.resolve(true)); // placeholder
  }
  
  if (data.puertoFondeoId) {
    validaciones.push(prisma.puertoPesca.findUnique({ where: { id: data.puertoFondeoId } }));
  } else {
    validaciones.push(Promise.resolve(true)); // placeholder
  }
  
  if (data.clienteId) {
    validaciones.push(prisma.entidadComercial.findUnique({ where: { id: data.clienteId } }));
  } else {
    validaciones.push(Promise.resolve(true)); // placeholder
  }
  
  if (data.movIngresoAlmacenId) {
    validaciones.push(prisma.movimientoAlmacen.findUnique({ where: { id: data.movIngresoAlmacenId } }));
  } else {
    validaciones.push(Promise.resolve(true)); // placeholder
  }
  
  if (data.especieId) {
    validaciones.push(prisma.especie.findUnique({ where: { id: data.especieId } }));
  } else {
    validaciones.push(Promise.resolve(true)); // placeholder
  }
  
  const [faena, patron, motorista, puerto, puertoFondeo, cliente, movIngreso, especie] = await Promise.all(validaciones);
  
  // Validar campos obligatorios
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  // ❌ ELIMINADO: if (!bahia) throw new ValidationError('El bahiaId no existe.');
  
  // Validar campos opcionales solo si se proporcionaron
  if (data.puertoDescargaId && !puerto) throw new ValidationError('El puertoDescargaId no existe.');
  if (data.puertoFondeoId && !puertoFondeo) throw new ValidationError('El puertoFondeoId no existe.');
  if (data.clienteId && !cliente) throw new ValidationError('El clienteId no existe.');
  if (data.movIngresoAlmacenId && !movIngreso) throw new ValidationError('El movIngresoAlmacenId no existe.');
  if (data.especieId && !especie) throw new ValidationError('El especieId no existe.');
}

async function tieneDetalles(id) {
  const descarga = await prisma.descargaFaenaConsumo.findUnique({
    where: { id },
    include: { detalles: true }
  });
  if (!descarga) throw new NotFoundError('DescargaFaenaConsumo no encontrada');
  return descarga.detalles && descarga.detalles.length > 0;
}

const listar = async () => {
  try {
    return await prisma.descargaFaenaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const descarga = await prisma.descargaFaenaConsumo.findUnique({ where: { id } });
    if (!descarga) throw new NotFoundError('DescargaFaenaConsumo no encontrada');
    return descarga;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['faenaPescaConsumoId','patronId','motoristaId','bahiaId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    
    // Agregar timestamp automático para actualizadoEn
    const dataConTimestamp = {
      ...data,
      actualizadoEn: new Date()
    };
    
    return await prisma.descargaFaenaConsumo.create({ data: dataConTimestamp });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const descargaExistente = await prisma.descargaFaenaConsumo.findUnique({ where: { id } });
    if (!descargaExistente) throw new NotFoundError('DescargaFaenaConsumo no encontrada');
    
    await validarClavesForaneas(data);
    
    // Agregar timestamp automático para actualizadoEn
    const dataConTimestamp = {
      ...data,
      actualizadoEn: new Date()
    };
    
    return await prisma.descargaFaenaConsumo.update({ where: { id }, data: dataConTimestamp });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const descargaExistente = await prisma.descargaFaenaConsumo.findUnique({ where: { id } });
    if (!descargaExistente) throw new NotFoundError('DescargaFaenaConsumo no encontrada');
    
    if (await tieneDetalles(id)) {
      throw new ConflictError('No se puede eliminar la descarga porque tiene detalles asociados.');
    }
    
    return await prisma.descargaFaenaConsumo.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorFaena = async (faenaPescaConsumoId) => {
  try {
    return await prisma.descargaFaenaConsumo.findMany({
      where: { faenaPescaConsumoId }
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
  obtenerPorFaena
};