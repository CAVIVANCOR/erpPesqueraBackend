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
import {
  ESTADO_CUOTA_PRESTAMO,
  ESTADOS_CUOTA_PRESTAMO_ABIERTAS,
} from "../../utils/estados.constants.js";
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

// Estados del préstamo (EstadoMultiFuncion) que admiten pago de cuotas: DESEMBOLSADO, VIGENTE y VENCIDO.
// Debe coincidir con operacionPrestamo.service.js
const ESTADOS_PRESTAMO_OPERABLES = [80, 81, 83];

// Estado APROBADO: préstamo aprobado pendiente de desembolso
const ESTADO_PRESTAMO_APROBADO = 79;

// Fecha de corte del saldo inicial: las cuotas con vencimiento anterior se consideran pagadas en el
// año anterior y se marcan con `saldoInicialPagada`. Mismo valor que cuotaPrestamo.service.js
// (marcarComoSaldoInicial) y que el botón "Histórico" de CuotaPrestamoList.
const FECHA_CORTE_SALDO_INICIAL = new Date('2026-01-01');

/**
 * Filtros avanzados de las secciones de préstamos (rango de fechas y de montos), combinados con
 * lo que ya tenga el where (p. ej. el filtro de vencimiento).
 * @param {String} campoFecha - Campo de fecha a filtrar (fechaVencimiento de la cuota / fechaDesembolso)
 * @param {String} campoMonto - Campo de monto a filtrar (montoTotal de la cuota / montoDesembolsado)
 */
