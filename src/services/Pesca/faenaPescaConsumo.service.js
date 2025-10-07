import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para FaenaPescaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene detalles asociados.
 * Documentado en español.
 * Sigue el patrón de faenaPesca.service.js
 */

async function validarClavesForaneas(data) {
  const [
    novedad, bahia, motorista, patron, puertoSalida, puertoDescarga, puertoFondeo, embarcacion, boliche
  ] = await Promise.all([
    data.novedadPescaConsumoId ? prisma.novedadPescaConsumo.findUnique({ where: { id: data.novedadPescaConsumoId } }) : Promise.resolve(true),
    data.bahiaId ? prisma.personal.findUnique({ where: { id: data.bahiaId } }) : Promise.resolve(true),
    data.motoristaId ? prisma.personal.findUnique({ where: { id: data.motoristaId } }) : Promise.resolve(true),
    data.patronId ? prisma.personal.findUnique({ where: { id: data.patronId } }) : Promise.resolve(true),
    data.puertoSalidaId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoSalidaId } }) : Promise.resolve(true),
    data.puertoDescargaId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoDescargaId } }) : Promise.resolve(true),
    data.puertoFondeoId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoFondeoId } }) : Promise.resolve(true),
    data.embarcacionId ? prisma.embarcacion.findUnique({ where: { id: data.embarcacionId } }) : Promise.resolve(true),
    data.bolicheRedId ? prisma.bolicheRed.findUnique({ where: { id: data.bolicheRedId } }) : Promise.resolve(true)
  ]);

  if (data.novedadPescaConsumoId && !novedad) throw new ValidationError('El novedadPescaConsumoId no existe.');
  if (data.bahiaId && !bahia) throw new ValidationError('El bahiaId no existe en la tabla personal.');
  if (data.motoristaId && !motorista) throw new ValidationError('El motoristaId no existe.');
  if (data.patronId && !patron) throw new ValidationError('El patronId no existe.');
  if (data.puertoSalidaId && !puertoSalida) throw new ValidationError('El puertoSalidaId no existe.');
  if (data.puertoDescargaId && !puertoDescarga) throw new ValidationError('El puertoDescargaId no existe.');
  if (data.puertoFondeoId && !puertoFondeo) throw new ValidationError('El puertoFondeoId no existe.');
  if (data.embarcacionId && !embarcacion) throw new ValidationError('El embarcacionId no existe.');
  if (data.bolicheRedId && !boliche) throw new ValidationError('El bolicheRedId no existe.');
}

async function tieneDependencias(id) {
  const faena = await prisma.faenaPescaConsumo.findUnique({
    where: { id },
    include: {
      detallesDocEmbarcacion: true,
      tripulantes: true,
      detalleDocsTripulantes: true,
      accionesPrevias: true,
      calas: true,
      descargaFaenaConsumo: true
    }
  });
  if (!faena) throw new NotFoundError('FaenaPescaConsumo no encontrada');
  return (
    (faena.detallesDocEmbarcacion && faena.detallesDocEmbarcacion.length > 0) ||
    (faena.tripulantes && faena.tripulantes.length > 0) ||
    (faena.detalleDocsTripulantes && faena.detalleDocsTripulantes.length > 0) ||
    (faena.accionesPrevias && faena.accionesPrevias.length > 0) ||
    (faena.calas && faena.calas.length > 0) ||
    !!faena.descargaFaenaConsumo
  );
}

const listar = async () => {
  try {
    return await prisma.faenaPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const faena = await prisma.faenaPescaConsumo.findUnique({ where: { id } });
    if (!faena) throw new NotFoundError('FaenaPescaConsumo no encontrada');
    return faena;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Solo novedadPescaConsumoId es realmente obligatorio (siguiendo patrón de faenaPesca)
    const obligatorios = ['novedadPescaConsumoId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    
    await validarClavesForaneas(data);
    
    // Agregar updatedAt requerido por el modelo
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    
    return await prisma.faenaPescaConsumo.create({ data: dataConFecha });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.faenaPescaConsumo.findUnique({ 
      where: { id },
      include: {
        novedadPescaConsumo: true
      }
    });
    if (!existente) throw new NotFoundError('FaenaPescaConsumo no encontrada');
    
    // ✅ PATRÓN DE faenaPesca.service.js: Filtrar solo los campos que se pueden actualizar directamente
    const camposPermitidos = [
      'descripcion',
      'fechaSalida',
      'fechaDescarga',
      'bahiaId',
      'motoristaId',
      'patronId',
      'puertoSalidaId',
      'puertoDescargaId',
      'puertoFondeoId',
      'embarcacionId',
      'bolicheRedId',
      'urlInformeFaena',
      'estadoFaenaId',
      'toneladasCapturadasFaena',
      'fechaHoraFondeo',
      'bolicheId'
    ];
    
    const dataFiltrada = {};
    for (const campo of camposPermitidos) {
      if (data.hasOwnProperty(campo)) {
        dataFiltrada[campo] = data[campo];
      }
    }
    
    // Validar claves foráneas si cambian
    const claves = ['bahiaId','motoristaId','patronId','puertoSalidaId','puertoDescargaId','puertoFondeoId','embarcacionId','bolicheRedId'];
    if (claves.some(k => dataFiltrada[k] && dataFiltrada[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...dataFiltrada });
    }
    
    // Agregar updatedAt requerido por el modelo
    dataFiltrada.updatedAt = new Date();
    
    return await prisma.faenaPescaConsumo.update({ where: { id }, data: dataFiltrada });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDependencias(id)) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.faenaPescaConsumo.delete({ where: { id } });
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