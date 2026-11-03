import prisma from "../../config/prismaClient.js";
import { NotFoundError } from "../../utils/errors.js";

/**
 * Origen (módulo y documento) que dio lugar a un movimiento de caja.
 *
 * `moduloOrigenMotivoOperacionId` guarda un id de SUBMÓDULO en las operaciones especializadas de Tesorería
 * (p. ej. 108 Préstamo Bancario, 115 Pagos CxP, 116 Pagos CxC) y un id de MÓDULO en los movimientos de rendición sin
 * proceso. Por eso se resuelve primero el submódulo con modelo de origen y, si no corresponde, el módulo.
 * `origenMotivoOperacionId` es el id del registro del modelo de ese origen.
 *
 * Es solo lectura: no modifica nada.
 */
const NOMBRE_MODELO_VALIDO = /^[A-Za-z][A-Za-z0-9]*$/;

const minusculaInicial = (texto) => texto.charAt(0).toLowerCase() + texto.slice(1);

export const obtenerOrigenOperacion = async (movimientoId) => {
  const movimiento = await prisma.movimientoCaja.findUnique({
    where: { id: BigInt(movimientoId) },
    select: { id: true, moduloOrigenMotivoOperacionId: true, origenMotivoOperacionId: true },
  });
  if (!movimiento) throw new NotFoundError("Movimiento de caja no encontrado.");

  const origenId = movimiento.moduloOrigenMotivoOperacionId;
  if (!origenId) return { origen: null, documento: null };

  const [submodulo, modulo] = await Promise.all([
    prisma.submoduloSistema.findUnique({
      where: { id: origenId },
      select: { id: true, nombre: true, nombreModeloOrigen: true, modulo: { select: { id: true, nombre: true } } },
    }),
    prisma.moduloSistema.findUnique({
      where: { id: origenId },
      select: { id: true, nombre: true, modeloDocumentoOrigen: true },
    }),
  ]);

  let origen = null;
  if (submodulo?.nombreModeloOrigen) {
    origen = { tipo: "SUBMODULO", nombre: `${submodulo.modulo?.nombre || ""} - ${submodulo.nombre}`.replace(/^ - /, ""), modelo: submodulo.nombreModeloOrigen };
  } else if (modulo?.modeloDocumentoOrigen) {
    origen = { tipo: "MODULO", nombre: modulo.nombre, modelo: modulo.modeloDocumentoOrigen };
  } else if (submodulo) {
    origen = { tipo: "SUBMODULO", nombre: `${submodulo.modulo?.nombre || ""} - ${submodulo.nombre}`.replace(/^ - /, ""), modelo: null };
  } else if (modulo) {
    origen = { tipo: "MODULO", nombre: modulo.nombre, modelo: null };
  }

  // Documento: el registro del modelo de origen (sus campos propios), si el movimiento lo enlaza
  let documento = null;
  if (origen?.modelo && movimiento.origenMotivoOperacionId && NOMBRE_MODELO_VALIDO.test(origen.modelo)) {
    const delegado = prisma[minusculaInicial(origen.modelo)];
    if (delegado?.findUnique) {
      try {
        documento = await delegado.findUnique({ where: { id: movimiento.origenMotivoOperacionId } });
      } catch (err) {
        console.error(`[ORIGEN_MOVIMIENTO_CAJA] No se pudo leer ${origen.modelo} ${movimiento.origenMotivoOperacionId}: ${err.message}`);
      }
    }
  }

  return { origen, documentoId: movimiento.origenMotivoOperacionId, documento };
};

export default { obtenerOrigenOperacion };
