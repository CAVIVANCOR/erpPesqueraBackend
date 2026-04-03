import prisma from "../config/prismaClient.js";

/**
 * Verifica si un usuario es superusuario
 * @param {BigInt|Number} usuarioId - ID del usuario a verificar
 * @returns {Promise<boolean>} true si es superusuario, false en caso contrario
 */
export async function esSuperUsuario(usuarioId) {
  if (!usuarioId) return false;
  
  const usuario = await prisma.usuario.findUnique({
    where: { id: BigInt(usuarioId) },
    select: { esSuperUsuario: true }
  });
  
  return usuario?.esSuperUsuario || false;
}

/**
 * Verifica si se puede editar un registro considerando el estado y permisos de superusuario
 * @param {BigInt|Number} usuarioId - ID del usuario
 * @param {BigInt|Number} estadoActualId - ID del estado actual del registro
 * @param {Array<BigInt|Number>} estadosCerrados - Array de IDs de estados que se consideran "cerrados"
 * @returns {Promise<boolean>} true si puede editar, false si no puede
 */
export async function puedeEditarRegistroCerrado(usuarioId, estadoActualId, estadosCerrados = []) {
  // Si es superusuario, puede editar siempre
  const esSuperUser = await esSuperUsuario(usuarioId);
  if (esSuperUser) return true;
  
  // Si no es superusuario, verificar que el estado NO esté cerrado
  const estadoCerrado = estadosCerrados.some(
    estadoId => BigInt(estadoId) === BigInt(estadoActualId)
  );
  
  return !estadoCerrado;
}

/**
 * Verifica si se puede editar un detalle de faena considerando el estado de la temporada
 * @param {BigInt|Number} usuarioId - ID del usuario
 * @param {BigInt|Number} faenaPescaId - ID de la faena de pesca
 * @returns {Promise<boolean>} true si puede editar, false si no puede
 */
export async function puedeEditarDetalleFaena(usuarioId, faenaPescaId) {
  // Si es superusuario, puede editar siempre
  const esSuperUser = await esSuperUsuario(usuarioId);
  if (esSuperUser) return true;
  
  // Obtener la faena con su temporada
  const faena = await prisma.faenaPesca.findUnique({
    where: { id: BigInt(faenaPescaId) },
    include: {
      temporada: {
        include: {
          estadoTemporada: true
        }
      }
    }
  });
  
  if (!faena) return false;
  
  // Verificar estados cerrados de temporada
  const estadosCerrados = await prisma.estadoMultiFuncion.findMany({
    where: {
      tipoProvieneDeId: 4, // Temporada Pesca
      descripcion: { in: ["FINALIZADA", "CANCELADA"] },
      cesado: false
    },
    select: { id: true }
  });
  
  const idsEstadosCerrados = estadosCerrados.map(e => e.id);
  const estadoCerrado = idsEstadosCerrados.some(
    estadoId => BigInt(estadoId) === BigInt(faena.temporada.estadoTemporadaId)
  );
  
  return !estadoCerrado;
}

export default {
  esSuperUsuario,
  puedeEditarRegistroCerrado,
  puedeEditarDetalleFaena
};
