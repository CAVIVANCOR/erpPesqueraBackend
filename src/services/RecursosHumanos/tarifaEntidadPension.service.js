import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD de TarifaEntidadPension (porcentajes de AFP/ONP con vigencia).
 * Cada cambio de tarifa agrega una fila: al crear una nueva, la tarifa abierta anterior
 * se cierra el día previo a la nueva vigencia, de modo que nunca se sobrescribe el histórico.
 */

const MS_DIA = 24 * 60 * 60 * 1000;

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

const CAMPOS_PORCENTAJE = [
  ['porcentajeAporte', 'el porcentaje de aporte'],
  ['porcentajeSeguro', 'el porcentaje de seguro'],
  ['porcentajeComisionFlujo', 'el porcentaje de comisión sobre flujo'],
  ['porcentajeComisionMixta', 'el porcentaje de comisión mixta'],
];

const aFecha = (valor, etiqueta) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ValidationError(`${etiqueta} no es una fecha válida.`);
  return fecha;
};

const camposEditables = (data) => {
  const campos = {};
  if (data.entidadPensionId !== undefined) campos.entidadPensionId = Number(data.entidadPensionId);
  if (data.vigenteDesde !== undefined) campos.vigenteDesde = aFecha(data.vigenteDesde, 'La fecha de inicio de vigencia');
  if (data.vigenteHasta !== undefined) {
    campos.vigenteHasta = data.vigenteHasta ? aFecha(data.vigenteHasta, 'La fecha de fin de vigencia') : null;
  }
  for (const [campo] of CAMPOS_PORCENTAJE) {
    if (data[campo] !== undefined && data[campo] !== null && data[campo] !== '') campos[campo] = Number(data[campo]);
  }
  if (data.remuneracionMaximaAsegurable !== undefined) {
    campos.remuneracionMaximaAsegurable =
      data.remuneracionMaximaAsegurable === null || data.remuneracionMaximaAsegurable === ''
        ? null
        : Number(data.remuneracionMaximaAsegurable);
  }
  return campos;
};

function validarValores(campos) {
  for (const [campo, etiqueta] of CAMPOS_PORCENTAJE) {
    if (campos[campo] === undefined) continue;
    if (Number.isNaN(campos[campo]) || campos[campo] < 0 || campos[campo] > 100) {
      throw new ValidationError(`Ingrese ${etiqueta} entre 0 y 100.`);
    }
  }
  if (campos.remuneracionMaximaAsegurable !== undefined && campos.remuneracionMaximaAsegurable !== null) {
    if (Number.isNaN(campos.remuneracionMaximaAsegurable) || campos.remuneracionMaximaAsegurable < 0) {
      throw new ValidationError('La remuneración máxima asegurable no puede ser negativa.');
    }
  }
  if (campos.vigenteDesde && campos.vigenteHasta && campos.vigenteHasta < campos.vigenteDesde) {
    throw new ValidationError('La fecha de fin de vigencia no puede ser anterior a la de inicio.');
  }
}

const listar = async (filtros = {}) => {
  try {
    return await prisma.tarifaEntidadPension.findMany({
      where: filtros.entidadPensionId ? { entidadPensionId: Number(filtros.entidadPensionId) } : {},
      include: { entidadPension: { select: { id: true, descripcion: true, esOnp: true } } },
      orderBy: [{ entidadPensionId: 'asc' }, { vigenteDesde: 'desc' }],
    });
  } catch (err) {
    manejarError(err, 'listar las tarifas de pensión');
  }
};

/** Tarifa vigente de cada entidad activa a una fecha (la que usará el cálculo de la planilla). */
const obtenerVigentes = async (fecha) => {
  try {
    const referencia = fecha ? aFecha(fecha, 'La fecha de consulta') : new Date();
    return await prisma.tarifaEntidadPension.findMany({
      where: {
        vigenteDesde: { lte: referencia },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: referencia } }],
        entidadPension: { activo: true },
      },
      include: { entidadPension: { select: { id: true, descripcion: true, esOnp: true } } },
      orderBy: [{ entidadPensionId: 'asc' }, { vigenteDesde: 'desc' }],
    });
  } catch (err) {
    manejarError(err, 'obtener las tarifas vigentes de pensión');
  }
};

