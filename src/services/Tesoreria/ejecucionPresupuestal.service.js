import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EjecucionPresupuestal
 * Gestiona la ejecución presupuestal vinculada a presupuestos anuales
 */

const incluirRelaciones = {
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
    }
  },
   cuentaContable: {
    select: {
      id: true,
      codigoCuenta: true,  // ✅ Campo CORRECTO según schema línea 4833
      descripcion: true
    }
  },
   centroCosto: {
    select: {
      id: true,
      Codigo: true,  // ✅ Campo CORRECTO según schema línea 326
      Nombre: true   // ✅ Campo CORRECTO según schema línea 327
    }
  }
};

async function validarEjecucionPresupuestal(data) {
  if (!data.empresaId || !data.ejercicio || !data.mes || !data.cuentaContableId) {
    throw new ValidationError('Empresa, ejercicio, mes y cuenta contable son obligatorios');
  }

    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
  if (!empresa) throw new ValidationError('La empresa referenciada no existe');

  const cuentaContable = await prisma.planCuentasContable.findUnique({ where: { id: data.cuentaContableId } });
  if (!cuentaContable) throw new ValidationError('La cuenta contable referenciada no existe');

  if (data.centroCostoId) {
    const centroCosto = await prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } });
    if (!centroCosto) throw new ValidationError('El centro de costo referenciado no existe');
  }

  if (data.mes < 1 || data.mes > 12) {
    throw new ValidationError('El mes debe estar entre 1 y 12');
  }

    if (data.montoPresupuestado !== undefined && data.montoPresupuestado < 0) {
    throw new ValidationError('El monto presupuestado no puede ser negativo');
  }

  if (data.montoEjecutado !== undefined && data.montoEjecutado < 0) {
    throw new ValidationError('El monto ejecutado no puede ser negativo');
  }
}

const listar = async () => {
  try {
    return await prisma.ejecucionPresupuestal.findMany({
      include: incluirRelaciones,
            orderBy: [
        { ejercicio: 'desc' },
        { mes: 'desc' }
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
    const ejecucion = await prisma.ejecucionPresupuestal.findUnique({
      where: { id },
      include: incluirRelaciones
    });
    if (!ejecucion) throw new NotFoundError('Ejecución presupuestal no encontrada');
    return ejecucion;
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
    await validarEjecucionPresupuestal(data);

        return await prisma.ejecucionPresupuestal.create({
      data: {
        empresaId: data.empresaId,
        ejercicio: data.ejercicio,
        mes: data.mes,
        cuentaContableId: data.cuentaContableId,
        centroCostoId: data.centroCostoId || null,
        montoPresupuestado: data.montoPresupuestado || 0,
        montoEjecutado: data.montoEjecutado || 0,
        montoDiferencia: data.montoDiferencia || 0,
        porcentajeEjecucion: data.porcentajeEjecucion || 0,
        sobregiro: data.sobregiro || false
      },
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.ejecucionPresupuestal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Ejecución presupuestal no encontrada');

    await validarEjecucionPresupuestal({ ...data, id });

    return await prisma.ejecucionPresupuestal.update({
      where: { id },
            data: {
        empresaId: data.empresaId,
        ejercicio: data.ejercicio,
        mes: data.mes,
        cuentaContableId: data.cuentaContableId,
        centroCostoId: data.centroCostoId,
        montoPresupuestado: data.montoPresupuestado,
        montoEjecutado: data.montoEjecutado,
        montoDiferencia: data.montoDiferencia,
        porcentajeEjecucion: data.porcentajeEjecucion,
        sobregiro: data.sobregiro
      },
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.ejecucionPresupuestal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Ejecución presupuestal no encontrada');

    await prisma.ejecucionPresupuestal.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.ejecucionPresupuestal.findMany({
      where: { empresaId },
      include: incluirRelaciones,
      orderBy: [
        { ejercicio: 'desc' },
        { mes: 'desc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEjercicio = async (empresaId, ejercicio) => {
  try {
    return await prisma.ejecucionPresupuestal.findMany({
      where: { 
        empresaId,
        ejercicio 
      },
      include: incluirRelaciones,
      orderBy: { mes: 'asc' }
    });
  } catch (err) {
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
  listarPorEjercicio
};