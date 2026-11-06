import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { normalizarTexto } from '../../utils/texto.util.js';

/**
 * Servicio CRUD de EntidadPension (AFP u ONP).
 * La ONP es una entidad más (esOnp = true). Las tarifas viven en TarifaEntidadPension, con vigencia.
 * Las cuentas por pagar por categoría (empleado / obrero) las usará la contabilización de la planilla.
 */

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

const incluirRelaciones = {
  entidadComercial: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  cuentaPasivoEmpleado: { select: { id: true, codigoCuenta: true, nombreCuenta: true } },
  cuentaPasivoObrero: { select: { id: true, codigoCuenta: true, nombreCuenta: true } },
};

const aIdOpcional = (valor) => (valor === null || valor === '' || valor === undefined ? null : Number(valor));

const camposEditables = (data) => {
  const campos = {};
  if (data.descripcion !== undefined) campos.descripcion = normalizarTexto(data.descripcion);
  if (data.esOnp !== undefined) campos.esOnp = Boolean(data.esOnp);
  if (data.entidadComercialId !== undefined) campos.entidadComercialId = aIdOpcional(data.entidadComercialId);
  if (data.cuentaPasivoEmpleadoId !== undefined) campos.cuentaPasivoEmpleadoId = aIdOpcional(data.cuentaPasivoEmpleadoId);
  if (data.cuentaPasivoObreroId !== undefined) campos.cuentaPasivoObreroId = aIdOpcional(data.cuentaPasivoObreroId);
  if (data.activo !== undefined) campos.activo = Boolean(data.activo);
  return campos;
};

async function validar(campos, id = null) {
  if (campos.descripcion !== undefined) {
    if (!campos.descripcion) throw new ValidationError('La descripción de la entidad de pensión es obligatoria.');
    if (campos.descripcion.length > 100) throw new ValidationError('La descripción no puede exceder 100 caracteres.');
    const duplicada = await prisma.entidadPension.findFirst({
      where: { descripcion: { equals: campos.descripcion, mode: 'insensitive' }, ...(id && { id: { not: id } }) },
    });
    if (duplicada) throw new ConflictError(`Ya existe la entidad de pensión "${duplicada.descripcion}".`);
  }
  if (campos.entidadComercialId) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: campos.entidadComercialId } });
    if (!entidad) throw new ValidationError('La entidad comercial indicada no existe.');
  }
  for (const [campo, etiqueta] of [
    ['cuentaPasivoEmpleadoId', 'cuenta por pagar de empleados'],
    ['cuentaPasivoObreroId', 'cuenta por pagar de obreros'],
  ]) {
    if (campos[campo]) {
      const cuenta = await prisma.planCuentasContable.findUnique({ where: { id: campos[campo] } });
      if (!cuenta) throw new ValidationError(`La ${etiqueta} indicada no existe en el plan de cuentas.`);
    }
  }
}

const listar = async () => {
  try {
    return await prisma.entidadPension.findMany({
      include: {
        ...incluirRelaciones,
        // Última tarifa registrada, para mostrarla en la grilla
        tarifas: { orderBy: { vigenteDesde: 'desc' }, take: 1 },
      },
      orderBy: { descripcion: 'asc' },
    });
  } catch (err) {
    manejarError(err, 'listar las entidades de pensión');
  }
};

const listarActivos = async () => {
  try {
    return await prisma.entidadPension.findMany({ where: { activo: true }, orderBy: { descripcion: 'asc' } });
  } catch (err) {
    manejarError(err, 'listar las entidades de pensión activas');
  }
};

const obtenerPorId = async (id) => {
  try {
    const entidad = await prisma.entidadPension.findUnique({
      where: { id },
      include: { ...incluirRelaciones, tarifas: { orderBy: { vigenteDesde: 'desc' } } },
    });
    if (!entidad) throw new NotFoundError('Entidad de pensión no encontrada');
    return entidad;
  } catch (err) {
    manejarError(err, 'obtener la entidad de pensión');
  }
};

const crear = async (data) => {
  try {
    const campos = camposEditables(data);
    if (campos.descripcion === undefined) throw new ValidationError('La descripción de la entidad de pensión es obligatoria.');
    await validar(campos);
    return await prisma.entidadPension.create({
      data: { ...campos, creadoPor: data.creadoPor || null },
      include: incluirRelaciones,
    });
  } catch (err) {
    manejarError(err, 'crear la entidad de pensión');
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entidadPension.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Entidad de pensión no encontrada');
    const campos = camposEditables(data);
    await validar(campos, id);
    return await prisma.entidadPension.update({
      where: { id },
      data: { ...campos, actualizadoPor: data.actualizadoPor || null },
      include: incluirRelaciones,
    });
  } catch (err) {
    manejarError(err, 'actualizar la entidad de pensión');
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.entidadPension.findUnique({
      where: { id },
      include: { _count: { select: { personal: true, tarifas: true } } },
    });
    if (!existente) throw new NotFoundError('Entidad de pensión no encontrada');
    if (existente._count.personal > 0) {
      throw new ConflictError(
        `No se puede eliminar "${existente.descripcion}" porque ${existente._count.personal} trabajador(es) están afiliados a ella. Desactívela en su lugar.`,
      );
    }
    if (existente._count.tarifas > 0) {
      throw new ConflictError(
        `No se puede eliminar "${existente.descripcion}" porque tiene ${existente._count.tarifas} tarifa(s) registrada(s). Desactívela en su lugar.`,
      );
    }
    await prisma.entidadPension.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar la entidad de pensión');
  }
};

export default { listar, listarActivos, obtenerPorId, crear, actualizar, eliminar };
