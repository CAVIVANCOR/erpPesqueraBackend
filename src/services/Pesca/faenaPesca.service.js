import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para FaenaPesca
 * Valida existencia de claves foráneas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [temporada, bahia, motorista, patron, puertoSalida, puertoRetorno, puertoDescarga, embarcacion, boliche] = await Promise.all([
    prisma.temporadaPesca.findUnique({ where: { id: data.temporadaId } }),
    prisma.bahia.findUnique({ where: { id: data.bahiaId } }),
    prisma.tripulante.findUnique({ where: { id: data.motoristaId } }),
    prisma.tripulante.findUnique({ where: { id: data.patronId } }),
    prisma.puerto.findUnique({ where: { id: data.puertoSalidaId } }),
    prisma.puerto.findUnique({ where: { id: data.puertoRetornoId } }),
    prisma.puerto.findUnique({ where: { id: data.puertoDescargaId } }),
    data.embarcacionId ? prisma.embarcacion.findUnique({ where: { id: data.embarcacionId } }) : Promise.resolve(true),
    data.bolicheRedId ? prisma.bolicheRed.findUnique({ where: { id: data.bolicheRedId } }) : Promise.resolve(true)
  ]);
  if (!temporada) throw new ValidationError('El temporadaId no existe.');
  if (!bahia) throw new ValidationError('El bahiaId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!puertoSalida) throw new ValidationError('El puertoSalidaId no existe.');
  if (!puertoRetorno) throw new ValidationError('El puertoRetornoId no existe.');
  if (!puertoDescarga) throw new ValidationError('El puertoDescargaId no existe.');
  if (data.embarcacionId && !embarcacion) throw new ValidationError('El embarcacionId no existe.');
  if (data.bolicheRedId && !boliche) throw new ValidationError('El bolicheRedId no existe.');
}

const listar = async () => {
  try {
    return await prisma.faenaPesca.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const faena = await prisma.faenaPesca.findUnique({ where: { id } });
    if (!faena) throw new NotFoundError('FaenaPesca no encontrada');
    return faena;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['temporadaId','bahiaId','motoristaId','patronId','fechaSalida','fechaRetorno','puertoSalidaId','puertoRetornoId','puertoDescargaId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.faenaPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.faenaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('FaenaPesca no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['temporadaId','bahiaId','motoristaId','patronId','puertoSalidaId','puertoRetornoId','puertoDescargaId','embarcacionId','bolicheRedId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.faenaPesca.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.faenaPesca.findUnique({
      where: { id },
      include: {
        detallesDoc: true,
        tripulantes: true,
        detalleDocsTripulantes: true,
        calas: true,
        calasProduce: true,
        accionesPrevias: true,
        liquidacionFaena: true,
        descargaFaena: true
      }
    });
    if (!existente) throw new NotFoundError('FaenaPesca no encontrada');
    if (
      (existente.detallesDoc && existente.detallesDoc.length > 0) ||
      (existente.tripulantes && existente.tripulantes.length > 0) ||
      (existente.detalleDocsTripulantes && existente.detalleDocsTripulantes.length > 0) ||
      (existente.calas && existente.calas.length > 0) ||
      (existente.calasProduce && existente.calasProduce.length > 0) ||
      (existente.accionesPrevias && existente.accionesPrevias.length > 0) ||
      existente.liquidacionFaena ||
      existente.descargaFaena
    ) {
      throw new ConflictError('No se puede eliminar porque tiene dependencias asociadas.');
    }
    await prisma.faenaPesca.delete({ where: { id } });
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
