import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DescargaFaenaPesca
 * Valida existencia de claves foráneas, unicidad de faenaPescaId y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const validaciones = [];
  
  // Validaciones obligatorias
  validaciones.push(prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } }));
  validaciones.push(prisma.temporadaPesca.findUnique({ where: { id: data.temporadaPescaId } }));
  validaciones.push(prisma.personal.findUnique({ where: { id: data.patronId } }));
  validaciones.push(prisma.personal.findUnique({ where: { id: data.motoristaId } }));
  validaciones.push(prisma.personal.findUnique({ where: { id: data.bahiaId } }));
  
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
  
  const [faenaPesca, temporada, patron, motorista, bahia, puerto, puertoFondeo, cliente, movIngresoAlmacen, especie] = await Promise.all(validaciones);
  
  // Validar campos obligatorios
  if (!faenaPesca) throw new ValidationError('El faenaPescaId no existe.');
  if (!temporada) throw new ValidationError('El temporadaPescaId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!bahia) throw new ValidationError('El bahiaId no existe en la tabla personal.');
  
  // Validar campos opcionales solo si se proporcionaron
  if (data.puertoDescargaId && !puerto) throw new ValidationError('El puertoDescargaId no existe.');
  if (data.puertoFondeoId && !puertoFondeo) throw new ValidationError('El puertoFondeoId no existe.');
  if (data.clienteId && !cliente) throw new ValidationError('El clienteId no existe.');
  if (data.movIngresoAlmacenId && !movIngresoAlmacen) throw new ValidationError('El movIngresoAlmacenId no existe.');
  if (data.especieId && !especie) throw new ValidationError('El especieId no existe.');
}

async function validarUnicidadFaenaPescaId(faenaPescaId, id = null) {
  const where = id ? { faenaPescaId, NOT: { id } } : { faenaPescaId };
  const existe = await prisma.descargaFaenaPesca.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una descarga para esa faenaPescaId.');
}

/**
 * Sincroniza los campos de FaenaPesca con la última DescargaFaenaPesca asociada
 * @param {number} faenaPescaId - ID de la faena de pesca a sincronizar
 */
async function sincronizarFaenaConUltimaDescarga(faenaPescaId) {
  try {
    if (!faenaPescaId) return;
    
    // Buscar la última descarga asociada a esta faena, ordenada por ID descendente
    const ultimaDescarga = await prisma.descargaFaenaPesca.findFirst({
      where: { faenaPescaId },
      orderBy: { id: 'desc' }
    });
    
    if (!ultimaDescarga) return;
    
    // Actualizar los campos de FaenaPesca con los datos de la última descarga
    await prisma.faenaPesca.update({
      where: { id: faenaPescaId },
      data: {
        fechaDescarga: ultimaDescarga.fechaHoraInicioDescarga,
        puertoDescargaId: ultimaDescarga.puertoDescargaId,
        fechaHoraFondeo: ultimaDescarga.fechaHoraFondeo,
        puertoFondeoId: ultimaDescarga.puertoFondeoId
      }
    });
  } catch (err) {
    // Propagar el error manteniendo el patrón del servicio
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos al sincronizar faena', err.message);
    throw err;
  }
}

const listar = async () => {
  try {
    return await prisma.descargaFaenaPesca.findMany({
      include: {
        faenaPesca: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const descarga = await prisma.descargaFaenaPesca.findUnique({ 
      where: { id },
      include: {
        faenaPesca: true
      }
    });
    if (!descarga) throw new NotFoundError('DescargaFaenaPesca no encontrada');
    return descarga;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorFaena = async (faenaPescaId) => {
  try {
    console.log('obtenerPorFaena service - faenaPescaId recibido:', faenaPescaId, typeof faenaPescaId);
    
    if (!faenaPescaId) {
      console.log('obtenerPorFaena service - faenaPescaId es null o undefined');
      return [];
    }

    const result = await prisma.descargaFaenaPesca.findMany({
      where: { faenaPescaId },
      include: {
        faenaPesca: true
      },
      orderBy: { id: 'desc' }
    });
    
    console.log('obtenerPorFaena service - descargas encontradas:', result?.length || 0);
    return result;
  } catch (err) {
    console.error('obtenerPorFaena service - Error:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Solo campos obligatorios según el nuevo modelo
    const obligatorios = [
      'faenaPescaId', 'temporadaPescaId', 'patronId', 'motoristaId', 'bahiaId'
    ];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    await validarUnicidadFaenaPescaId(data.faenaPescaId);
    
    // Agregar timestamp automático para actualizadoEn
    const dataConTimestamp = {
      ...data,
      actualizadoEn: new Date()
    };
    
    const descargaCreada = await prisma.descargaFaenaPesca.create({ data: dataConTimestamp });
    
    // Sincronizar FaenaPesca con la última descarga asociada
    await sincronizarFaenaConUltimaDescarga(data.faenaPescaId);
    
    return descargaCreada;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.descargaFaenaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DescargaFaenaPesca no encontrada');
    
    // Validar claves foráneas si cambian (incluyendo campos opcionales)
    const claves = [
      'faenaPescaId', 'temporadaPescaId', 'puertoDescargaId', 'puertoFondeoId', 'clienteId', 
      'patronId', 'motoristaId', 'bahiaId', 'movIngresoAlmacenId', 'especieId'
    ];
    if (claves.some(k => data[k] !== undefined && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      if (data.faenaPescaId && data.faenaPescaId !== existente.faenaPescaId) {
        await validarUnicidadFaenaPescaId(data.faenaPescaId, id);
      }
    }
    
    // Agregar timestamp automático para actualizadoEn
    const dataConTimestamp = {
      ...data,
      actualizadoEn: new Date()
    };
    
    const descargaActualizada = await prisma.descargaFaenaPesca.update({ where: { id }, data: dataConTimestamp });
    
    // Sincronizar FaenaPesca con la última descarga asociada
    // Usar el faenaPescaId actualizado o el existente
    const faenaPescaIdParaSincronizar = data.faenaPescaId || existente.faenaPescaId;
    await sincronizarFaenaConUltimaDescarga(faenaPescaIdParaSincronizar);
    
    return descargaActualizada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.descargaFaenaPesca.findUnique({
      where: { id },
      include: { detalles: true }
    });
    if (!existente) throw new NotFoundError('DescargaFaenaPesca no encontrada');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.descargaFaenaPesca.delete({ where: { id } });
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
  obtenerPorFaena,
  crear,
  actualizar,
  eliminar,
  sincronizarFaenaConUltimaDescarga
};
