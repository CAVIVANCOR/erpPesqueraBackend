import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { ROLES_TIPO_MOV, normalizarRolSistema } from '../../utils/tiposMovimientoSistema.constants.js';
import { usoDeTipo, resumenUso } from './usoTipoMovimiento.service.js';

/**
 * Servicio CRUD para TipoMovEntregaRendir
 * Previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

/**
 * Valida el rol del sistema (`codigoSistema`) de un tipo antes de guardarlo y deja `data.codigoSistema` normalizado.
 * Reglas: el rol debe existir en el catálogo, su sentido (ingreso/egreso) debe coincidir con el del tipo, un rol solo
 * puede estar en un tipo y un tipo con rol no puede desactivarse (el sistema lo necesita para operar).
 */
async function validarRolSistema(data, existente = null) {
  if (Object.prototype.hasOwnProperty.call(data, 'codigoSistema')) {
    data.codigoSistema = normalizarRolSistema(data.codigoSistema);
  }
  const codigo = data.codigoSistema !== undefined ? data.codigoSistema : existente?.codigoSistema ?? null;
  if (!codigo) return;

  const rol = ROLES_TIPO_MOV[codigo];
  if (!rol) {
    throw new ValidationError(`El rol "${codigo}" no es válido. Roles permitidos: ${Object.keys(ROLES_TIPO_MOV).join(', ')}.`);
  }

  const esIngreso = data.esIngreso !== undefined ? data.esIngreso : existente?.esIngreso;
  if (typeof esIngreso === 'boolean' && esIngreso !== rol.esIngreso) {
    throw new ValidationError(
      `El rol "${rol.etiqueta}" es de ${rol.esIngreso ? 'INGRESO' : 'EGRESO'}, pero el tipo "${data.nombre ?? existente?.nombre ?? ''}" es de ${esIngreso ? 'INGRESO' : 'EGRESO'}.`
    );
  }

  if (data.activo === false) {
    throw new ValidationError(
      `El tipo "${data.nombre ?? existente?.nombre ?? ''}" cumple el rol "${rol.etiqueta}" que el sistema necesita: no se puede desactivar. Quite o reasigne el rol antes.`
    );
  }

  if (!existente || existente.codigoSistema !== codigo) {
    const ocupado = await prisma.tipoMovEntregaRendir.findFirst({
      where: { codigoSistema: codigo },
      select: { id: true, nombre: true }
    });
    if (ocupado) {
      throw new ConflictError(
        `El rol "${rol.etiqueta}" ya está asignado al tipo "${ocupado.nombre}" (id ${ocupado.id}). Quítelo de ese tipo antes de asignarlo a otro.`
      );
    }
  }
}


async function tieneDependencias(id) {
  const tipo = await prisma.tipoMovEntregaRendir.findUnique({
    where: { id },
    include: {
      detMovsEntregaRendir: true,
      movimientosConsumo: true,
      movimientosVentas: true,
      movimientosCompras: true
    }
  });
  if (!tipo) throw new NotFoundError('TipoMovEntregaRendir no encontrado');
  return (
    (tipo.detMovsEntregaRendir && tipo.detMovsEntregaRendir.length > 0) ||
    (tipo.movimientosConsumo && tipo.movimientosConsumo.length > 0) ||
    (tipo.movimientosVentas && tipo.movimientosVentas.length > 0) ||
    (tipo.movimientosCompras && tipo.movimientosCompras.length > 0)
  );
}

const listar = async () => {
  try {
    return await prisma.tipoMovEntregaRendir.findMany({
      include: {
        categoria: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoMovEntregaRendir.findUnique({ 
      where: { id },
      include: {
        categoria: true
      }
    });
    if (!tipo) throw new NotFoundError('TipoMovEntregaRendir no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) throw new ValidationError('El campo nombre es obligatorio.');
    if (typeof data.esIngreso !== 'boolean') throw new ValidationError('El campo esIngreso es obligatorio y debe ser boolean.');
    await validarRolSistema(data);
    return await prisma.tipoMovEntregaRendir.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code === 'P2002') throw new ConflictError('Ya existe un tipo de movimiento con ese rol del sistema.');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoMovEntregaRendir.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoMovEntregaRendir no encontrado');
    await validarRolSistema(data, existente);
    return await prisma.tipoMovEntregaRendir.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code === 'P2002') throw new ConflictError('Ya existe un tipo de movimiento con ese rol del sistema.');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const conRol = await prisma.tipoMovEntregaRendir.findUnique({ where: { id }, select: { nombre: true, codigoSistema: true } });
    if (conRol?.codigoSistema) {
      throw new ConflictError(
        `El tipo "${conRol.nombre}" cumple el rol "${ROLES_TIPO_MOV[conRol.codigoSistema]?.etiqueta || conRol.codigoSistema}" que el sistema necesita: no se puede eliminar. Quite o reasigne el rol antes.`
      );
    }
    const uso = await usoDeTipo(id);
    if (uso.total > 0) {
      throw new ConflictError(
        `No se puede eliminar el tipo "${conRol?.nombre || id}": tiene historial en ${uso.tablas.length} tabla(s). ${resumenUso(uso)}.`
      );
    }
    await prisma.tipoMovEntregaRendir.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/** Historial del tipo en todas las tablas (para avisar al usuario antes de eliminar). */
const uso = async (id) => {
  const tipo = await prisma.tipoMovEntregaRendir.findUnique({ where: { id }, select: { id: true, nombre: true, codigoSistema: true } });
  if (!tipo) throw new NotFoundError('TipoMovEntregaRendir no encontrado');
  return { ...(await usoDeTipo(id)), nombre: tipo.nombre, codigoSistema: tipo.codigoSistema };
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  uso
};