const aplicarFiltrosPrestamo = (where, filtros, campoFecha, campoMonto) => {
  if (filtros.fechaDesde || filtros.fechaHasta) {
    const rango = { ...(where[campoFecha] || {}) };
    if (filtros.fechaDesde) {
      const desde = new Date(filtros.fechaDesde);
      desde.setHours(0, 0, 0, 0);
      rango.gte = desde;
    }
    if (filtros.fechaHasta) {
      const hasta = new Date(filtros.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      rango.lte = hasta;
    }
    where[campoFecha] = rango;
  }

  if (filtros.montoDesde !== null || filtros.montoHasta !== null) {
    const rango = {};
    if (filtros.montoDesde !== null) rango.gte = Number(filtros.montoDesde);
    if (filtros.montoHasta !== null) rango.lte = Number(filtros.montoHasta);
    where[campoMonto] = rango;
  }
  return where;
};

/**
 * Filtro de fecha según el botón de vencimiento (VENCIDOS / HOY / SEMANA), igual que el de las
 * demás secciones. Devuelve null si no hay filtro.
 */
const construirFiltroVencimiento = (vencimiento) => {
  if (!vencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (vencimiento === 'VENCIDOS') return { lt: hoy };
  if (vencimiento === 'HOY') {
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    return { gte: hoy, lt: manana };
  }
  if (vencimiento === 'SEMANA') {
    const finSemana = new Date(hoy);
    finSemana.setDate(finSemana.getDate() + 7);
    return { gte: hoy, lt: finSemana };
  }
  return null;
};

/**
 * Impuesto tributario de una cuenta por cobrar / por pagar (columna "Imp. Trib." de Atenciones).
 * Solo uno aplica por documento (nunca se mezclan). Prioridad: Detracción > Retención >
 * Percepción (misma regla que OrdenCompra.jsx).
 *
 * El saldo pendiente del impuesto sale de Detraccion / Retencion / Percepcion .saldoPendiente
 * y coincide con el saldo de la cuenta cuando solo falta pagar el impuesto.
 *
 * @param {Object|null} documento - Documento origen (OrdenCompra en CxP, PreFactura en CxC);
 *        ambos tienen aplicaX, porcentajeX y los registros 1:1 detraccion/retencion/percepcion
 * @param {Object} cuenta - CxP o CxC (tieneX / porcentajeX como respaldo si no hay documento origen)
 * @returns {{tipo: string, porcentaje: *, saldoPendiente: *}|null}
 */
const calcularImpuestoTributario = (documento, cuenta) => {
  if (documento?.aplicaDetraccion || documento?.detraccion || cuenta.tieneDetraccion) {
    return {
      tipo: 'DETRACCION',
      porcentaje: documento?.detraccion?.tasaDetraccion ?? documento?.porcentajeDetraccion ?? cuenta.porcentajeDetraccion ?? null,
      saldoPendiente: documento?.detraccion?.saldoPendiente ?? null,
    };
  }
  if (documento?.aplicaRetencion || documento?.retencion || cuenta.tieneRetencion) {
    return {
      tipo: 'RETENCION',
      porcentaje: documento?.retencion?.tasaRetencion ?? documento?.porcentajeRetencion ?? cuenta.porcentajeRetencion ?? null,
      saldoPendiente: documento?.retencion?.saldoPendiente ?? null,
    };
  }
  if (documento?.aplicaPercepcion || documento?.percepcion || cuenta.tienePercepcion) {
    return {
      tipo: 'PERCEPCION',
      porcentaje: documento?.percepcion?.tasaPercepcion ?? documento?.porcentajePercepcion ?? cuenta.porcentajePercepcion ?? null,
      saldoPendiente: documento?.percepcion?.saldoPendiente ?? null,
    };
  }
  return null;
};
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

/**
 * Aplicar filtros avanzados a deudas (DeudaConPersonal / DeudaTributaria)
 * @param {Object} where - Cláusula WHERE base
 * @param {Object} filtros - Filtros avanzados
 * @param {Boolean} esPersonal - true para DeudaConPersonal (habilita personalIds)
 * @returns {Object} WHERE actualizado
 */
const aplicarFiltrosDeudas = (where, filtros, esPersonal = false) => {
  const w = { ...where };

  // Los nombres de campo difieren entre modelos:
  // DeudaConPersonal: fecha / numeroDocumento
  // DeudaTributaria:  fechaGeneracion / numeroDeclaracion
  const campoFecha = esPersonal ? 'fecha' : 'fechaGeneracion';
  const campoNumero = esPersonal ? 'numeroDocumento' : 'numeroDeclaracion';

  if (filtros.fechaDesde || filtros.fechaHasta) {
    w[campoFecha] = {};
    if (filtros.fechaDesde) {
      const desde = new Date(filtros.fechaDesde);
      desde.setHours(0, 0, 0, 0);
      w[campoFecha].gte = desde;
    }
    if (filtros.fechaHasta) {
      const hasta = new Date(filtros.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      w[campoFecha].lte = hasta;
    }
  }

  if (esPersonal && filtros.personalIds?.length > 0) {
    w.personalId = { in: filtros.personalIds };
  }

  if (filtros.tipoDeudaIds?.length > 0) {
    w.tipoDeudaId = { in: filtros.tipoDeudaIds };
  }

  if (filtros.numeroDocumento && filtros.numeroDocumento.trim() !== '') {
    w[campoNumero] = { contains: filtros.numeroDocumento.trim(), mode: 'insensitive' };
  }

  if (filtros.monedaIds?.length > 0) {
    w.monedaId = { in: filtros.monedaIds };
  }

  if (filtros.estadoIds?.length > 0) {
    w.estadoId = { in: filtros.estadoIds };
  }

  if (filtros.montoDesde != null || filtros.montoHasta != null) {
    w.saldoPendiente = { ...w.saldoPendiente };
    if (filtros.montoDesde != null) w.saldoPendiente.gte = Number(filtros.montoDesde);
    if (filtros.montoHasta != null) w.saldoPendiente.lte = Number(filtros.montoHasta);
  }

  return w;
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
              // Número del comprobante emitido (para la glosa del cobro múltiple)
              numeroDocumentoFinal: true,
              // Neto cobrable del cobro múltiple = saldo - detracción pendiente
              aplicaDetraccion: true,
              detraccion: { select: { tasaDetraccion: true, saldoPendiente: true } },
              // Impuesto tributario (columna "Imp. Trib." de Atenciones)
              porcentajeDetraccion: true,
              aplicaRetencion: true,
              porcentajeRetencion: true,
              aplicaPercepcion: true,
              porcentajePercepcion: true,
              retencion: { select: { tasaRetencion: true, saldoPendiente: true } },
              percepcion: { select: { tasaPercepcion: true, saldoPendiente: true } },
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
              // Para identificar Recibos por Honorarios (glosa propia en el pago múltiple)
              tipoDocumentoFinalId: true,
              // Impuesto tributario del documento (columna "Imp. Trib." de Atenciones):
              // el % sale de la orden / del registro del impuesto y el saldo del registro del impuesto
              aplicaDetraccion: true,
              porcentajeDetraccion: true,
              aplicaRetencion: true,
              porcentajeRetencion: true,
              aplicaPercepcion: true,
              porcentajePercepcion: true,
              detraccion: { select: { tasaDetraccion: true, saldoPendiente: true } },
              retencion: { select: { tasaRetencion: true, saldoPendiente: true } },
              percepcion: { select: { tasaPercepcion: true, saldoPendiente: true } },
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

      if (filtros.entidadComercialIds?.length > 0) {
        whereEntregas.entidadComercialId = { in: filtros.entidadComercialIds };
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
        where: aplicarFiltrosDeudas(whereDeudas, filtros, true),
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
        where: aplicarFiltrosDeudas(whereDeudasTrib, filtros),
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
              // Permite preseleccionar la entidad destino en el pago múltiple
              entidadRecaudadoraId: true,
              entidadRecaudadora: { select: { id: true, razonSocial: true } },
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
    // PRÉSTAMOS: CUOTAS PENDIENTES (si tipoDeuda es 'PRESTAMOS_CUOTAS') → pago de cuotas (EGRESO)
    // ========================================
    // Incluye las cuotas de préstamos de saldo inicial; se excluyen las cuotas ya pagadas y las
    // marcadas como saldo inicial pagado. Una cuota PARCIAL sigue pendiente por su diferencia.
    let cuotasPrestamo = [];
    if (tipoDeuda === TIPO_DEUDA_TESORERIA.PRESTAMOS_CUOTAS) {
      const wherePrestamoCuota = {
        estadoId: filtros.estadoIds?.length > 0
          ? { in: filtros.estadoIds }
          : { in: ESTADOS_PRESTAMO_OPERABLES },
      };
      if (empresaId) wherePrestamoCuota.empresaId = Number(empresaId);
      if (monedaId) wherePrestamoCuota.monedaId = Number(monedaId);
      // Filtro especializado en cascada: banco → tipo de préstamo → préstamo
      if (filtros.bancoIds?.length > 0) wherePrestamoCuota.bancoId = { in: filtros.bancoIds };
      if (filtros.tipoPrestamoIds?.length > 0) wherePrestamoCuota.tipoPrestamoId = { in: filtros.tipoPrestamoIds };
      if (filtros.prestamoIds?.length > 0) wherePrestamoCuota.id = { in: filtros.prestamoIds };

      const whereCuotas = {
        saldoInicialPagada: false,
        estadoCuotaId: { in: ESTADOS_CUOTA_PRESTAMO_ABIERTAS },
        prestamo: wherePrestamoCuota,
      };
      const filtroFechaVencimiento = construirFiltroVencimiento(vencimiento);
      if (filtroFechaVencimiento) whereCuotas.fechaVencimiento = filtroFechaVencimiento;

      cuotasPrestamo = await prisma.cuotaPrestamo.findMany({
        where: aplicarFiltrosPrestamo(whereCuotas, filtros, 'fechaVencimiento', 'montoTotal'),
        include: {
          prestamo: {
            include: {
              empresa: { select: { id: true, razonSocial: true, ruc: true } },
              banco: { select: { id: true, nombre: true } },
              moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
              tipoPrestamo: { select: { id: true, descripcion: true, esFactoring: true } },
            },
          },
        },
        orderBy: { fechaVencimiento: 'asc' },
      });
    }

    // ========================================
    // PRÉSTAMOS: DESEMBOLSOS PENDIENTES (si tipoDeuda es 'PRESTAMOS_DESEMBOLSOS') → ingreso
    // ========================================
    // Préstamos nuevos (no saldo inicial) cuyo dinero aún no se registró en caja. Se excluyen los
    // que ya tienen asientos (flujo anterior) para no duplicar la contabilidad.
    let desembolsosPrestamo = [];
    if (tipoDeuda === TIPO_DEUDA_TESORERIA.PRESTAMOS_DESEMBOLSOS) {
      const whereDesembolsos = {
        esSaldoInicial: false,
        movimientoCajaDesembolsoId: null,
        estadoId: filtros.estadoIds?.length > 0
          ? { in: filtros.estadoIds }
          : ESTADO_PRESTAMO_APROBADO,
        asientosContables: { none: {} },
      };
      if (empresaId) whereDesembolsos.empresaId = Number(empresaId);
      if (monedaId) whereDesembolsos.monedaId = Number(monedaId);
      // Filtro especializado en cascada: banco → tipo de préstamo → préstamo
      if (filtros.bancoIds?.length > 0) whereDesembolsos.bancoId = { in: filtros.bancoIds };
      if (filtros.tipoPrestamoIds?.length > 0) whereDesembolsos.tipoPrestamoId = { in: filtros.tipoPrestamoIds };
      if (filtros.prestamoIds?.length > 0) whereDesembolsos.id = { in: filtros.prestamoIds };
      // El "vencimiento" de un desembolso es su fecha prevista de desembolso
      const filtroFechaDesembolso = construirFiltroVencimiento(vencimiento);
      if (filtroFechaDesembolso) whereDesembolsos.fechaDesembolso = filtroFechaDesembolso;

      desembolsosPrestamo = await prisma.prestamoBancario.findMany({
        where: aplicarFiltrosPrestamo(whereDesembolsos, filtros, 'fechaDesembolso', 'montoDesembolsado'),
        include: {
          empresa: { select: { id: true, razonSocial: true, ruc: true } },
          banco: { select: { id: true, nombre: true } },
          moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
          estado: { select: { id: true, descripcion: true, severityColor: true } },
          tipoPrestamo: { select: { id: true, descripcion: true, esFactoring: true } },
        },
        orderBy: { fechaDesembolso: 'asc' },
      });
    }

    // ========================================
    // TRANSFORMAR CxC A FORMATO CONSOLIDADO
    // ========================================
    // Concepto de las ventas para la glosa "Cobro de fact. {NumDoc} por venta de {Concepto}" del
    // cobro múltiple: productos / servicios únicos del detalle de la pre-factura
    const preFacturasCxC = cuentasPorCobrar.map((c) => c.preFactura?.id).filter(Boolean);
    const conceptoPorPreFactura = new Map();
    if (preFacturasCxC.length > 0) {
      const detallesVenta = await prisma.detallePreFactura.findMany({
        where: { preFacturaId: { in: preFacturasCxC } },
        select: {
          preFacturaId: true,
          producto: { select: { descripcionArmada: true } },
        },
        orderBy: { id: 'asc' },
      });
      for (const d of detallesVenta) {
        const texto = (d.producto?.descripcionArmada || '').trim();
        if (!texto) continue;
        const clave = String(d.preFacturaId);
        if (!conceptoPorPreFactura.has(clave)) conceptoPorPreFactura.set(clave, new Set());
        conceptoPorPreFactura.get(clave).add(texto);
      }
    }

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
      // Datos para el cobro múltiple (selección de facturas de un cliente)
      esCuentaPorCobrar: true,
      esGerencial: cxc.esGerencial,
      detraccionPendiente:
        cxc.preFactura?.aplicaDetraccion && cxc.preFactura.detraccion
          ? cxc.preFactura.detraccion.saldoPendiente
          : 0,
      impuestoTributario: calcularImpuestoTributario(cxc.preFactura, cxc),
      numeroDocumentoFinal: cxc.preFactura?.numeroDocumentoFinal || null,
      concepto: conceptoPorPreFactura.has(String(cxc.preFactura?.id))
        ? [...conceptoPorPreFactura.get(String(cxc.preFactura?.id))].join(' / ')
        : null,
    }));

    // ========================================
    // TRANSFORMAR CxP A FORMATO CONSOLIDADO
    // ========================================
    // Concepto de las compras gerenciales para la glosa "GASTOS VARIOS - {Concepto}" del pago múltiple:
    // descripciones únicas del detalle de la orden de compra. Solo se consulta para las gerenciales.
    const ordenesGerenciales = cuentasPorPagar
      .filter((c) => c.esGerencial && c.ordenCompraId)
      .map((c) => c.ordenCompraId);
    const conceptoPorOrden = new Map();
    if (ordenesGerenciales.length > 0) {
      const detallesGerenciales = await prisma.detalleOrdenCompra.findMany({
        where: { ordenCompraId: { in: ordenesGerenciales } },
        select: {
          ordenCompraId: true,
          producto: { select: { descripcionArmada: true } },
        },
        orderBy: { id: 'asc' },
      });
      for (const d of detallesGerenciales) {
        const texto = (d.producto?.descripcionArmada || '').trim();
        if (!texto) continue;
        const clave = String(d.ordenCompraId);
        if (!conceptoPorOrden.has(clave)) conceptoPorOrden.set(clave, new Set());
        conceptoPorOrden.get(clave).add(texto);
      }
    }

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
      impuestoTributario: calcularImpuestoTributario(cxp.ordenCompra, cxp),
      // Datos para el pago múltiple (selección de facturas de un proveedor)
      esCuentaPorPagar: true,
      esGerencial: cxp.esGerencial,
      // OrdenCompra.tipoDocumentoFinalId = 3 → Recibo por Honorarios
      esHonorarios: Number(cxp.ordenCompra?.tipoDocumentoFinalId) === 3,
      concepto: conceptoPorOrden.has(String(cxp.ordenCompraId))
        ? [...conceptoPorOrden.get(String(cxp.ordenCompraId))].join(' / ')
        : null,
      detraccionPendiente:
        cxp.ordenCompra?.aplicaDetraccion && cxp.ordenCompra.detraccion
          ? cxp.ordenCompra.detraccion.saldoPendiente
          : 0,
    }));


    // ========================================
    // TRANSFORMAR ENTREGAS A RENDIR A FORMATO CONSOLIDADO
    // ========================================
    const entregasConsolidadas = entregasARendir.map((entrega) => {
      // Determinar si es Asignación o Gasto Directo
      const esAsignacion =
        Number(entrega.tipoMovimiento?.categoriaId) === CATEGORIA_GASTOS_A_RENDIR &&
        entrega.formaParteCalculoEntregaARendir === true &&
        (entrega.asignacionOrigenId === null || Number(entrega.asignacionOrigenId) === 0);

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
        moduloOrigenId: entrega.moduloOrigenId,
        documentoOrigenId: entrega.documentoOrigenId,
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
        // Permite preseleccionar la entidad destino en el pago múltiple
        enlaceEntidadComercialId: deuda.personal?.enlaceEntidadComercialId,
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
      documentoNumero: deuda.numeroDeclaracion || `DT-${deuda.id}`,
      documentoTipo: deuda.tipoDeuda?.nombre || 'Tributo',
      entidadComercial: {
        id: null,
        razonSocial: 'SUNAT',
        numeroDocumento: '20131312955',
        tipo: 'Entidad Gubernamental',
      },
      empresa: deuda.empresa,
      fechaEmision: deuda.fechaGeneracion,
      fechaVencimiento: deuda.fechaVencimiento,
      moneda: deuda.moneda,
      montoTotal: deuda.montoOriginal,
      montoPagado: deuda.montoPagado,
      saldoPendiente: deuda.saldoPendiente,
      estado: deuda.estado,
      ultimoPago: deuda.pagos?.[0] || null,
      movimientoCajaId: deuda.pagos?.[0]?.movimientoCajaId || null,
      esDeudaTributaria: true,
      esSaldoInicial: deuda.esSaldoInicial,
      periodo: deuda.periodo,
      numeroDeclaracion: deuda.numeroDeclaracion,
      tipoDeuda: deuda.tipoDeuda,
      observaciones: deuda.observaciones,
    }));

    // ========================================
    // TRANSFORMAR CUOTAS DE PRÉSTAMO A FORMATO CONSOLIDADO (pago de cuotas · EGRESO)
    // ========================================
    // Los ids llevan prefijo porque el id de una cuota y el de un préstamo pueden coincidir.
    // saldoPendiente = lo que falta de la cuota (montoTotal - montoPagado acumulado).
    // Nombre y color del estado de la cuota desde el catálogo (no se listan SALDO INICIAL ni PAGADO)
    const estadosCuotaCatalogo = cuotasPrestamo.length
      ? await prisma.estadoMultiFuncion.findMany({
          where: { id: { in: Object.values(ESTADO_CUOTA_PRESTAMO) } },
          select: { id: true, descripcion: true, severityColor: true },
        })
      : [];
    const estadoCuotaPorId = new Map(estadosCuotaCatalogo.map((e) => [Number(e.id), e]));

    const cuotasPrestamoConsolidadas = cuotasPrestamo.map((cuota) => {
      const prestamo = cuota.prestamo;
      const montoPagado = Number(cuota.montoPagado || 0);
      const saldoPendiente = Math.round((Number(cuota.montoTotal) - montoPagado) * 100) / 100;
      return {
        id: `cuota-${cuota.id}`,
        tipo: 'EGRESO',
        tipoDocumento: 'CUOTA_PRESTAMO',
        origen: 'Préstamo - Cuota',
        origenId: cuota.id,
        documentoNumero: `${prestamo.numeroPrestamo} - Cuota ${cuota.numeroCuota}/${prestamo.numeroCuotas}`,
        documentoTipo: 'Cuota de Préstamo',
        entidadComercial: {
          id: prestamo.banco?.id,
          razonSocial: prestamo.banco?.nombre || 'N/A',
          numeroDocumento: null,
          tipo: 'Banco',
        },
        empresa: prestamo.empresa,
        fechaEmision: prestamo.fechaDesembolso,
        fechaVencimiento: cuota.fechaVencimiento,
        moneda: prestamo.moneda,
        montoTotal: cuota.montoTotal,
        montoPagado,
        saldoPendiente,
        estado: estadoCuotaPorId.get(Number(cuota.estadoCuotaId)) || {
          id: null,
          descripcion: 'SIN ESTADO',
          severityColor: 'secondary',
        },
        ultimoPago: null,
        movimientoCajaId: null,
        esCuotaPrestamo: true,
        // Vence antes del corte pero NO está marcada como saldo inicial: si ya se pagó el año
        // anterior hay que marcarla como histórica en el cronograma antes de pagarla aquí
        vencidaAntesDelCorte: new Date(cuota.fechaVencimiento) < FECHA_CORTE_SALDO_INICIAL,
        esGerencial: false,
        esSaldoInicial: prestamo.esSaldoInicial,
        // Datos para el formulario de pago (mora sugerida, cuenta propuesta y componentes de la cuota)
        prestamo: {
          id: prestamo.id,
          numeroPrestamo: prestamo.numeroPrestamo,
          numeroCuotas: prestamo.numeroCuotas,
          tasaMoratoria: prestamo.tasaMoratoria,
          cuentaCorrienteId: prestamo.cuentaCorrienteId,
          esFactoring: Boolean(prestamo.tipoPrestamo?.esFactoring),
          tipoPrestamo: prestamo.tipoPrestamo?.descripcion || null,
          // Ids para armar y aplicar el filtro especializado (banco, tipo de préstamo y préstamo)
          bancoId: prestamo.bancoId,
          tipoPrestamoId: prestamo.tipoPrestamoId,
        },
        cuota: {
          id: cuota.id,
          numeroCuota: cuota.numeroCuota,
          montoCapital: cuota.montoCapital,
          montoInteres: cuota.montoInteres,
          montoComision: cuota.montoComision,
          montoSeguro: cuota.montoSeguro,
          montoMora: cuota.montoMora,
          estadoCuotaId: cuota.estadoCuotaId,
        },
      };
    });

    // ========================================
    // TRANSFORMAR DESEMBOLSOS DE PRÉSTAMO A FORMATO CONSOLIDADO (desembolso · INGRESO)
    // ========================================
    const desembolsosPrestamoConsolidados = desembolsosPrestamo.map((prestamo) => ({
      id: `desembolso-${prestamo.id}`,
      tipo: 'INGRESO',
      tipoDocumento: 'DESEMBOLSO_PRESTAMO',
      origen: 'Préstamo - Desembolso',
      origenId: prestamo.id,
      documentoNumero: `${prestamo.numeroPrestamo} - Desembolso`,
      documentoTipo: 'Desembolso de Préstamo',
      entidadComercial: {
        id: prestamo.banco?.id,
        razonSocial: prestamo.banco?.nombre || 'N/A',
        numeroDocumento: null,
        tipo: 'Banco',
      },
      empresa: prestamo.empresa,
      fechaEmision: prestamo.fechaContrato,
      // Fecha prevista del desembolso
      fechaVencimiento: prestamo.fechaDesembolso,
      moneda: prestamo.moneda,
      montoTotal: prestamo.montoDesembolsado,
      montoPagado: 0,
      saldoPendiente: prestamo.montoDesembolsado,
      estado: prestamo.estado,
      ultimoPago: null,
      movimientoCajaId: null,
      esDesembolsoPrestamo: true,
      esGerencial: false,
      esSaldoInicial: false,
      // Datos para el formulario de desembolso (cuenta propuesta y comisión inicial sugerida)
      prestamo: {
        id: prestamo.id,
        numeroPrestamo: prestamo.numeroPrestamo,
        cuentaCorrienteId: prestamo.cuentaCorrienteId,
        comisionInicial: prestamo.comisionInicial,
        esFactoring: Boolean(prestamo.tipoPrestamo?.esFactoring),
        tipoPrestamo: prestamo.tipoPrestamo?.descripcion || null,
        bancoId: prestamo.bancoId,
        tipoPrestamoId: prestamo.tipoPrestamoId,
      },
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
      ...cuotasPrestamoConsolidadas,
      ...desembolsosPrestamoConsolidados,
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
    // PRÉSTAMOS: CUOTAS PENDIENTES Y DESEMBOLSOS PENDIENTES
    // ========================================
    // La moneda de la cuota está en su préstamo, por eso se agrupa en memoria (no se puede
    // agrupar por una relación con groupBy). Mismos filtros que el listado.
    const cuotasPrestamoResumen = await prisma.cuotaPrestamo.findMany({
      where: {
        saldoInicialPagada: false,
        estadoCuotaId: { in: ESTADOS_CUOTA_PRESTAMO_ABIERTAS },
        prestamo: { ...where, estadoId: { in: ESTADOS_PRESTAMO_OPERABLES } },
      },
      select: {
        montoTotal: true,
        montoPagado: true,
        prestamo: { select: { monedaId: true } },
      },
    });
    const prestamosCuotasPorMoneda = new Map();
    for (const c of cuotasPrestamoResumen) {
      const clave = String(c.prestamo.monedaId);
      const acumulado = prestamosCuotasPorMoneda.get(clave) || { monedaId: c.prestamo.monedaId, total: 0, cantidad: 0 };
      acumulado.total += Number(c.montoTotal) - Number(c.montoPagado || 0);
      acumulado.cantidad += 1;
      prestamosCuotasPorMoneda.set(clave, acumulado);
    }
    const prestamosCuotasAgrupadas = [...prestamosCuotasPorMoneda.values()].map((g) => ({
      ...g,
      total: Math.round(g.total * 100) / 100,
    }));

    const prestamosDesembolsosAgrupados = await prisma.prestamoBancario.groupBy({
      by: ['monedaId'],
      where: {
        ...where,
        esSaldoInicial: false,
        movimientoCajaDesembolsoId: null,
        estadoId: ESTADO_PRESTAMO_APROBADO,
        asientosContables: { none: {} },
      },
      _sum: { montoDesembolsado: true },
      _count: { id: true },
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
        ...prestamosCuotasAgrupadas.map((g) => g.monedaId),
        ...prestamosDesembolsosAgrupados.map((g) => g.monedaId),
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
      prestamosCuotas: prestamosCuotasAgrupadas.map((g) => ({
        moneda: monedas.find((m) => m.id === g.monedaId),
        total: g.total,
        cantidad: g.cantidad,
      })),
      prestamosDesembolsos: prestamosDesembolsosAgrupados.map((g) => ({
        moneda: monedas.find((m) => m.id === g.monedaId),
        total: g._sum.montoDesembolsado,
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