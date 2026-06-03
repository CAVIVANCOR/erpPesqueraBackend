import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio para consulta de documentos pendientes de cobro y pago
 * Para vista de Tesorería - Pendientes
 * Documentado en español.
 */

/**
 * Listar todos los documentos pendientes (CxC y CxP con saldo > 0)
 * @param {Object} filtros - Filtros opcionales
 * @param {BigInt} filtros.empresaId - ID de empresa
 * @param {String} filtros.tipo - 'COBRAR' | 'PAGAR' | null (todos)
 * @param {String} filtros.vencimiento - 'VENCIDOS' | 'HOY' | 'SEMANA' | null
 * @param {BigInt} filtros.monedaId - ID de moneda
 * @returns {Array} Lista de documentos pendientes con información consolidada
 */
const listarPendientes = async (filtros = {}) => {
  try {
    const {
      empresaId,
      tipo,
      vencimiento,
      monedaId,
    } = filtros;

    // ========================================
    // CONSTRUIR WHERE PARA CxC
    // ========================================
    const whereCxC = {
      saldoPendiente: { gt: 0 },
    };

    if (empresaId) {
      whereCxC.empresaId = Number(empresaId);
    }

    if (monedaId) {
      whereCxC.monedaId = Number(monedaId);
    }

    if (vencimiento) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (vencimiento === 'VENCIDOS') {
        whereCxC.fechaVencimiento = { lt: hoy };
      } else if (vencimiento === 'HOY') {
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        whereCxC.fechaVencimiento = {
          gte: hoy,
          lt: manana,
        };
      } else if (vencimiento === 'SEMANA') {
        const finSemana = new Date(hoy);
        finSemana.setDate(finSemana.getDate() + 7);
        whereCxC.fechaVencimiento = {
          gte: hoy,
          lt: finSemana,
        };
      }
    }

    // ========================================
    // CONSTRUIR WHERE PARA CxP (mismo patrón)
    // ========================================
    const whereCxP = {
      saldoPendiente: { gt: 0 },
    };

    if (empresaId) {
      whereCxP.empresaId = Number(empresaId);
    }

    if (monedaId) {
      whereCxP.monedaId = Number(monedaId);
    }

    if (vencimiento) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (vencimiento === 'VENCIDOS') {
        whereCxP.fechaVencimiento = { lt: hoy };
      } else if (vencimiento === 'HOY') {
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        whereCxP.fechaVencimiento = {
          gte: hoy,
          lt: manana,
        };
      } else if (vencimiento === 'SEMANA') {
        const finSemana = new Date(hoy);
        finSemana.setDate(finSemana.getDate() + 7);
        whereCxP.fechaVencimiento = {
          gte: hoy,
          lt: finSemana,
        };
      }
    }

    // ========================================
    // CONSULTAR CxC (solo si tipo no es 'PAGAR')
    // ========================================
    let cuentasPorCobrar = [];
    if (!tipo || tipo === 'COBRAR') {
      cuentasPorCobrar = await prisma.cuentaPorCobrar.findMany({
        where: whereCxC,
        include: {
          cliente: {
            select: {
              id: true,
              razonSocial: true,
              numeroDocumento: true,
              tipoEntidad: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
          empresa: {
            select: {
              id: true,
              razonSocial: true,
              ruc: true,
            },
          },
          moneda: {
            select: {
              id: true,
              simbolo: true,
              codigoSunat: true,
            },
          },
          comprobanteElectronico: {
            select: {
              id: true,
              numeroCompleto: true,
              tipoComprobante: {
                select: {
                  id: true,
                  descripcion: true,  // ✅ CORREGIDO: nombre → descripcion
                  codigoSunat: true,
                },
              },
            },
          },
          preFactura: {
            select: {
              id: true,
              numeroDocumento: true,
            },
          },
          estado: {
            select: {
              id: true,
              descripcion: true,
              severityColor: true,
            },
          },
          pagos: {
            select: {
              id: true,
              montoPagado: true,
              montoAplicadoDeuda: true,
              fechaPago: true,
              movimientoCajaId: true,
            },
            orderBy: {
              fechaPago: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          fechaVencimiento: 'asc',
        },
      });
    }

    // ========================================
    // CONSULTAR CxP (solo si tipo no es 'COBRAR')
    // ========================================
    let cuentasPorPagar = [];
    if (!tipo || tipo === 'PAGAR') {
      cuentasPorPagar = await prisma.cuentaPorPagar.findMany({
        where: whereCxP,
        include: {
          proveedor: {
            select: {
              id: true,
              razonSocial: true,
              numeroDocumento: true,
              tipoEntidad: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
          empresa: {
            select: {
              id: true,
              razonSocial: true,
              ruc: true,
            },
          },
          moneda: {
            select: {
              id: true,
              simbolo: true,
              codigoSunat: true,
            },
          },
          ordenCompra: {
            select: {
              id: true,
              numeroDocumento: true,
            },
          },
          estado: {
            select: {
              id: true,
              descripcion: true,
              severityColor: true,
            },
          },
          pagos: {
            select: {
              id: true,
              montoPagado: true,
              montoAplicadoDeuda: true,
              fechaPago: true,
              movimientoCajaId: true,
            },
            orderBy: {
              fechaPago: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          fechaVencimiento: 'asc',
        },
      });
    }

    // ========================================
    // TRANSFORMAR CxC A FORMATO CONSOLIDADO
    // ========================================
    const cxcConsolidadas = cuentasPorCobrar.map((cxc) => ({
      id: cxc.id,
      tipo: 'INGRESO',
      tipoDocumento: 'CXC',
      origen: 'Cuentas por Cobrar',
      origenId: cxc.id,
      documentoNumero: cxc.comprobanteElectronico
        ? cxc.comprobanteElectronico.numeroCompleto
        : cxc.preFactura
        ? cxc.preFactura.numeroDocumento
        : `CxC-${cxc.id}`,
      documentoTipo: cxc.comprobanteElectronico?.tipoComprobante?.descripcion || 'Pre-Factura',  // ✅ CORREGIDO
      entidadComercial: {
        id: cxc.cliente?.id,
        razonSocial: cxc.cliente?.razonSocial || 'N/A',
        numeroDocumento: cxc.cliente?.numeroDocumento,
        tipo: cxc.cliente?.tipoEntidad?.nombre || 'Cliente',
      },
      empresa: cxc.empresa,
      fechaEmision: cxc.fechaEmision,
      fechaVencimiento: cxc.fechaVencimiento,
      moneda: cxc.moneda,
      montoTotal: cxc.montoTotal,
      montoPagado: cxc.montoPagado,
      saldoPendiente: cxc.saldoPendiente,
      estado: cxc.estado,
      ultimoPago: cxc.pagos?.[0] || null,
      movimientoCajaId: cxc.pagos?.[0]?.movimientoCajaId || null,
    }));

    // ========================================
    // TRANSFORMAR CxP A FORMATO CONSOLIDADO
    // ========================================
    const cxpConsolidadas = cuentasPorPagar.map((cxp) => ({
      id: cxp.id,
      tipo: 'EGRESO',
      tipoDocumento: 'CXP',
      origen: 'Cuentas por Pagar',
      origenId: cxp.id,
      documentoNumero: cxp.ordenCompra
        ? `OC-${cxp.ordenCompra.numeroOrdenCompra}`
        : `CxP-${cxp.id}`,
      documentoTipo: 'Orden de Compra',
      entidadComercial: {
        id: cxp.proveedor?.id,
        razonSocial: cxp.proveedor?.razonSocial || 'N/A',
        numeroDocumento: cxp.proveedor?.numeroDocumento,
        tipo: cxp.proveedor?.tipoEntidad?.nombre || 'Proveedor',
      },
      empresa: cxp.empresa,
      fechaEmision: cxp.fechaEmision,
      fechaVencimiento: cxp.fechaVencimiento,
      moneda: cxp.moneda,
      montoTotal: cxp.montoTotal,
      montoPagado: cxp.montoPagado,
      saldoPendiente: cxp.saldoPendiente,
      estado: cxp.estado,
      ultimoPago: cxp.pagos?.[0] || null,
      movimientoCajaId: cxp.pagos?.[0]?.movimientoCajaId || null,
    }));

    // ========================================
    // COMBINAR Y RETORNAR
    // ========================================
    const pendientes = [...cxcConsolidadas, ...cxpConsolidadas];

    pendientes.sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

    return pendientes;
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar pendientes",
        err.message,
      );
    }
    throw err;
  }
};

/**
 * Obtener resumen de pendientes (totales por moneda y tipo)
 * @param {BigInt} empresaId - ID de empresa (opcional)
 * @returns {Object} Resumen con totales
 */
const obtenerResumen = async (empresaId = null) => {
  try {
    const where = empresaId ? { empresaId: Number(empresaId) } : {};

    const cxcAgrupadas = await prisma.cuentaPorCobrar.groupBy({
      by: ['monedaId'],
      where: {
        ...where,
        saldoPendiente: { gt: 0 },
      },
      _sum: {
        saldoPendiente: true,
      },
      _count: {
        id: true,
      },
    });

    const cxpAgrupadas = await prisma.cuentaPorPagar.groupBy({
      by: ['monedaId'],
      where: {
        ...where,
        saldoPendiente: { gt: 0 },
      },
      _sum: {
        saldoPendiente: true,
      },
      _count: {
        id: true,
      },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const cxcVencidas = await prisma.cuentaPorCobrar.groupBy({
      by: ['monedaId'],
      where: {
        ...where,
        saldoPendiente: { gt: 0 },
        fechaVencimiento: { lt: hoy },
      },
      _sum: {
        saldoPendiente: true,
      },
      _count: {
        id: true,
      },
    });

    const cxpVencidas = await prisma.cuentaPorPagar.groupBy({
      by: ['monedaId'],
      where: {
        ...where,
        saldoPendiente: { gt: 0 },
        fechaVencimiento: { lt: hoy },
      },
      _sum: {
        saldoPendiente: true,
      },
      _count: {
        id: true,
      },
    });

    const monedasIds = [
      ...new Set([
        ...cxcAgrupadas.map((g) => g.monedaId),
        ...cxpAgrupadas.map((g) => g.monedaId),
        ...cxcVencidas.map((g) => g.monedaId),
        ...cxpVencidas.map((g) => g.monedaId),
      ]),
    ];

    const monedas = await prisma.moneda.findMany({
      where: { id: { in: monedasIds } },
      select: {
        id: true,
        simbolo: true,
        codigoSunat: true,
      },
    });

    const resumen = {
      porCobrar: cxcAgrupadas.map((g) => ({
        moneda: monedas.find((m) => m.id === g.monedaId),
        total: g._sum.saldoPendiente,
        cantidad: g._count.id,
      })),
      porPagar: cxpAgrupadas.map((g) => ({
        moneda: monedas.find((m) => m.id === g.monedaId),
        total: g._sum.saldoPendiente,
        cantidad: g._count.id,
      })),
      vencidos: {
        cobrar: cxcVencidas.map((g) => ({
          moneda: monedas.find((m) => m.id === g.monedaId),
          total: g._sum.saldoPendiente,
          cantidad: g._count.id,
        })),
        pagar: cxpVencidas.map((g) => ({
          moneda: monedas.find((m) => m.id === g.monedaId),
          total: g._sum.saldoPendiente,
          cantidad: g._count.id,
        })),
      },
    };

    return resumen;
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al obtener resumen de pendientes",
        err.message,
      );
    }
    throw err;
  }
};

export default {
  listarPendientes,
  obtenerResumen,
};