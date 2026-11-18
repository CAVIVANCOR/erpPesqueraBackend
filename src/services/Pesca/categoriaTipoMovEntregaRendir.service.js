import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { ROLES_CATEGORIA_MOV, normalizarRolSistema } from '../../utils/tiposMovimientoSistema.constants.js';
import { usoDeCategoria, resumenUso } from './usoTipoMovimiento.service.js';

/**
 * Servicio CRUD para CategoriaTipoMovEntregaRendir
 * Previene borrado si tiene tipos de movimiento asociados.
 * Documentado en español.
 */

/**
 * Valida el rol del sistema (`codigoSistema`) de una categoría y devuelve el valor normalizado
 * (`undefined` = no se envió, `null` = sin rol). Reglas: el rol debe existir en el catálogo, su sentido debe coincidir
 * con el de la categoría (`tipo`: false = INGRESO, true = EGRESO), un rol solo puede estar en una categoría y una
 * categoría con rol no puede cesarse (el sistema la necesita para operar).
 */
async function validarRolSistema(data, existente = null) {
  const normalizado = normalizarRolSistema(data.codigoSistema);
  const codigo = normalizado !== undefined ? normalizado : existente?.codigoSistema ?? null;
  if (codigo) {
    const rol = ROLES_CATEGORIA_MOV[codigo];
    const nombre = data.nombre ?? existente?.nombre ?? '';
    if (!rol) {
      throw new ValidationError(`El rol "${codigo}" no es válido para una categoría. Roles permitidos: ${Object.keys(ROLES_CATEGORIA_MOV).join(', ')}.`);
    }

    const tipo = data.tipo !== undefined ? Boolean(data.tipo) : existente?.tipo;
    if (typeof tipo === 'boolean' && tipo === rol.esIngreso) {
      throw new ValidationError(
        `El rol "${rol.etiqueta}" es de ${rol.esIngreso ? 'INGRESO' : 'EGRESO'}, pero la categoría "${nombre}" es de ${tipo ? 'EGRESO' : 'INGRESO'}.`
      );
    }

    if (data.cesado !== undefined && Boolean(data.cesado)) {
      throw new ValidationError(
        `La categoría "${nombre}" cumple el rol "${rol.etiqueta}" que el sistema necesita: no se puede cesar. Quite o reasigne el rol antes.`
      );
    }

    if (!existente || existente.codigoSistema !== codigo) {
      const ocupada = await prisma.categoriaTipoMovEntregaRendir.findFirst({
        where: { codigoSistema: codigo },
        select: { id: true, nombre: true }
      });
      if (ocupada) {
        throw new ConflictError(
          `El rol "${rol.etiqueta}" ya está asignado a la categoría "${ocupada.nombre}" (id ${ocupada.id}). Quítelo de esa categoría antes de asignarlo a otra.`
        );
      }
    }
  }
  return normalizado;
}


async function tieneDependencias(id) {
  const categoria = await prisma.categoriaTipoMovEntregaRendir.findUnique({
    where: { id },
    include: {
      tiposMovimiento: true
    }
  });
  if (!categoria) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');
  return (categoria.tiposMovimiento && categoria.tiposMovimiento.length > 0);
}

const listar = async () => {
  try {
    return await prisma.categoriaTipoMovEntregaRendir.findMany({
      include: {
        creador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        },
        actualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError(`Error al listar categorías: ${err.message}`);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const categoria = await prisma.categoriaTipoMovEntregaRendir.findUnique({ 
      where: { id },
      include: {
        creador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        },
        actualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
    if (!categoria) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');
    return categoria;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError(`Error al obtener categoría: ${err.message}`);
    }
    throw err;
  }
};

const crear = async (data, userId) => {
  try {
    if (!data.nombre || data.nombre.trim() === '') {
      throw new ValidationError('El campo nombre es obligatorio.');
    }

    const codigoSistema = await validarRolSistema(data);

    const datosLimpios = {
      nombre: data.nombre.trim(),
      cesado: data.cesado !== undefined ? Boolean(data.cesado) : false,
      tipo: data.tipo !== undefined ? Boolean(data.tipo) : false,
      creadoPor: userId ? BigInt(userId) : null,
    };
    if (codigoSistema !== undefined) datosLimpios.codigoSistema = codigoSistema;

    return await prisma.categoriaTipoMovEntregaRendir.create({
      data: datosLimpios,
      include: {
        creador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe una categoría con ese nombre.');
      }
      throw new DatabaseError(`Error al crear categoría: ${err.message}`);
    }
    throw err;
  }
};

const actualizar = async (id, data, userId) => {
  try {
    const existente = await prisma.categoriaTipoMovEntregaRendir.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');

    const datosLimpios = {};
    
    if (data.nombre !== undefined) {
      if (!data.nombre || data.nombre.trim() === '') {
        throw new ValidationError('El campo nombre no puede estar vacío.');
      }
      datosLimpios.nombre = data.nombre.trim();
    }
    
    if (data.cesado !== undefined) {
      datosLimpios.cesado = Boolean(data.cesado);
    }
    
    if (data.tipo !== undefined) {
      datosLimpios.tipo = Boolean(data.tipo);
    }

    const codigoSistema = await validarRolSistema(data, existente);
    if (codigoSistema !== undefined) {
      datosLimpios.codigoSistema = codigoSistema;
    }
    
    if (userId) {
      datosLimpios.actualizadoPor = BigInt(userId);
    }

    return await prisma.categoriaTipoMovEntregaRendir.update({
      where: { id }, 
      data: datosLimpios,
      include: {
        actualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe una categoría con ese nombre.');
      }
      throw new DatabaseError(`Error al actualizar categoría: ${err.message}`);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const conRol = await prisma.categoriaTipoMovEntregaRendir.findUnique({ where: { id }, select: { nombre: true, codigoSistema: true } });
    if (conRol?.codigoSistema) {
      throw new ConflictError(
        `La categoría "${conRol.nombre}" cumple el rol "${ROLES_CATEGORIA_MOV[conRol.codigoSistema]?.etiqueta || conRol.codigoSistema}" que el sistema necesita: no se puede eliminar. Quite o reasigne el rol antes.`
      );
    }
    const uso = await usoDeCategoria(id);
    if (uso.total > 0) {
      throw new ConflictError(
        `No se puede eliminar la categoría "${conRol?.nombre || id}": tiene historial en ${uso.tablas.length} tabla(s). ${resumenUso(uso)}.`
      );
    }
    await prisma.categoriaTipoMovEntregaRendir.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError(`Error al eliminar categoría: ${err.message}`);
    }
    throw err;
  }
};

/** Historial de la categoría en todas las tablas (para avisar al usuario antes de eliminar). */
const uso = async (id) => {
  const categoria = await prisma.categoriaTipoMovEntregaRendir.findUnique({ where: { id }, select: { id: true, nombre: true, codigoSistema: true } });
  if (!categoria) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');
  return { ...(await usoDeCategoria(id)), nombre: categoria.nombre, codigoSistema: categoria.codigoSistema };
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  uso
};