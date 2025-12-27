import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Pago
 * Gestiona los pagos de cuentas por cobrar y por pagar.
 * Documentado en español.
 */

async function validarPago(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.cuentaPorCobrarId) {
    const cuenta = await prisma.cuentaPorCobrar.findUnique({ where: { id: data.cuentaPorCobrarId } });
    if (!cuenta) throw new ValidationError('La cuenta por cobrar referenciada no existe.');
  }

  if (data.cuentaPorPagarId) {
    const cuenta = await prisma.cuentaPorPagar.findUnique({ where: { id: data.cuentaPorPagarId } });
    if (!cuenta) throw new ValidationError('La cuenta por pagar referenciada no existe.');
  }

  if (data.medioPagoId) {
    const medio = await prisma.medioPago.findUnique({ where: { id: data.medioPagoId } });
    if (!medio) throw new ValidationError('El medio de pago referenciado no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.montoPagado !== undefined && data.montoPagado <= 0) {
    throw new ValidationError('El monto pagado debe ser mayor a 0.');
  }

  if (data.cuentaPorCobrarId && data.cuentaPorPagarId) {
    throw new ValidationError('Un pago no puede estar asociado a una cuenta por cobrar y por pagar simultáneamente.');
  }

  if (!data.cuentaPorCobrarId && !data.cuentaPorPagarId) {
    throw new ValidationError('El pago debe estar asociado a una cuenta por cobrar o por pagar.');
  }
}

const listar = async () => {
  try {
    return await prisma.pago.findMany({
      include: {
        empresa: true,
        cuentaPorCobrar: {
          include: { cliente: true }
        },
        cuentaPorPagar: {
          include: { proveedor: true }
        },
        medioPago: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPago: 'desc' }
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
    const pago = await prisma.pago.findUnique({
      where: { id },
      include: {
        empresa: true,
        cuentaPorCobrar: {
          include: { cliente: true }
        },
        cuentaPorPagar: {
          include: { proveedor: true }
        },
        medioPago: true,
        moneda: true,
        estado: true
      }
    });
    if (!pago) throw new NotFoundError('Pago no encontrado');
    return pago;
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
    if (!data.empresaId || !data.fechaPago || !data.montoPagado || !data.medioPagoId || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarPago(data);

    return await prisma.$transaction(async (tx) => {
      const pagoData = {
        ...data,
        fechaActualizacion: new Date()
      };

      const pago = await tx.pago.create({ data: pagoData });

      if (data.cuentaPorCobrarId) {
        const cuenta = await tx.cuentaPorCobrar.findUnique({ 
          where: { id: data.cuentaPorCobrarId } 
        });
        
        const nuevoMontoPagado = (cuenta.montoPagado || 0) + data.montoPagado;
        const nuevoSaldoPendiente = cuenta.montoTotal - nuevoMontoPagado;

        await tx.cuentaPorCobrar.update({
          where: { id: data.cuentaPorCobrarId },
          data: {
            montoPagado: nuevoMontoPagado,
            saldoPendiente: nuevoSaldoPendiente,
            fechaActualizacion: new Date()
          }
        });
      }

      if (data.cuentaPorPagarId) {
        const cuenta = await tx.cuentaPorPagar.findUnique({ 
          where: { id: data.cuentaPorPagarId } 
        });
        
        const nuevoMontoPagado = (cuenta.montoPagado || 0) + data.montoPagado;
        const nuevoSaldoPendiente = cuenta.montoTotal - nuevoMontoPagado;

        await tx.cuentaPorPagar.update({
          where: { id: data.cuentaPorPagarId },
          data: {
            montoPagado: nuevoMontoPagado,
            saldoPendiente: nuevoSaldoPendiente,
            fechaActualizacion: new Date()
          }
        });
      }

      return await tx.pago.findUnique({
        where: { id: pago.id },
        include: {
          empresa: true,
          cuentaPorCobrar: {
            include: { cliente: true }
          },
          cuentaPorPagar: {
            include: { proveedor: true }
          },
          medioPago: true,
          moneda: true,
          estado: true
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
    const existente = await prisma.pago.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago no encontrado');

    await validarPago({ ...data, id });

    const pagoData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.pago.update({
      where: { id },
      data: pagoData
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
    const existente = await prisma.pago.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago no encontrado');

    return await prisma.$transaction(async (tx) => {
      if (existente.cuentaPorCobrarId) {
        const cuenta = await tx.cuentaPorCobrar.findUnique({ 
          where: { id: existente.cuentaPorCobrarId } 
        });
        
        const nuevoMontoPagado = (cuenta.montoPagado || 0) - existente.montoPagado;
        const nuevoSaldoPendiente = cuenta.montoTotal - nuevoMontoPagado;

        await tx.cuentaPorCobrar.update({
          where: { id: existente.cuentaPorCobrarId },
          data: {
            montoPagado: nuevoMontoPagado,
            saldoPendiente: nuevoSaldoPendiente,
            fechaActualizacion: new Date()
          }
        });
      }

      if (existente.cuentaPorPagarId) {
        const cuenta = await tx.cuentaPorPagar.findUnique({ 
          where: { id: existente.cuentaPorPagarId } 
        });
        
        const nuevoMontoPagado = (cuenta.montoPagado || 0) - existente.montoPagado;
        const nuevoSaldoPendiente = cuenta.montoTotal - nuevoMontoPagado;

        await tx.cuentaPorPagar.update({
          where: { id: existente.cuentaPorPagarId },
          data: {
            montoPagado: nuevoMontoPagado,
            saldoPendiente: nuevoSaldoPendiente,
            fechaActualizacion: new Date()
          }
        });
      }

      await tx.pago.delete({ where: { id } });
    });

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
    return await prisma.pago.findMany({
      where: { empresaId },
      include: {
        cuentaPorCobrar: {
          include: { cliente: true }
        },
        cuentaPorPagar: {
          include: { proveedor: true }
        },
        medioPago: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorCuentaCobrar = async (cuentaPorCobrarId) => {
  try {
    return await prisma.pago.findMany({
      where: { cuentaPorCobrarId },
      include: {
        medioPago: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorCuentaPagar = async (cuentaPorPagarId) => {
  try {
    return await prisma.pago.findMany({
      where: { cuentaPorPagarId },
      include: {
        medioPago: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaPago: 'desc' }
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
  listarPorCuentaCobrar,
  listarPorCuentaPagar
};
