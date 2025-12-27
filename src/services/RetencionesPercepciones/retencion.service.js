import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Retencion
 * Gestiona las retenciones aplicadas a proveedores.
 * Documentado en español.
 */

async function validarRetencion(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) throw new ValidationError('El proveedor referenciado no existe.');
  }

  if (data.cuentaPorPagarId) {
    const cuenta = await prisma.cuentaPorPagar.findUnique({ where: { id: data.cuentaPorPagarId } });
    if (!cuenta) throw new ValidationError('La cuenta por pagar referenciada no existe.');
  }

  if (data.tipoRetencionId) {
    const tipo = await prisma.tipoRetencionPercepcion.findUnique({ where: { id: data.tipoRetencionId } });
    if (!tipo) throw new ValidationError('El tipo de retención referenciado no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.porcentajeRetencion !== undefined && (data.porcentajeRetencion < 0 || data.porcentajeRetencion > 100)) {
    throw new ValidationError('El porcentaje de retención debe estar entre 0 y 100.');
  }

  if (data.montoRetenido !== undefined && data.montoRetenido < 0) {
    throw new ValidationError('El monto retenido no puede ser negativo.');
  }
}

const listar = async () => {
  try {
    return await prisma.retencion.findMany({
      include: {
        empresa: true,
        proveedor: true,
        cuentaPorPagar: true,
        tipoRetencion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaRetencion: 'desc' }
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
    const retencion = await prisma.retencion.findUnique({
      where: { id },
      include: {
        empresa: true,
        proveedor: true,
        cuentaPorPagar: true,
        tipoRetencion: true,
        moneda: true,
        estado: true
      }
    });
    if (!retencion) throw new NotFoundError('Retención no encontrada');
    return retencion;
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
    if (!data.empresaId || !data.proveedorId || !data.fechaRetencion || !data.montoRetenido || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarRetencion(data);

    const retencionData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.retencion.create({ data: retencionData });
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
    const existente = await prisma.retencion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Retención no encontrada');

    await validarRetencion({ ...data, id });

    const retencionData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.retencion.update({
      where: { id },
      data: retencionData
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
    const existente = await prisma.retencion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Retención no encontrada');

    await prisma.retencion.delete({ where: { id } });
    return true;
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
    return await prisma.retencion.findMany({
      where: { empresaId },
      include: {
        proveedor: true,
        tipoRetencion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaRetencion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorProveedor = async (proveedorId) => {
  try {
    return await prisma.retencion.findMany({
      where: { proveedorId },
      include: {
        empresa: true,
        tipoRetencion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaRetencion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorPeriodo = async (empresaId, fechaInicio, fechaFin) => {
  try {
    return await prisma.retencion.findMany({
      where: {
        empresaId,
        fechaRetencion: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      },
      include: {
        proveedor: true,
        tipoRetencion: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaRetencion: 'asc' }
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
  listarPorProveedor,
  listarPorPeriodo
};
