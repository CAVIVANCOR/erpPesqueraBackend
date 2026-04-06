import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para consulta consolidada de Pagos
 * Combina PagoCuentaPorCobrar y PagoCuentaPorPagar para vistas consolidadas
 * Documentado en español.
 */

const listar = async () => {
  try {
    // Obtener pagos de cuentas por cobrar
    const pagosCobrar = await prisma.pagoCuentaPorCobrar.findMany({
      include: {
        cuentaPorCobrar: {
          include: { 
            cliente: true,
            empresa: true,
            moneda: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true
      },
      orderBy: { fechaPago: 'desc' }
    });

    // Obtener pagos de cuentas por pagar
    const pagosPagar = await prisma.pagoCuentaPorPagar.findMany({
      include: {
        cuentaPorPagar: {
          include: { 
            proveedor: true,
            empresa: true,
            moneda: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true,
        prestamoBancario: { // ⭐ AGREGADO: Incluir relación con préstamo bancario
          include: {
            banco: true,
            tipoPrestamo: true
          }
        }
      },
      orderBy: { fechaPago: 'desc' }
    });

    // Combinar ambos arrays y agregar un campo tipo
    const pagosCobrarConTipo = pagosCobrar.map(p => ({ 
      ...p, 
      tipoPago: 'COBRAR',
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || 'N/A',
      empresaNombre: p.cuentaPorCobrar?.empresa?.razonSocial || 'N/A'
    }));
    
    const pagosPagarConTipo = pagosPagar.map(p => ({ 
      ...p, 
      tipoPago: 'PAGAR',
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || 'N/A',
      empresaNombre: p.cuentaPorPagar?.empresa?.razonSocial || 'N/A'
    }));

    return [...pagosCobrarConTipo, ...pagosPagarConTipo].sort((a, b) => 
      new Date(b.fechaPago) - new Date(a.fechaPago)
    );
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    // Obtener pagos de cuentas por cobrar de la empresa
    const pagosCobrar = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        cuentaPorCobrar: {
          empresaId: Number(empresaId)
        }
      },
      include: {
        cuentaPorCobrar: {
          include: { 
            cliente: true,
            empresa: true,
            moneda: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true
      },
      orderBy: { fechaPago: 'desc' }
    });

    // Obtener pagos de cuentas por pagar de la empresa
    const pagosPagar = await prisma.pagoCuentaPorPagar.findMany({
      where: {
        cuentaPorPagar: {
          empresaId: Number(empresaId)
        }
      },
      include: {
        cuentaPorPagar: {
          include: { 
            proveedor: true,
            empresa: true,
            moneda: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true,
        prestamoBancario: { // ⭐ AGREGADO: Incluir relación con préstamo bancario
          include: {
            banco: true,
            tipoPrestamo: true
          }
        }
      },
      orderBy: { fechaPago: 'desc' }
    });

    const pagosCobrarConTipo = pagosCobrar.map(p => ({ 
      ...p, 
      tipoPago: 'COBRAR',
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || 'N/A',
      empresaNombre: p.cuentaPorCobrar?.empresa?.razonSocial || 'N/A'
    }));
    
    const pagosPagarConTipo = pagosPagar.map(p => ({ 
      ...p, 
      tipoPago: 'PAGAR',
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || 'N/A',
      empresaNombre: p.cuentaPorPagar?.empresa?.razonSocial || 'N/A'
    }));

    return [...pagosCobrarConTipo, ...pagosPagarConTipo].sort((a, b) => 
      new Date(b.fechaPago) - new Date(a.fechaPago)
    );
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos por empresa', err.message);
    }
    throw err;
  }
};

const listarPorCuentaCobrar = async (cuentaPorCobrarId) => {
  try {
    const pagos = await prisma.pagoCuentaPorCobrar.findMany({
      where: { cuentaPorCobrarId: Number(cuentaPorCobrarId) },
      include: {
        cuentaPorCobrar: {
          include: { 
            cliente: true,
            empresa: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true
      },
      orderBy: { fechaPago: 'desc' }
    });

    return pagos.map(p => ({ 
      ...p, 
      tipoPago: 'COBRAR',
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || 'N/A'
    }));
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos por cuenta por cobrar', err.message);
    }
    throw err;
  }
};

const listarPorCuentaPagar = async (cuentaPorPagarId) => {
  try {
    const pagos = await prisma.pagoCuentaPorPagar.findMany({
      where: { cuentaPorPagarId: Number(cuentaPorPagarId) },
      include: {
        cuentaPorPagar: {
          include: { 
            proveedor: true,
            empresa: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true,
        prestamoBancario: { // ⭐ AGREGADO: Incluir relación con préstamo bancario
          include: {
            banco: true,
            tipoPrestamo: true
          }
        }
      },
      orderBy: { fechaPago: 'desc' }
    });

    return pagos.map(p => ({ 
      ...p, 
      tipoPago: 'PAGAR',
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || 'N/A'
    }));
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos por cuenta por pagar', err.message);
    }
    throw err;
  }
};

// NOTA: Las funciones crear, actualizar y eliminar NO están disponibles en este servicio
// porque los pagos se gestionan desde los tabs de CuentaPorCobrar y CuentaPorPagar
// Este servicio es SOLO para consultas consolidadas

const obtenerPorId = async (id, tipoPago) => {
  if (!tipoPago) {
    throw new ValidationError('Debe especificar el tipo de pago (COBRAR o PAGAR)');
  }

  try {
    if (tipoPago === 'COBRAR') {
      const pago = await prisma.pagoCuentaPorCobrar.findUnique({
        where: { id: Number(id) },
        include: {
          cuentaPorCobrar: {
            include: { 
              cliente: true,
              empresa: true
            }
          },
          medioPago: true,
          moneda: true,
          banco: true,
          cuentaBancaria: true
        }
      });
      
      if (!pago) throw new NotFoundError('Pago no encontrado');
      
      return { 
        ...pago, 
        tipoPago: 'COBRAR',
        entidad: pago.cuentaPorCobrar?.cliente?.razonSocial || 'N/A'
      };
    }
    
    if (tipoPago === 'PAGAR') {
      const pago = await prisma.pagoCuentaPorPagar.findUnique({
        where: { id: Number(id) },
        include: {
          cuentaPorPagar: {
            include: { 
              proveedor: true,
              empresa: true
            }
          },
          medioPago: true,
          moneda: true,
          banco: true,
          cuentaBancaria: true,
          prestamoBancario: { // ⭐ AGREGADO: Incluir relación con préstamo bancario
            include: {
              banco: true,
              tipoPrestamo: true
            }
          }
        }
      });
      
      if (!pago) throw new NotFoundError('Pago no encontrado');
      
      return { 
        ...pago, 
        tipoPago: 'PAGAR',
        entidad: pago.cuentaPorPagar?.proveedor?.razonSocial || 'N/A'
      };
    }

    throw new ValidationError('Tipo de pago inválido. Use COBRAR o PAGAR');
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener pago', err.message);
    }
    throw err;
  }
};

/**
 * Lista los pagos (CxC y CxP) generados por un movimiento de caja específico
 * @param {number} movimientoCajaId - ID del movimiento de caja
 * @returns {Promise<Array>} - Lista de pagos generados por el movimiento
 */
const listarPorMovimiento = async (movimientoCajaId) => {
  try {
    // Obtener pagos de cuentas por cobrar del movimiento
    const pagosCobrar = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        movimientoCajaId: Number(movimientoCajaId)
      },
      include: {
        cuentaPorCobrar: {
          include: { 
            cliente: true,
            empresa: true,
            moneda: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true
      },
      orderBy: { fechaPago: 'desc' }
    });

    // Obtener pagos de cuentas por pagar del movimiento
    const pagosPagar = await prisma.pagoCuentaPorPagar.findMany({
      where: {
        movimientoCajaId: Number(movimientoCajaId)
      },
      include: {
        cuentaPorPagar: {
          include: { 
            proveedor: true,
            empresa: true,
            moneda: true
          }
        },
        medioPago: true,
        moneda: true,
        banco: true,
        cuentaBancaria: true,
        prestamoBancario: { // ⭐ AGREGADO: Incluir relación con préstamo bancario
          include: {
            banco: true,
            tipoPrestamo: true
          }
        }
      },
      orderBy: { fechaPago: 'desc' }
    });

    // Combinar ambos arrays y agregar un campo tipo
    const pagosCobrarConTipo = pagosCobrar.map(p => ({ 
      ...p, 
      tipoPago: 'COBRAR',
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || 'N/A',
      empresaNombre: p.cuentaPorCobrar?.empresa?.razonSocial || 'N/A'
    }));
    
    const pagosPagarConTipo = pagosPagar.map(p => ({ 
      ...p, 
      tipoPago: 'PAGAR',
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || 'N/A',
      empresaNombre: p.cuentaPorPagar?.empresa?.razonSocial || 'N/A'
    }));

    return [...pagosCobrarConTipo, ...pagosPagarConTipo].sort((a, b) => 
      new Date(b.fechaPago) - new Date(a.fechaPago)
    );
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos por movimiento', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  listarPorEmpresa,
  listarPorCuentaCobrar,
  listarPorCuentaPagar,
  listarPorMovimiento
};