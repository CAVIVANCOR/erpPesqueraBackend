import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DescargaFaenaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, puerto, cliente, patro, motorista, bahia, movIngreso] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }),
    prisma.puerto.findUnique({ where: { id: data.puertoDescargaId } }),
    prisma.cliente.findUnique({ where: { id: data.clienteId } }),
    prisma.personal.findUnique({ where: { id: data.patroId } }),
    prisma.personal.findUnique({ where: { id: data.motoristaId } }),
    prisma.bahia.findUnique({ where: { id: data.bahiaId } }),
    prisma.movimiento.findUnique({ where: { id: data.movIngresoAlmacenId } })
  ]);
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (!puerto) throw new ValidationError('El puertoDescargaId no existe.');
  if (!cliente) throw new ValidationError('El clienteId no existe.');
  if (!patro) throw new ValidationError('El patroId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!bahia) throw new ValidationError('El bahiaId no existe.');
  if (!movIngreso) throw new ValidationError('El movIngresoAlmacenId no existe.');
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
    const obligatorios = ['faenaPescaConsumoId','puertoDescargaId','fechaHoraArriboPuerto','fechaHoraLlegadaPuerto','clienteId','fechaHoraInicioDescarga','fechaHoraFinDescarga','patroId','motoristaId','bahiaId','fechaDescarga','combustibleAbastecidoGalones','movIngresoAlmacenId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.descargaFaenaConsumo.create({ data });
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
    const claves = ['faenaPescaConsumoId','puertoDescargaId','clienteId','patroId','motoristaId','bahiaId','movIngresoAlmacenId'];
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
