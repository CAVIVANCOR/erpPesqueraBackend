import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PresupuestoAnual
 * Gestiona los presupuestos anuales por empresa y centro de costo
 */

const incluirRelaciones = {
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
    }
  },
  moneda: {
    select: {
      id: true,
      simbolo: true,
      codigoSunat: true
    }
  },
    estado: {
    select: {
      id: true,
      descripcion: true,
      severityColor: true
    }
  },
   aprobador: {  // ✅ Relación CORRECTA según schema línea 6705
    select: {
      id: true,
      nombres: true,
      apellidos: true
    }
  }
};

async function validarPresupuestoAnual(data) {
    if (!data.empresaId || !data.ejercicio || !data.monedaId || !data.estadoId) {
    throw new ValidationError('Empresa, ejercicio, moneda y estado son obligatorios');
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
  if (!empresa) throw new ValidationError('La empresa referenciada no existe');

    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
  if (!moneda) throw new ValidationError('La moneda referenciada no existe');

  const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
  if (!estado) throw new ValidationError('El estado referenciado no existe');

  if (data.aprobadoPor) {
    const personal = await prisma.personal.findUnique({ where: { id: data.aprobadoPor } });
    if (!personal) throw new ValidationError('El personal aprobador no existe');
  }

   if (data.ejercicio < 2000 || data.ejercicio > 2100) {
    throw new ValidationError('El ejercicio debe estar entre 2000 y 2100');
  }

    const existente = await prisma.presupuestoAnual.findFirst({
    where: {
      empresaId: data.empresaId,
      ejercicio: data.ejercicio,
      id: data.id ? { not: data.id } : undefined
    }
  });

  if (existente) {
    throw new ConflictError('Ya existe un presupuesto para esta empresa y ejercicio');
    }
}

const listar = async () => {
  try {
    return await prisma.presupuestoAnual.findMany({
      include: incluirRelaciones,
           orderBy: [
        { ejercicio: 'desc' },
        { empresa: { razonSocial: 'asc' } }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const presupuesto = await prisma.presupuestoAnual.findUnique({
      where: { id },
      include: incluirRelaciones
    });
    if (!presupuesto) throw new NotFoundError('Presupuesto anual no encontrado');
    return presupuesto;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarPresupuestoAnual(data);

       return await prisma.presupuestoAnual.create({
      data: {
        empresaId: data.empresaId,
        ejercicio: data.ejercicio,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        monedaId: data.monedaId,
        estadoId: data.estadoId,
        aprobadoPor: data.aprobadoPor || null,
        fechaAprobacion: data.fechaAprobacion ? new Date(data.fechaAprobacion) : null,
        observaciones: data.observaciones || null,
        creadoPor: data.creadoPor || null
      },
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.presupuestoAnual.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Presupuesto anual no encontrado');

    await validarPresupuestoAnual({ ...data, id });

    return await prisma.presupuestoAnual.update({
      where: { id },
            data: {
        empresaId: data.empresaId,
        ejercicio: data.ejercicio,
        nombre: data.nombre,
        descripcion: data.descripcion,
        monedaId: data.monedaId,
        estadoId: data.estadoId,
        aprobadoPor: data.aprobadoPor,
        fechaAprobacion: data.fechaAprobacion ? new Date(data.fechaAprobacion) : undefined,
        observaciones: data.observaciones
      },
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.presupuestoAnual.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Presupuesto anual no encontrado');

    const tieneLineas = await prisma.lineaPresupuesto.count({ where: { presupuestoAnualId: id } });
            if (tieneLineas > 0) {
      throw new ConflictError('No se puede eliminar el presupuesto porque tiene líneas asociadas');
    }

    await prisma.presupuestoAnual.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.presupuestoAnual.findMany({
      where: { empresaId },
      include: incluirRelaciones,
      orderBy: { ejercicio: 'desc' }
        });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorEmpresaEjercicio = async (empresaId, ejercicio) => {
  try {
    const presupuesto = await prisma.presupuestoAnual.findFirst({
      where: {
        empresaId,
        ejercicio
      },
      include: incluirRelaciones
    });
    if (!presupuesto) throw new NotFoundError('Presupuesto anual no encontrado para esta empresa y ejercicio');
    return presupuesto;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  obtenerPorEmpresaEjercicio
};