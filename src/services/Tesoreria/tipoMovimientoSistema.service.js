import prisma from "../../config/prismaClient.js";
import { ValidationError } from "../../utils/errors.js";
import { ROLES_TIPO_MOV, ROLES_CATEGORIA_MOV } from "../../utils/tiposMovimientoSistema.constants.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * RESOLUTOR DE ROLES DE TIPOS Y CATEGORÍAS DE MOVIMIENTO DE CAJA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * El código identifica los tipos/categorías que necesita por su ROL (`codigoSistema`), nunca por su id: los ids cambian
 * cuando se reorganiza el catálogo. Esta es la única vía para convertir un rol en la fila (o id) que lo cumple hoy.
 * No usa caché a propósito: la consulta es por índice único y así un cambio de rol se refleja al instante.
 *
 * Todas las funciones aceptan un cliente de transacción opcional (`tx`) para ejecutarse dentro de `prisma.$transaction`.
 */

const cliente = (tx) => tx || prisma;

const ingresoEgreso = (esIngreso) => (esIngreso ? "INGRESO" : "EGRESO");

/** Tipo de movimiento que cumple un rol. Falla con un mensaje concreto si no existe, está inactivo o su sentido no coincide. */
export async function obtenerTipoPorRol(rol, tx = null) {
  const definicion = ROLES_TIPO_MOV[rol];
  if (!definicion) {
    throw new ValidationError(`El rol de tipo de movimiento "${rol}" no está definido en el sistema.`);
  }
  const tipo = await cliente(tx).tipoMovEntregaRendir.findFirst({ where: { codigoSistema: rol } });
  if (!tipo) {
    throw new ValidationError(
      `No existe un tipo de movimiento con la función "${definicion.etiqueta}" (${rol}). Asígnela en Maestros > Tipos de Movimiento (campo "Función en el sistema").`,
    );
  }
  if (!tipo.activo) {
    throw new ValidationError(
      `El tipo de movimiento "${tipo.nombre}" (función "${definicion.etiqueta}") está inactivo. Actívelo o asigne la función a otro tipo.`,
    );
  }
  if (tipo.esIngreso !== definicion.esIngreso) {
    throw new ValidationError(
      `El tipo de movimiento "${tipo.nombre}" tiene la función "${definicion.etiqueta}", que es de ${ingresoEgreso(definicion.esIngreso)}, pero está configurado como ${ingresoEgreso(tipo.esIngreso)}.`,
    );
  }
  return tipo;
}

/** Id (Number) del tipo de movimiento que cumple un rol. */
export async function obtenerIdTipoPorRol(rol, tx = null) {
  return Number((await obtenerTipoPorRol(rol, tx)).id);
}

/**
 * Id (Number) del tipo que cumple un rol, o null si no está asignado. NO valida activo ni sentido: es para operaciones
 * de lectura y reversión, que deben poder reconocer movimientos históricos aunque el catálogo haya cambiado.
 */
export async function obtenerIdTipoPorRolSinValidar(rol, tx = null) {
  const tipo = await cliente(tx).tipoMovEntregaRendir.findFirst({ where: { codigoSistema: rol }, select: { id: true } });
  return tipo ? Number(tipo.id) : null;
}

/** Ids (Number) de varios roles a la vez: devuelve un objeto { ROL: id }. */
export async function obtenerIdsTiposPorRoles(roles, tx = null) {
  const resultado = {};
  for (const rol of roles) resultado[rol] = await obtenerIdTipoPorRol(rol, tx);
  return resultado;
}

/** Categoría de movimiento que cumple un rol. Falla con un mensaje concreto si no existe o está cesada. */
export async function obtenerCategoriaPorRol(rol, tx = null) {
  const definicion = ROLES_CATEGORIA_MOV[rol];
  if (!definicion) {
    throw new ValidationError(`El rol de categoría de movimiento "${rol}" no está definido en el sistema.`);
  }
  const categoria = await cliente(tx).categoriaTipoMovEntregaRendir.findFirst({ where: { codigoSistema: rol } });
  if (!categoria) {
    throw new ValidationError(
      `No existe una categoría de movimiento con la función "${definicion.etiqueta}" (${rol}). Asígnela en Maestros > Categorías de Tipos de Movimiento (campo "Función en el sistema").`,
    );
  }
  if (categoria.cesado) {
    throw new ValidationError(
      `La categoría de movimiento "${categoria.nombre}" (función "${definicion.etiqueta}") está cesada. Actívela o asigne la función a otra categoría.`,
    );
  }
  return categoria;
}

/** Id (Number) de la categoría de movimiento que cumple un rol. */
export async function obtenerIdCategoriaPorRol(rol, tx = null) {
  return Number((await obtenerCategoriaPorRol(rol, tx)).id);
}

/** ¿El tipo de movimiento indicado pertenece a la categoría que cumple el rol? (sin lanzar error si el rol no está asignado). */
export async function tipoPerteneceACategoriaConRol(tipoMovimientoId, rolCategoria, tx = null) {
  if (!tipoMovimientoId) return false;
  const tipo = await cliente(tx).tipoMovEntregaRendir.findUnique({
    where: { id: Number(tipoMovimientoId) },
    select: { categoria: { select: { codigoSistema: true } } },
  });
  return tipo?.categoria?.codigoSistema === rolCategoria;
}

/** ¿Este tipo (ya cargado con `include: { categoria }`) pertenece a la categoría que cumple el rol? */
export const tipoTieneCategoriaConRol = (tipoMovimiento, rolCategoria) =>
  tipoMovimiento?.categoria?.codigoSistema === rolCategoria;
