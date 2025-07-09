import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para FaenaPescaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [novedad, bahia, motorista, patron, puertoSalida, puertoRetorno, puertoDescarga, embarcacion, boliche] = await Promise.all([
    prisma.novedadPescaConsumo.findUnique({ where: { id: data.novedadPescaConsumoId } }),
    prisma.bahia.findUnique({ where: { id: data.bahiaId } }),
    prisma.personal.findUnique({ where: { id: data.motoristaId } }),
    prisma.personal.findUnique({ where: { id: data.patronId } }),
    prisma.puertoPesca.findUnique({ where: { id: data.puertoSalidaId } }),
    prisma.puertoPesca.findUnique({ where: { id: data.puertoRetornoId } }),
    prisma.puertoPesca.findUnique({ where: { id: data.puertoDescargaId } }),
    data.embarcacionId ? prisma.embarcacion.findUnique({ where: { id: data.embarcacionId } }) : true,
    data.bolicheRedId ? prisma.bolicheRed.findUnique({ where: { id: data.bolicheRedId } }) : true
  ]);
  if (!novedad) throw new ValidationError('El novedadPescaConsumoId no existe.');
  if (!bahia) throw new ValidationError('El bahiaId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!puertoSalida) throw new ValidationError('El puertoSalidaId no existe.');
  if (!puertoRetorno) throw new ValidationError('El puertoRetornoId no existe.');
  if (!puertoDescarga) throw new ValidationError('El puertoDescargaId no existe.');
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
      calasProduce: true,
      descargaFaenaConsumo: true,
      liquidacionFaenaConsumo: true
    }
  });
  if (!faena) throw new NotFoundError('FaenaPescaConsumo no encontrada');
  return (
    (faena.detallesDocEmbarcacion && faena.detallesDocEmbarcacion.length > 0) ||
    (faena.tripulantes && faena.tripulantes.length > 0) ||
    (faena.detalleDocsTripulantes && faena.detalleDocsTripulantes.length > 0) ||
    (faena.accionesPrevias && faena.accionesPrevias.length > 0) ||
    (faena.calas && faena.calas.length > 0) ||
    (faena.calasProduce && faena.calasProduce.length > 0) ||
    !!faena.descargaFaenaConsumo ||
    !!faena.liquidacionFaenaConsumo
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
    const obligatorios = ['novedadPescaConsumoId','bahiaId','motoristaId','patronId','fechaSalida','fechaRetorno','puertoSalidaId','puertoRetornoId','puertoDescargaId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.faenaPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.faenaPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('FaenaPescaConsumo no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['novedadPescaConsumoId','bahiaId','motoristaId','patronId','puertoSalidaId','puertoRetornoId','puertoDescargaId','embarcacionId','bolicheRedId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.faenaPescaConsumo.update({ where: { id }, data });
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
