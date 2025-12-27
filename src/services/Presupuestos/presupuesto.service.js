import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Presupuesto con DetallePresupuesto (maestro-detalle)
 * Gestiona los presupuestos anuales por centro de costo.
 * Documentado en español.
 */

async function validarPresupuesto(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.centroCostoId) {
    const centroCosto = await prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } });
    if (!centroCosto) throw new ValidationError('El centro de costo referenciado no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.anio !== undefined) {
    const anioActual = new Date().getFullYear();
    if (data.anio < 2000 || data.anio > anioActual + 10) {
      throw new ValidationError(`El año debe estar entre 2000 y ${anioActual + 10}.`);
    }
  }

  if (data.empresaId && data.centroCostoId && data.anio !== undefined) {
    const existente = await prisma.presupuesto.findFirst({
      where: {
        empresaId: data.empresaId,
        centroCostoId: data.centroCostoId,
        anio: data.anio,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`Ya existe un presupuesto para el año ${data.anio} en este centro de costo.`);
    }
  }
}

async function validarDetallesPresupuesto(detalles) {
  if (!detalles || detalles.length === 0) {
    throw new ValidationError('El presupuesto debe tener al menos un detalle.');
  }

  for (const detalle of detalles) {
    if (detalle.cuentaContableId) {
      const cuenta = await prisma.planCuentasContable.findUnique({ 
        where: { id: detalle.cuentaContableId } 
      });
      if (!cuenta) {
        throw new ValidationError(`La cuenta contable con ID ${detalle.cuentaContableId} no existe.`);
      }
    }

    if (detalle.mes !== undefined && (detalle.mes < 1 || detalle.mes > 12)) {
      throw new ValidationError('El mes debe estar entre 1 y 12.');
    }

    if (detalle.montoPresupuestado !== undefined && detalle.montoPresupuestado < 0) {
      throw new ValidationError('El monto presupuestado no puede ser negativo.');
    }
  }
}

const listar = async () => {
  try {
    return await prisma.presupuesto.findMany({
      include: {
        empresa: true,
        centroCosto: true,
        estado: true,
        detalles: {
          include: {
            cuentaContable: true
          },
          orderBy: [
            { mes: 'asc' },
            { id: 'asc' }
          ]
        }
      },
      orderBy: { anio: 'desc' }
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
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        empresa: true,
        centroCosto: true,
        estado: true,
        detalles: {
          include: {
            cuentaContable: true
          },
          orderBy: [
            { mes: 'asc' },
            { id: 'asc' }
          ]
        }
      }
    });
    if (!presupuesto) throw new NotFoundError('Presupuesto no encontrado');
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
    if (!data.empresaId || !data.centroCostoId || data.anio === undefined || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    if (!data.detalles || data.detalles.length === 0) {
      throw new ValidationError('El presupuesto debe tener al menos un detalle.');
    }

    await validarPresupuesto(data);
    await validarDetallesPresupuesto(data.detalles);

    return await prisma.$transaction(async (tx) => {
      const presupuesto = await tx.presupuesto.create({
        data: {
          empresaId: data.empresaId,
          centroCostoId: data.centroCostoId,
          anio: data.anio,
          descripcion: data.descripcion,
          estadoId: data.estadoId,
          aprobado: false,
          fechaActualizacion: new Date()
        }
      });

      await Promise.all(
        data.detalles.map((detalle) =>
          tx.detallePresupuesto.create({
            data: {
              presupuestoId: presupuesto.id,
              cuentaContableId: detalle.cuentaContableId,
              mes: detalle.mes,
              montoPresupuestado: detalle.montoPresupuestado || 0,
              montoEjecutado: 0,
              observaciones: detalle.observaciones,
              fechaActualizacion: new Date()
            }
          })
        )
      );

      return await tx.presupuesto.findUnique({
        where: { id: presupuesto.id },
        include: {
          empresa: true,
          centroCosto: true,
          estado: true,
          detalles: {
            include: {
              cuentaContable: true
            },
            orderBy: [
              { mes: 'asc' },
              { id: 'asc' }
            ]
          }
        }
      });
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
    const existente = await prisma.presupuesto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Presupuesto no encontrado');

    if (existente.aprobado) {
      throw new ConflictError('No se puede modificar un presupuesto aprobado.');
    }

    await validarPresupuesto({ ...data, id });

    if (data.detalles && data.detalles.length > 0) {
      await validarDetallesPresupuesto(data.detalles);
    }

    return await prisma.$transaction(async (tx) => {
      const presupuesto = await tx.presupuesto.update({
        where: { id },
        data: {
          descripcion: data.descripcion,
          estadoId: data.estadoId,
          fechaActualizacion: new Date()
        }
      });

      if (data.detalles && data.detalles.length > 0) {
        await tx.detallePresupuesto.deleteMany({
          where: { presupuestoId: id }
        });

        await Promise.all(
          data.detalles.map((detalle) =>
            tx.detallePresupuesto.create({
              data: {
                presupuestoId: id,
                cuentaContableId: detalle.cuentaContableId,
                mes: detalle.mes,
                montoPresupuestado: detalle.montoPresupuestado || 0,
                montoEjecutado: detalle.montoEjecutado || 0,
                observaciones: detalle.observaciones,
                fechaActualizacion: new Date()
              }
            })
          )
        );
      }

      return await tx.presupuesto.findUnique({
        where: { id },
        include: {
          empresa: true,
          centroCosto: true,
          estado: true,
          detalles: {
            include: {
              cuentaContable: true
            },
            orderBy: [
              { mes: 'asc' },
              { id: 'asc' }
            ]
          }
        }
      });
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
    const existente = await prisma.presupuesto.findUnique({
      where: { id },
      include: { detalles: true }
    });

    if (!existente) throw new NotFoundError('Presupuesto no encontrado');

    if (existente.aprobado) {
      throw new ConflictError('No se puede eliminar un presupuesto aprobado.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.detallePresupuesto.deleteMany({
        where: { presupuestoId: id }
      });
      await tx.presupuesto.delete({ where: { id } });
    });

    return true;
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
    return await prisma.presupuesto.findMany({
      where: { empresaId },
      include: {
        centroCosto: true,
        estado: true,
        detalles: true
      },
      orderBy: { anio: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorCentroCosto = async (centroCostoId) => {
  try {
    return await prisma.presupuesto.findMany({
      where: { centroCostoId },
      include: {
        empresa: true,
        estado: true,
        detalles: true
      },
      orderBy: { anio: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const aprobarPresupuesto = async (id, aprobadoPorId) => {
  try {
    const presupuesto = await prisma.presupuesto.findUnique({ where: { id } });
    if (!presupuesto) throw new NotFoundError('Presupuesto no encontrado');

    if (presupuesto.aprobado) {
      throw new ConflictError('El presupuesto ya está aprobado.');
    }

    if (aprobadoPorId) {
      const personal = await prisma.personal.findUnique({ where: { id: aprobadoPorId } });
      if (!personal) {
        throw new ValidationError('El personal que aprueba no existe.');
      }
    }

    return await prisma.presupuesto.update({
      where: { id },
      data: {
        aprobado: true,
        fechaAprobacion: new Date(),
        aprobadoPorId,
        fechaActualizacion: new Date()
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
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
  listarPorCentroCosto,
  aprobarPresupuesto
};
