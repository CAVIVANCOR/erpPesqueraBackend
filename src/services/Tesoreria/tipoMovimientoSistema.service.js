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

/**
 * Valida el reemplazo MASIVO del tipo de movimiento de unos registros (DetMovsEntregaRendir o MovimientoCaja) por un
 * tipo destino, y devuelve el tipo destino. Reglas, todas para no alterar la contabilidad ni la lógica por roles:
 *  - El destino existe, está activo y no es un tipo antiguo (" XXX").
 *  - Ni el destino ni los tipos de origen cumplen una función del sistema (codigoSistema): el ITF, SUNAT, las
 *    remuneraciones, las devoluciones y los préstamos entre relacionadas se trasladan junto con su rol, no por aquí.
 *  - Mismo sentido (ingreso/egreso) y misma condición de transferencia (salvo los tipos antiguos " XXX", que no
 *    tienen la marca y justamente se migran al catálogo nuevo).
 *  - Misma función de categoría: un gasto no puede pasar a ser asignación a rendir ni al revés.
 * El asiento contable no guarda el tipo de movimiento, por eso no hay que regenerarlo.
 */
export async function validarReasignacionTipoMasiva(tx, tipoDestinoId, tiposOrigenIds) {
  const destino = await tx.tipoMovEntregaRendir.findUnique({
    where: { id: Number(tipoDestinoId) },
    include: { categoria: true },
  });
  if (!destino) throw new ValidationError("El tipo de movimiento elegido no existe.");
  if (!destino.activo) throw new ValidationError(`El tipo de movimiento "${destino.nombre}" está inactivo: elija un tipo activo.`);
  if (/ XXX$/.test(destino.nombre)) {
    throw new ValidationError(`El tipo "${destino.nombre}" es un tipo antiguo (XXX): elija un tipo del catálogo nuevo.`);
  }
  if (destino.codigoSistema) {
    throw new ValidationError(
      `El tipo "${destino.nombre}" cumple una función del sistema (${destino.codigoSistema}): sus movimientos se registran solo desde las operaciones de Tesorería, no por reemplazo masivo.`,
    );
  }

  const idsUnicos = [...new Set((tiposOrigenIds || []).map((id) => Number(id)))].filter((id) => id !== Number(destino.id));
  if (idsUnicos.length === 0) return destino;
  const origenes = await tx.tipoMovEntregaRendir.findMany({ where: { id: { in: idsUnicos } }, include: { categoria: true } });

  const problemas = [];
  for (const o of origenes) {
    if (o.codigoSistema) {
      problemas.push(`"${o.nombre}" cumple la función ${o.codigoSistema}`);
    } else if (o.esIngreso !== destino.esIngreso) {
      problemas.push(`"${o.nombre}" es de ${ingresoEgreso(o.esIngreso)} y el destino es de ${ingresoEgreso(destino.esIngreso)}`);
    } else if (!/ XXX$/.test(o.nombre) && Boolean(o.esTransferencia) !== Boolean(destino.esTransferencia)) {
      // Los tipos antiguos (" XXX") nacieron sin la marca de transferencia: se exceptúan para poder migrarlos al catálogo nuevo
      problemas.push(`"${o.nombre}" ${o.esTransferencia ? "es" : "no es"} de transferencia y el destino ${destino.esTransferencia ? "sí" : "no"} lo es`);
    } else if ((o.categoria?.codigoSistema || null) !== (destino.categoria?.codigoSistema || null)) {
      problemas.push(`"${o.nombre}" y el destino tienen distinta función de categoría (asignaciones a rendir, remuneraciones o tributos)`);
    }
  }
  if (problemas.length > 0) {
    throw new ValidationError(
      `No se puede reemplazar por "${destino.nombre}": ${problemas.join("; ")}. Quite esos registros de la selección o elija otro tipo.`,
    );
  }
  return destino;
}

/** ¿Este tipo (ya cargado con `include: { categoria }`) pertenece a la categoría que cumple el rol? */
export const tipoTieneCategoriaConRol = (tipoMovimiento, rolCategoria) =>
  tipoMovimiento?.categoria?.codigoSistema === rolCategoria;
