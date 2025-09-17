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
  validaciones.push(prisma.bahiaComercial.findUnique({ where: { id: data.bahiaId } }));
  
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
  
  const [faena, patron, motorista, bahia, puerto, puertoFondeo, cliente, movIngreso, especie] = await Promise.all(validaciones);
  
  // Validar campos obligatorios
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!bahia) throw new ValidationError('El bahiaId no existe.');
  
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
    const existente = await prisma.descargaFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DescargaFaenaConsumo no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaConsumoId','puertoDescargaId','clienteId','patronId','motoristaId','bahiaId','movIngresoAlmacenId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.descargaFaenaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDetalles(id)) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.descargaFaenaConsumo.delete({ where: { id } });
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
