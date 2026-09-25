import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import {
  TIPO_FILTRO_TESORERIA,
  TIPO_DEUDA_TESORERIA,
  TIPO_VENCIMIENTO_TESORERIA,
} from "../../utils/tesoreria.constants.js";
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
/**
 * ========================================
 * CONSTANTES - CATEGORÍAS DE MOVIMIENTOS
 * ========================================
 */

// 🔵 CATEGORÍA DE GASTOS A RENDIR
const CATEGORIA_GASTOS_A_RENDIR = 17; // Categoría "Gastos a Rendir" en TipoMovEntregaRendir
/**
 * Aplicar filtros avanzados a la cláusula WHERE de Prisma
 * Utiliza sintaxis correcta de Prisma para filtrar por relaciones anidadas
 * @param {Object} where - Cláusula WHERE base
 * @param {Object} filtros - Filtros avanzados
 * @param {String} tipoEntidad - 'cliente' | 'proveedor' para filtrar correctamente
 * @returns {Object} WHERE actualizado con filtros avanzados
 */
const aplicarFiltrosAvanzados = (where, filtros, tipoEntidad = null) => {
  const whereActualizado = { ...where };

  // ========================================
  // FILTRO POR RANGO DE FECHAS
  // ========================================
  // Para CxP: filtra por ordenCompra.fechaFacturacion usando sintaxis de relación de Prisma
  // Para CxC: filtra por fechaEmision directamente
  if (filtros.fechaDesde || filtros.fechaHasta) {
    if (tipoEntidad === 'proveedor') {
      // Para CxP: usar sintaxis de relación de Prisma
      const fechaCondiciones = {};
      if (filtros.fechaDesde) {
        const fechaDesde = new Date(filtros.fechaDesde);
        fechaDesde.setHours(0, 0, 0, 0);
        fechaCondiciones.gte = fechaDesde;
      }
      if (filtros.fechaHasta) {
        const fechaHasta = new Date(filtros.fechaHasta);
        fechaHasta.setHours(23, 59, 59, 999);
        fechaCondiciones.lte = fechaHasta;
      }
      
      // Sintaxis correcta de Prisma para filtrar por campo de relación
      whereActualizado.ordenCompra = {
        fechaFacturacion: fechaCondiciones
      };
    } else {
      // Para CxC: filtrar directamente por fechaEmision
      whereActualizado.fechaEmision = {};
      if (filtros.fechaDesde) {
        const fechaDesde = new Date(filtros.fechaDesde);
        fechaDesde.setHours(0, 0, 0, 0);
        whereActualizado.fechaEmision.gte = fechaDesde;
      }
      if (filtros.fechaHasta) {
        const fechaHasta = new Date(filtros.fechaHasta);
        fechaHasta.setHours(23, 59, 59, 999);
        whereActualizado.fechaEmision.lte = fechaHasta;
      }
    }
  }

  // ========================================
  // FILTRO POR CLIENTES (solo CxC)
  // ========================================
  if (filtros.clienteIds && filtros.clienteIds.length > 0 && tipoEntidad === 'cliente') {
    whereActualizado.clienteId = { in: filtros.clienteIds };
  }

  // ========================================
  // FILTRO POR PROVEEDORES (solo CxP)
  // ========================================
  if (filtros.proveedorIds && filtros.proveedorIds.length > 0 && tipoEntidad === 'proveedor') {
    whereActualizado.proveedorId = { in: filtros.proveedorIds };
  }

  // ========================================
  // FILTRO POR ENTIDADES COMERCIALES (TODOS)
  // ========================================
  if (filtros.entidadComercialIds && filtros.entidadComercialIds.length > 0) {
    if (tipoEntidad === 'cliente') {
      whereActualizado.clienteId = { in: filtros.entidadComercialIds };
    } else if (tipoEntidad === 'proveedor') {
      whereActualizado.proveedorId = { in: filtros.entidadComercialIds };
    }
  }

  // ========================================
  // FILTRO POR TIPOS DE DOCUMENTO
  // ========================================
  if (filtros.tipoDocumentoIds && filtros.tipoDocumentoIds.length > 0) {
    whereActualizado.tipoDocumentoId = { in: filtros.tipoDocumentoIds };
  }

  // ========================================
  // FILTRO POR NÚMERO DE DOCUMENTO
  // ========================================
  // Para CxP: busca en ordenCompra.numeroDocumentoFinal usando sintaxis de relación
  // Para CxC: busca en serie y número
  if (filtros.numeroDocumento && filtros.numeroDocumento.trim() !== '') {
    const busqueda = filtros.numeroDocumento.trim();
    if (tipoEntidad === 'proveedor') {
      // Para CxP: sintaxis correcta de Prisma para filtrar por campo de relación
      whereActualizado.ordenCompra = {
        ...whereActualizado.ordenCompra,
        numeroDocumentoFinal: {
          contains: busqueda,
          mode: 'insensitive'
        }
      };
    } else {
      // Para CxC: buscar en serie y número
      whereActualizado.OR = [
        { serie: { contains: busqueda, mode: 'insensitive' } },
        { numero: { contains: busqueda, mode: 'insensitive' } },
      ];
    }
  }

  // ========================================
  // FILTRO POR MONEDAS
  // ========================================
  if (filtros.monedaIds && filtros.monedaIds.length > 0) {
    whereActualizado.monedaId = { in: filtros.monedaIds };
  }

  // ========================================
  // FILTRO POR ESTADOS
  // ========================================
  if (filtros.estadoIds && filtros.estadoIds.length > 0) {
    whereActualizado.estadoId = { in: filtros.estadoIds };
  }

  // ========================================
  // FILTRO POR RANGO DE MONTOS
  // ========================================
  if (filtros.montoDesde !== null || filtros.montoHasta !== null) {
    whereActualizado.saldoPendiente = { ...whereActualizado.saldoPendiente };
    if (filtros.montoDesde !== null) {
      whereActualizado.saldoPendiente.gte = Number(filtros.montoDesde);
    }
    if (filtros.montoHasta !== null) {
      whereActualizado.saldoPendiente.lte = Number(filtros.montoHasta);
    }
  }

  return whereActualizado;
};

