import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PreFactura
 * Valida unicidad de código, existencia de claves foráneas y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarUnicidadCodigo(codigo, id = null) {
  const where = id ? { codigo, NOT: { id } } : { codigo };
  const existe = await prisma.preFactura.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una PreFactura con ese código.');
}

async function validarClavesForaneas(data) {
  const checks = [
    prisma.empresa ? prisma.empresa.findUnique({ where: { id: data.empresaId } }) : Promise.resolve(true),
    prisma.entidadComercial.findUnique({ where: { id: data.clienteId } }),
    prisma.direccion ? prisma.direccion.findUnique({ where: { id: data.dirFiscalId } }) : Promise.resolve(true),
    prisma.direccion ? prisma.direccion.findUnique({ where: { id: data.dirEntregaId } }) : Promise.resolve(true),
    prisma.movimientoAlmacen ? (data.movSalidaAlmacenId ? prisma.movimientoAlmacen.findUnique({ where: { id: data.movSalidaAlmacenId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.pais ? (data.paisDestinoId ? prisma.pais.findUnique({ where: { id: data.paisDestinoId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.puerto ? (data.puertoCargaId ? prisma.puerto.findUnique({ where: { id: data.puertoCargaId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.puerto ? (data.puertoDescargaId ? prisma.puerto.findUnique({ where: { id: data.puertoDescargaId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.incoterm ? (data.incotermId ? prisma.incoterm.findUnique({ where: { id: data.incotermId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.entidadComercial ? (data.agenteAduanaId ? prisma.entidadComercial.findUnique({ where: { id: data.agenteAduanaId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.banco ? (data.bancoId ? prisma.banco.findUnique({ where: { id: data.bancoId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.centroCosto ? (data.centroCostoId ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.estado.findUnique({ where: { id: data.estadoId } }),
    prisma.moneda ? (data.monedaId ? prisma.moneda.findUnique({ where: { id: data.monedaId } }) : Promise.resolve(true)) : Promise.resolve(true),
    prisma.persona ? (data.personaRespTransfErpContable ? prisma.persona.findUnique({ where: { id: data.personaRespTransfErpContable } }) : Promise.resolve(true)) : Promise.resolve(true)
  ];
  const [empresa, cliente, dirFiscal, dirEntrega, movSalida, paisDestino, puertoCarga, puertoDescarga, incoterm, agenteAduana, banco, centroCosto, estado, moneda, personaResp] = await Promise.all(checks);
  if (prisma.empresa && !empresa) throw new ValidationError('El empresaId no existe.');
  if (!cliente) throw new ValidationError('El clienteId no existe.');
  if (prisma.direccion && !dirFiscal) throw new ValidationError('El dirFiscalId no existe.');
  if (prisma.direccion && !dirEntrega) throw new ValidationError('El dirEntregaId no existe.');
  if (data.movSalidaAlmacenId && prisma.movimientoAlmacen && !movSalida) throw new ValidationError('El movSalidaAlmacenId no existe.');
  if (data.paisDestinoId && prisma.pais && !paisDestino) throw new ValidationError('El paisDestinoId no existe.');
  if (data.puertoCargaId && prisma.puerto && !puertoCarga) throw new ValidationError('El puertoCargaId no existe.');
  if (data.puertoDescargaId && prisma.puerto && !puertoDescarga) throw new ValidationError('El puertoDescargaId no existe.');
  if (data.incotermId && prisma.incoterm && !incoterm) throw new ValidationError('El incotermId no existe.');
  if (data.agenteAduanaId && prisma.entidadComercial && !agenteAduana) throw new ValidationError('El agenteAduanaId no existe.');
  if (data.bancoId && prisma.banco && !banco) throw new ValidationError('El bancoId no existe.');
  if (data.centroCostoId && prisma.centroCosto && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
  if (!estado) throw new ValidationError('El estadoId no existe.');
  if (data.monedaId && prisma.moneda && !moneda) throw new ValidationError('El monedaId no existe.');
  if (data.personaRespTransfErpContable && prisma.persona && !personaResp) throw new ValidationError('El personaRespTransfErpContable no existe.');
}

const listar = async () => {
  try {
    return await prisma.preFactura.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const pf = await prisma.preFactura.findUnique({ where: { id } });
    if (!pf) throw new NotFoundError('PreFactura no encontrada');
    return pf;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.codigo || !data.empresaId || !data.clienteId || !data.dirFiscalId || !data.dirEntregaId || !data.estadoId) {
      throw new ValidationError('Los campos obligatorios no pueden estar vacíos.');
    }
    await validarUnicidadCodigo(data.codigo);
    await validarClavesForaneas(data);
    return await prisma.preFactura.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.preFactura.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('PreFactura no encontrada');
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    // Validar claves foráneas si cambian
    const claves = ['empresaId','clienteId','dirFiscalId','dirEntregaId','movSalidaAlmacenId','paisDestinoId','puertoCargaId','puertoDescargaId','incotermId','agenteAduanaId','bancoId','centroCostoId','estadoId','monedaId','personaRespTransfErpContable'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.preFactura.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.preFactura.findUnique({
      where: { id },
      include: { detalles: true }
    });
    if (!existente) throw new NotFoundError('PreFactura no encontrada');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.preFactura.delete({ where: { id } });
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
