import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DescargaFaenaPesca
 * Valida existencia de claves foráneas, unicidad de faenaPescaId y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faenaPesca, temporada, puerto, cliente, patron, motorista, bahia, movIngresoAlmacen] = await Promise.all([
    prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } }),
    prisma.temporadaPesca.findUnique({ where: { id: data.temporadaPescaId } }),
    prisma.puerto.findUnique({ where: { id: data.puertoDescargaId } }),
    prisma.cliente.findUnique({ where: { id: data.clienteId } }),
    prisma.tripulante.findUnique({ where: { id: data.patronId } }),
    prisma.tripulante.findUnique({ where: { id: data.motoristaId } }),
    prisma.bahia.findUnique({ where: { id: data.bahiaId } }),
    prisma.movimientoAlmacen.findUnique({ where: { id: data.movIngresoAlmacenId } })
  ]);
  if (!faenaPesca) throw new ValidationError('El faenaPescaId no existe.');
  if (!temporada) throw new ValidationError('El temporadaPescaId no existe.');
  if (!puerto) throw new ValidationError('El puertoDescargaId no existe.');
  if (!cliente) throw new ValidationError('El clienteId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!bahia) throw new ValidationError('El bahiaId no existe.');
  if (!movIngresoAlmacen) throw new ValidationError('El movIngresoAlmacenId no existe.');
}

async function validarUnicidadFaenaPescaId(faenaPescaId, id = null) {
  const where = id ? { faenaPescaId, NOT: { id } } : { faenaPescaId };
  const existe = await prisma.descargaFaenaPesca.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una descarga para esa faenaPescaId.');
}

const listar = async () => {
  try {
    return await prisma.descargaFaenaPesca.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const descarga = await prisma.descargaFaenaPesca.findUnique({ where: { id } });
    if (!descarga) throw new NotFoundError('DescargaFaenaPesca no encontrada');
    return descarga;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = [
      'faenaPescaId','temporadaPescaId','puertoDescargaId','fechaHoraArriboPuerto','fechaHoraLlegadaPuerto','clienteId','fechaHoraInicioDescarga','fechaHoraFinDescarga','patronId','motoristaId','bahiaId','combustibleAbastecidoGalones','movIngresoAlmacenId'
    ];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    await validarUnicidadFaenaPescaId(data.faenaPescaId);
    return await prisma.descargaFaenaPesca.create({ data });
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
    // Validar claves foráneas si cambian
    const claves = [
      'faenaPescaId','temporadaPescaId','puertoDescargaId','clienteId','patronId','motoristaId','bahiaId','movIngresoAlmacenId'
    ];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      if (data.faenaPescaId && data.faenaPescaId !== existente.faenaPescaId) {
        await validarUnicidadFaenaPescaId(data.faenaPescaId, id);
      }
    }
    return await prisma.descargaFaenaPesca.update({ where: { id }, data });
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
  crear,
  actualizar,
  eliminar
};