const listarPendientes = async (filtros = {}) => {
  try {
    const {
      empresaId,
      tipo,
      tipoDeuda,
      vencimiento,
      monedaId,
    } = filtros;

    // ========================================
    // CONSTRUIR WHERE PARA CxC
    // ========================================
    let whereCxC = {
      saldoPendiente: { gt: 0 },
    };

    if (empresaId) {
      whereCxC.empresaId = Number(empresaId);
    }

    if (monedaId) {
      whereCxC.monedaId = Number(monedaId);
    }

    if (vencimiento && vencimiento !== TIPO_VENCIMIENTO_TESORERIA.TODOS) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (vencimiento === TIPO_VENCIMIENTO_TESORERIA.VENCIDOS) {
        whereCxC.fechaVencimiento = { lt: hoy };
      } else if (vencimiento === TIPO_VENCIMIENTO_TESORERIA.HOY) {
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        whereCxC.fechaVencimiento = {
          gte: hoy,
          lt: manana,
        };
      } else if (vencimiento === TIPO_VENCIMIENTO_TESORERIA.SEMANA) {
        const finSemana = new Date(hoy);
        finSemana.setDate(finSemana.getDate() + 7);
        whereCxC.fechaVencimiento = {
          gte: hoy,
          lt: finSemana,
        };
      }
    }

    // Aplicar filtros avanzados para CxC
    whereCxC = aplicarFiltrosAvanzados(whereCxC, filtros, 'cliente');

    // ========================================
    // CONSTRUIR WHERE PARA CxP (mismo patrón)
    // ========================================
    let whereCxP = {
      saldoPendiente: { gt: 0 },
    };

    if (empresaId) {
      whereCxP.empresaId = Number(empresaId);
    }

    if (monedaId) {
      whereCxP.monedaId = Number(monedaId);
    }

    if (vencimiento && vencimiento !== TIPO_VENCIMIENTO_TESORERIA.TODOS) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (vencimiento === TIPO_VENCIMIENTO_TESORERIA.VENCIDOS) {
        whereCxP.fechaVencimiento = { lt: hoy };
      } else if (vencimiento === TIPO_VENCIMIENTO_TESORERIA.HOY) {
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        whereCxP.fechaVencimiento = {
          gte: hoy,
          lt: manana,
        };
      } else if (vencimiento === TIPO_VENCIMIENTO_TESORERIA.SEMANA) {
        const finSemana = new Date(hoy);
        finSemana.setDate(finSemana.getDate() + 7);
        whereCxP.fechaVencimiento = {
          gte: hoy,
          lt: finSemana,
        };
      }
    }

    // Aplicar filtros avanzados para CxP
    whereCxP = aplicarFiltrosAvanzados(whereCxP, filtros, 'proveedor');

    // ========================================
    // CONSULTAR CxC (solo si tipo es COBRAR o TODOS, y NO hay tipoDeuda)
    // ========================================
    let cuentasPorCobrar = [];
    const hayFiltroDeuda = tipoDeuda && tipoDeuda !== TIPO_DEUDA_TESORERIA.NINGUNO;
    
    if (!hayFiltroDeuda && (!tipo || tipo === TIPO_FILTRO_TESORERIA.COBRAR)) {
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
    // CONSULTAR CxP (solo si tipo es PAGAR o TODOS, y NO hay tipoDeuda)
    // ========================================
    let cuentasPorPagar = [];
    if (!hayFiltroDeuda && (!tipo || tipo === TIPO_FILTRO_TESORERIA.PAGAR)) {
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
              numeroDocumentoFinal: true,
              fechaFacturacion: true,
              fechaVencimiento: true,
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
    // CONSULTAR ENTREGAS A RENDIR (solo si tipo es ASIGNACIONES/GASTOS_DIRECTOS o TODOS, y NO hay tipoDeuda)
    // ========================================
    let entregasARendir = [];
    if (!hayFiltroDeuda && (!tipo || tipo === TIPO_FILTRO_TESORERIA.ASIGNACIONES || tipo === TIPO_FILTRO_TESORERIA.GASTOS_DIRECTOS)) {
      // Construir WHERE para Entregas a Rendir
      const whereEntregas = {
        validadoTesoreria: false,
        operacionMovCajaId: null,
        OR: [
          {
            // 💰 ASIGNACIONES (Entregas a Rendir)
            tipoMovimiento: {
              categoriaId: CATEGORIA_GASTOS_A_RENDIR,
            },
            formaParteCalculoEntregaARendir: true,
            OR: [
              { asignacionOrigenId: null },
              { asignacionOrigenId: 0 },
            ],
          },
          {
            // 💳 GASTOS DIRECTOS (Pagos sin asignación)
            tipoMovimiento: {
              categoriaId: { not: CATEGORIA_GASTOS_A_RENDIR },
            },
            formaParteCalculoEntregaARendir: false,
            OR: [
              { asignacionOrigenId: null },
              { asignacionOrigenId: 0 },
            ],
            entidadComercialId: { not: null },
          },
        ],
      };
      // Filtrar por tipo específico de entrega
      if (tipo === TIPO_FILTRO_TESORERIA.ASIGNACIONES) {
        // Solo Asignaciones (sin entidad comercial)
        whereEntregas.OR = [
          {
            tipoMovimiento: {
              categoriaId: CATEGORIA_GASTOS_A_RENDIR,
            },
            formaParteCalculoEntregaARendir: true,
            OR: [
              { asignacionOrigenId: null },
              { asignacionOrigenId: 0 },
            ],
          },
        ];
      } else if (tipo === TIPO_FILTRO_TESORERIA.GASTOS_DIRECTOS) {
        // Solo Gastos Directos (con entidad comercial)
        whereEntregas.OR = [
          {
            tipoMovimiento: {
              categoriaId: { not: CATEGORIA_GASTOS_A_RENDIR },
            },
            formaParteCalculoEntregaARendir: false,
            OR: [
              { asignacionOrigenId: null },
              { asignacionOrigenId: 0 },
            ],
            entidadComercialId: { not: null },
          },
        ];
      }
      // Si es TODOS, mantener el OR original (ya está definido arriba)

      // Aplicar filtros opcionales
      if (empresaId) {
        whereEntregas.empresaId = Number(empresaId);
      }

      if (monedaId) {
        whereEntregas.monedaId = Number(monedaId);
      }

      // Consultar entregas a rendir pendientes
      entregasARendir = await prisma.detMovsEntregaRendir.findMany({
        where: whereEntregas,
        include: {
          responsable: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              numeroDocumento: true,
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
          tipoMovimiento: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
              esIngreso: true,
              categoriaId: true,
              categoria: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
          moduloOrigen: {
            select: {
              id: true,
              nombre: true,
            },
          },
          embarcacion: {
            select: {
              id: true,
              activo: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
          entidadComercial: {
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
          centroCosto: {
            select: {
              id: true,
              Nombre: true,  // Campo con mayúscula según schema
            },
          },
          producto: {
            select: {
              id: true,
              descripcionBase: true,  // Producto usa descripcionBase, no nombre
            },
          },
        },
        orderBy: {
          fechaMovimiento: 'asc',
        },
      });
    }

    // ========================================
    // CONSULTAR DEUDAS PERSONALES (si tipo es 'DEUDAS_PERSONAL')
    // ========================================
    let deudasPersonales = [];
    if (tipoDeuda === TIPO_DEUDA_TESORERIA.DEUDAS_PERSONAL) {
      const whereDeudas = {
        saldoPendiente: { gt: 0 },
      };

      if (empresaId) {
        whereDeudas.empresaId = Number(empresaId);
      }

      if (monedaId) {
        whereDeudas.monedaId = Number(monedaId);
      }

      if (vencimiento) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (vencimiento === 'VENCIDOS') {
          whereDeudas.fechaVencimiento = { lt: hoy };
        } else if (vencimiento === 'HOY') {
          const manana = new Date(hoy);
          manana.setDate(manana.getDate() + 1);
          whereDeudas.fechaVencimiento = {
            gte: hoy,
            lt: manana,
          };
        } else if (vencimiento === 'SEMANA') {
          const finSemana = new Date(hoy);
          finSemana.setDate(finSemana.getDate() + 7);
          whereDeudas.fechaVencimiento = {
            gte: hoy,
            lt: finSemana,
          };
        }
      }

      deudasPersonales = await prisma.deudaConPersonal.findMany({
        where: whereDeudas,
        include: {
          personal: {
            select: {
              id: true,
              nombres: true,       // ✅ CORRECTO (plural)
              apellidos: true,
              numeroDocumento: true,
              enlaceEntidadComercialId: true,
            },
          },
          empresa: {
            select: {
              id: true,
              razonSocial: true,
              ruc: true,
            },
          },
          tipoDeuda: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
            },
          },
          moneda: {
            select: {
              id: true,
              simbolo: true,
              codigoSunat: true,
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
              montoPago: true,
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
    // CONSULTAR DEUDAS TRIBUTARIAS (si tipo es 'DEUDAS_TRIBUTARIAS')
    // ========================================
    let deudasTributarias = [];
    if (tipoDeuda === TIPO_DEUDA_TESORERIA.DEUDAS_TRIBUTARIAS) {
      const whereDeudasTrib = {
        saldoPendiente: { gt: 0 },
      };

      if (empresaId) {
        whereDeudasTrib.empresaId = Number(empresaId);
      }

      if (monedaId) {
        whereDeudasTrib.monedaId = Number(monedaId);
      }

      if (vencimiento) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (vencimiento === 'VENCIDOS') {
          whereDeudasTrib.fechaVencimiento = { lt: hoy };
        } else if (vencimiento === 'HOY') {
          const manana = new Date(hoy);
          manana.setDate(manana.getDate() + 1);
          whereDeudasTrib.fechaVencimiento = {
            gte: hoy,
            lt: manana,
          };
        } else if (vencimiento === 'SEMANA') {
          const finSemana = new Date(hoy);
          finSemana.setDate(finSemana.getDate() + 7);
          whereDeudasTrib.fechaVencimiento = {
            gte: hoy,
            lt: finSemana,
          };
        }
      }

      deudasTributarias = await prisma.deudaTributaria.findMany({
        where: whereDeudasTrib,
        include: {
          empresa: {
            select: {
              id: true,
              razonSocial: true,
              ruc: true,
            },
          },
          tipoDeuda: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
            },
          },
          moneda: {
            select: {
              id: true,
              simbolo: true,
              codigoSunat: true,
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
              montoPago: true,
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
           documentoNumero: cxc.numeroPreFactura,
      documentoTipo: 'Pre-Factura',
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
      documentoNumero: cxp.ordenCompra?.numeroDocumentoFinal || `CxP-${cxp.id}`,
      documentoTipo: 'Orden de Compra',
      entidadComercial: {
        id: cxp.proveedor?.id,
        razonSocial: cxp.proveedor?.razonSocial || 'N/A',
        numeroDocumento: cxp.proveedor?.numeroDocumento,
        tipo: cxp.proveedor?.tipoEntidad?.nombre || 'Proveedor',
      },
      empresa: cxp.empresa,
      fechaEmision: cxp.ordenCompra?.fechaFacturacion || cxp.fechaEmision,
      fechaVencimiento: cxp.ordenCompra?.fechaVencimiento || cxp.fechaVencimiento,
      moneda: cxp.moneda,
      montoTotal: cxp.montoTotal,
      montoPagado: cxp.montoPagado,
      saldoPendiente: cxp.saldoPendiente,
      estado: cxp.estado,
      ultimoPago: cxp.pagos?.[0] || null,
      movimientoCajaId: cxp.pagos?.[0]?.movimientoCajaId || null,
    }));


    // ========================================
    // TRANSFORMAR ENTREGAS A RENDIR A FORMATO CONSOLIDADO
    // ========================================
    const entregasConsolidadas = entregasARendir.map((entrega) => {
      // Determinar si es Asignación o Gasto Directo
      const esAsignacion =
        entrega.formaParteCalculoEntregaARendir === true &&
        entrega.entidadComercialId === null;

      // Construir nombre completo del responsable
      const nombreResponsable = entrega.responsable
        ? `${entrega.responsable.nombres} ${entrega.responsable.apellidos}`.trim()
        : 'N/A';

      // Determinar entidad comercial o responsable
      const entidadDisplay = esAsignacion
        ? {
          id: entrega.responsable?.id,
          razonSocial: nombreResponsable,
          numeroDocumento: entrega.responsable?.numeroDocumento,
          tipo: 'Responsable',
        }
        : {
          id: entrega.entidadComercial?.id,
          razonSocial: entrega.entidadComercial?.razonSocial || nombreResponsable,
          numeroDocumento: entrega.entidadComercial?.numeroDocumento,
          tipo: entrega.entidadComercial?.tipoEntidad?.nombre || 'Proveedor',
        };

      return {
        id: entrega.id,
        tipo: 'EGRESO',
        tipoDocumento: 'ENTREGA_RENDIR',
        origen: esAsignacion ? 'Asignación a Rendir' : 'Gasto Directo',
        origenId: entrega.id,
        documentoNumero: entrega.numeroSerieComprobante && entrega.numeroCorrelativoComprobante
          ? `${entrega.numeroSerieComprobante}-${entrega.numeroCorrelativoComprobante}`
          : `ER-${entrega.id}`,
        documentoTipo: esAsignacion
          ? 'Asignación'
          : entrega.tipoMovimiento?.nombre || 'Gasto',
        entidadComercial: entidadDisplay,
        empresa: entrega.empresa,
        fechaEmision: entrega.fechaMovimiento,
        fechaVencimiento: entrega.fechaMovimiento, // Usar misma fecha como vencimiento
        moneda: entrega.moneda,
        montoTotal: entrega.monto,
        montoPagado: 0,
        saldoPendiente: entrega.monto,
        estado: {
          id: null,
          descripcion: 'Pendiente de Validación',
          severityColor: 'warning',
        },
        ultimoPago: null,
        movimientoCajaId: null,
        // Campos adicionales específicos de Entregas a Rendir
        esAsignacion,
        responsable: {
          id: entrega.responsable?.id,
          nombreCompleto: nombreResponsable,
        },
        tipoMovimiento: entrega.tipoMovimiento,
        moduloOrigen: entrega.moduloOrigen,
        embarcacion: entrega.embarcacion,
        centroCosto: entrega.centroCosto,
        producto: entrega.producto,
        descripcion: entrega.descripcion,
      };
    });

    // ========================================
    // TRANSFORMAR DEUDAS PERSONALES A FORMATO CONSOLIDADO
    // ========================================
    const deudasConsolidadas = deudasPersonales.map((deuda) => ({
      id: deuda.id,
      tipo: 'EGRESO',
      tipoDocumento: 'DEUDA_PERSONAL',
      origen: 'Deuda Personal',
      origenId: deuda.id,
      documentoNumero: deuda.numeroDocumento || `DP-${deuda.id}`,
      documentoTipo: deuda.tipoDeuda?.nombre || 'Deuda',
      entidadComercial: {
        id: deuda.personal?.id,
        razonSocial: `${deuda.personal?.nombres} ${deuda.personal?.apellidos}`.trim(),
        numeroDocumento: deuda.personal?.numeroDocumento,
        tipo: 'Personal',
      },
      empresa: deuda.empresa,
      fechaEmision: deuda.fecha,
      fechaVencimiento: deuda.fechaVencimiento,
      moneda: deuda.moneda,
      montoTotal: deuda.montoOriginal,
      montoPagado: deuda.montoPagado,
      saldoPendiente: deuda.saldoPendiente,
      estado: deuda.estado,
      ultimoPago: deuda.pagos?.[0] || null,
      movimientoCajaId: deuda.pagos?.[0]?.movimientoCajaId || null,
      esDeudaPersonal: true,
      esGerencial: deuda.esGerencial,
      esSaldoInicial: deuda.esSaldoInicial,
      personal: {
        id: deuda.personal?.id,
        nombreCompleto: `${deuda.personal?.nombres} ${deuda.personal?.apellidos}`.trim(),
      },
      tipoDeuda: deuda.tipoDeuda,
      observaciones: deuda.observaciones,
    }));

    // ========================================
    // TRANSFORMAR DEUDAS TRIBUTARIAS A FORMATO CONSOLIDADO
    // ========================================
    const deudasTributariasConsolidadas = deudasTributarias.map((deuda) => ({
      id: deuda.id,
      tipo: 'EGRESO',
      tipoDocumento: 'DEUDA_TRIBUTARIA',
      origen: 'Deuda Tributaria',
      origenId: deuda.id,
      documentoNumero: deuda.numeroDocumento || `DT-${deuda.id}`,
      documentoTipo: deuda.tipoDeuda?.nombre || 'Tributo',
      entidadComercial: {
        id: null,
        razonSocial: 'SUNAT',
        numeroDocumento: '20131312955',
        tipo: 'Entidad Gubernamental',
      },
      empresa: deuda.empresa,
      fechaEmision: deuda.fecha,
      fechaVencimiento: deuda.fechaVencimiento,
      moneda: deuda.moneda,
      montoTotal: deuda.montoOriginal,
      montoPagado: deuda.montoPagado,
      saldoPendiente: deuda.saldoPendiente,
      estado: deuda.estado,
      ultimoPago: deuda.pagos?.[0] || null,
      movimientoCajaId: deuda.pagos?.[0]?.movimientoCajaId || null,
      esDeudaTributaria: true,
      tipoDeuda: deuda.tipoDeuda,
      observaciones: deuda.observaciones,
    }));

    // ========================================
    // COMBINAR Y RETORNAR
    // ========================================
    const pendientes = [
      ...cxcConsolidadas,
      ...cxpConsolidadas,
      ...entregasConsolidadas,
      ...deudasConsolidadas,
      ...deudasTributariasConsolidadas,
    ];
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

    // ========================================
    // CUENTAS POR COBRAR
    // ========================================
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

    // ========================================
    // CUENTAS POR PAGAR
    // ========================================
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

    // ========================================
    // DEUDAS PERSONALES
    // ========================================
    const deudasAgrupadas = await prisma.deudaConPersonal.groupBy({
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

    // ========================================
    // DEUDAS TRIBUTARIAS
    // ========================================
    const deudasTributariasAgrupadas = await prisma.deudaTributaria.groupBy({
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

    // ========================================
    // ASIGNACIONES PENDIENTES (Entregas a Rendir)
    // ========================================
    const asignacionesAgrupadas = await prisma.detMovsEntregaRendir.groupBy({
      by: ['monedaId'],
      where: {
        ...where,
        validadoTesoreria: false,
        operacionMovCajaId: null,
        tipoMovimiento: {
          categoriaId: CATEGORIA_GASTOS_A_RENDIR, // 17
        },
        formaParteCalculoEntregaARendir: true,
        OR: [
          { asignacionOrigenId: null },
          { asignacionOrigenId: 0 },
        ],
      },
      _sum: {
        monto: true,
      },
      _count: {
        id: true,
      },
    });

    // ========================================
    // GASTOS DIRECTOS PENDIENTES
    // ========================================
    const gastosDirectosAgrupados = await prisma.detMovsEntregaRendir.groupBy({
      by: ['monedaId'],
      where: {
        ...where,
        validadoTesoreria: false,
        operacionMovCajaId: null,
        tipoMovimiento: {
          categoriaId: {
            not: CATEGORIA_GASTOS_A_RENDIR, // ≠ 17
          },
        },
        formaParteCalculoEntregaARendir: false,
        OR: [
          { asignacionOrigenId: null },
          { asignacionOrigenId: 0 },
        ],
        entidadComercialId: {
          not: null,
        },
      },
      _sum: {
        monto: true,
      },
      _count: {
        id: true,
      },
    });

    // ========================================
    // VENCIDOS
    // ========================================
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

    // ========================================
    // OBTENER MONEDAS
    // ========================================
    const monedasIds = [
      ...new Set([
        ...cxcAgrupadas.map((g) => g.monedaId),
        ...cxpAgrupadas.map((g) => g.monedaId),
        ...deudasAgrupadas.map((g) => g.monedaId),
        ...deudasTributariasAgrupadas.map((g) => g.monedaId),  // ✅ AGREGAR
        ...asignacionesAgrupadas.map((g) => g.monedaId),
        ...gastosDirectosAgrupados.map((g) => g.monedaId),
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

    // ========================================
    // CONSTRUIR RESUMEN
    // ========================================
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
      asignaciones: asignacionesAgrupadas.map((g) => ({
        moneda: monedas.find((m) => m.id === g.monedaId),
        total: g._sum.monto,
        cantidad: g._count.id,
      })),
      gastosDirectos: gastosDirectosAgrupados.map((g) => ({
        moneda: monedas.find((m) => m.id === g.monedaId),
        total: g._sum.monto,
        cantidad: g._count.id,
      })),
      deudasPersonales: deudasAgrupadas.map((g) => ({
        moneda: monedas.find((m) => m.id === g.monedaId),
        total: g._sum.saldoPendiente,
        cantidad: g._count.id,
      })),
      deudasTributarias: deudasTributariasAgrupadas.map((g) => ({
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