const obtenerPorId = async (id) => {
  try {
    const tarifa = await prisma.tarifaEntidadPension.findUnique({
      where: { id },
      include: { entidadPension: { select: { id: true, descripcion: true, esOnp: true } } },
    });
    if (!tarifa) throw new NotFoundError('Tarifa de pensión no encontrada');
    return tarifa;
  } catch (err) {
    manejarError(err, 'obtener la tarifa de pensión');
  }
};

const crear = async (data) => {
  try {
    const campos = camposEditables(data);
    if (!campos.entidadPensionId) throw new ValidationError('Seleccione la entidad de pensión de la tarifa.');
    if (!campos.vigenteDesde) throw new ValidationError('La fecha de inicio de vigencia es obligatoria.');
    if (campos.porcentajeAporte === undefined) throw new ValidationError('El porcentaje de aporte es obligatorio.');
    validarValores(campos);

    const entidad = await prisma.entidadPension.findUnique({ where: { id: campos.entidadPensionId } });
    if (!entidad) throw new ValidationError('La entidad de pensión indicada no existe.');

    const duplicada = await prisma.tarifaEntidadPension.findFirst({
      where: { entidadPensionId: campos.entidadPensionId, vigenteDesde: campos.vigenteDesde },
    });
    if (duplicada) {
      throw new ConflictError(`"${entidad.descripcion}" ya tiene una tarifa con vigencia desde esa fecha. Edítela o elija otra fecha.`);
    }

    return await prisma.$transaction(async (tx) => {
      // Cierra la tarifa abierta anterior el día previo a la nueva vigencia
      const abierta = await tx.tarifaEntidadPension.findFirst({
        where: {
          entidadPensionId: campos.entidadPensionId,
          vigenteHasta: null,
          vigenteDesde: { lt: campos.vigenteDesde },
        },
        orderBy: { vigenteDesde: 'desc' },
      });
      if (abierta) {
        await tx.tarifaEntidadPension.update({
          where: { id: abierta.id },
          data: { vigenteHasta: new Date(campos.vigenteDesde.getTime() - MS_DIA), actualizadoPor: data.creadoPor || null },
        });
      }
      return await tx.tarifaEntidadPension.create({
        data: { ...campos, creadoPor: data.creadoPor || null },
        include: { entidadPension: { select: { id: true, descripcion: true, esOnp: true } } },
      });
    });
  } catch (err) {
    manejarError(err, 'crear la tarifa de pensión');
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tarifaEntidadPension.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tarifa de pensión no encontrada');
    const campos = camposEditables(data);
    // La entidad de una tarifa no se cambia: se crea una tarifa nueva en la otra entidad
    delete campos.entidadPensionId;
    validarValores({ vigenteDesde: existente.vigenteDesde, vigenteHasta: existente.vigenteHasta, ...campos });

    if (campos.vigenteDesde && campos.vigenteDesde.getTime() !== existente.vigenteDesde.getTime()) {
      const duplicada = await prisma.tarifaEntidadPension.findFirst({
        where: { entidadPensionId: existente.entidadPensionId, vigenteDesde: campos.vigenteDesde, id: { not: id } },
      });
      if (duplicada) throw new ConflictError('La entidad ya tiene una tarifa con vigencia desde esa fecha.');
    }
    return await prisma.tarifaEntidadPension.update({
      where: { id },
      data: { ...campos, actualizadoPor: data.actualizadoPor || null },
      include: { entidadPension: { select: { id: true, descripcion: true, esOnp: true } } },
    });
  } catch (err) {
    manejarError(err, 'actualizar la tarifa de pensión');
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tarifaEntidadPension.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tarifa de pensión no encontrada');
    await prisma.tarifaEntidadPension.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar la tarifa de pensión');
  }
};

export default { listar, obtenerVigentes, obtenerPorId, crear, actualizar, eliminar };
