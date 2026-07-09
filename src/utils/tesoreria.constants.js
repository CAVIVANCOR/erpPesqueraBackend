/**
 * ════════════════════════════════════════════════════════════════════════════
 * CONSTANTES GLOBALES - MÓDULO TESORERÍA
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * IMPORTANTE: Este archivo es la ÚNICA FUENTE DE VERDAD para todas las constantes
 * relacionadas con el módulo de Tesorería. Debe mantenerse IDÉNTICO en:
 * - Frontend: src/constants/tesoreria.constants.js
 * - Backend:  src/constants/tesoreria.constants.js
 * 
 * PROHIBIDO: Hardcodear estos valores en cualquier otro archivo.
 * OBLIGATORIO: Importar siempre desde este archivo.
 * 
 * Última actualización: 2026-06-28
 * ════════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════════
// FILTROS DE TIPO - TESORERÍA PENDIENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * TIPO_FILTRO_TESORERIA
 * 
 * Define los tipos principales de documentos que se pueden filtrar en Tesorería Pendientes.
 * 
 * BACKEND: Se usa en pendientes.service.js para determinar qué consultas ejecutar
 * FRONTEND: Se usa en PendientesHeader.jsx para los botones de filtro
 * 
 * LÓGICA:
 * - TODOS (null): Consulta CxC + CxP + Asignaciones + Gastos Directos + Deudas
 * - COBRAR: Consulta solo CuentasPorCobrar
 * - PAGAR: Consulta solo CuentasPorPagar
 * - ASIGNACIONES: Consulta solo Entregas a Rendir (asignaciones a personal)
 * - GASTOS_DIRECTOS: Consulta solo Gastos Directos (entregas con entidad comercial)
 */
export const TIPO_FILTRO_TESORERIA = {
  TODOS: null,
  COBRAR: 'COBRAR',
  PAGAR: 'PAGAR',
  ASIGNACIONES: 'ASIGNACIONES',
  GASTOS_DIRECTOS: 'GASTOS_DIRECTOS',
};

// ════════════════════════════════════════════════════════════════════════════
// FILTROS DE DEUDA - TESORERÍA PENDIENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * TIPO_DEUDA_TESORERIA
 * 
 * Define los tipos específicos de deudas que se pueden filtrar.
 * Este filtro es INDEPENDIENTE de TIPO_FILTRO_TESORERIA.
 * 
 * BACKEND: Se usa en pendientes.service.js para consultar DeudaConPersonal o DeudaTributaria
 * FRONTEND: Se usa en PendientesHeader.jsx para los botones de deudas
 * 
 * LÓGICA:
 * - NINGUNO (null): No aplica filtro de deudas
 * - DEUDAS_PERSONAL: Consulta solo tabla DeudaConPersonal
 * - DEUDAS_TRIBUTARIAS: Consulta solo tabla DeudaTributaria
 */
export const TIPO_DEUDA_TESORERIA = {
  NINGUNO: null,
  DEUDAS_PERSONAL: 'DEUDAS_PERSONAL',
  DEUDAS_TRIBUTARIAS: 'DEUDAS_TRIBUTARIAS',
};

// ════════════════════════════════════════════════════════════════════════════
// FILTROS DE VENCIMIENTO - TESORERÍA PENDIENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * TIPO_VENCIMIENTO_TESORERIA
 * 
 * Define los filtros de fecha de vencimiento para documentos pendientes.
 * 
 * BACKEND: Se usa en pendientes.service.js para filtrar por fechaVencimiento
 * FRONTEND: Se usa en PendientesHeader.jsx para los botones de vencimiento
 * 
 * LÓGICA:
 * - TODOS (null): Sin filtro de fecha
 * - VENCIDOS: fechaVencimiento < HOY
 * - HOY: fechaVencimiento = HOY
 * - SEMANA: fechaVencimiento entre HOY y HOY+7días
 */
export const TIPO_VENCIMIENTO_TESORERIA = {
  TODOS: null,
  VENCIDOS: 'VENCIDOS',
  HOY: 'HOY',
  SEMANA: 'SEMANA',
};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DE ENTREGA - TESORERÍA PENDIENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * TIPO_ENTREGA_TESORERIA
 * 
 * Define los tipos de entregas a rendir que se muestran en Tesorería Pendientes.
 * Estos son filtros visuales en el header, NO se envían al backend como parámetros.
 * 
 * BACKEND: Se usa en pendientes.service.js para clasificar entregas en la transformación
 * FRONTEND: Se usa en PendientesHeader.jsx para los botones de entregas (solo visuales)
 * 
 * LÓGICA DE CLASIFICACIÓN (en backend):
 * - ASIGNACIONES: formaParteCalculoEntregaARendir=true Y entidadComercialId=null
 * - GASTOS_DIRECTOS: Entregas con entidadComercialId (gastos directos a proveedores)
 * 
 * NOTA: Estos botones en el frontend son informativos, NO filtran datos.
 */
export const TIPO_ENTREGA_TESORERIA = {
  ASIGNACIONES: 'ASIGNACIONES',
  GASTOS_DIRECTOS: 'GASTOS_DIRECTOS',
};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DE OPERACIÓN - TESORERÍA
// ════════════════════════════════════════════════════════════════════════════

/**
 * TIPO_OPERACION_TESORERIA
 * 
 * Define las operaciones especiales que se pueden realizar desde Tesorería.
 * NOTA: Estos NO son filtros, son acciones que abren diálogos específicos.
 * 
 * BACKEND: No se usan como filtros, pero pueden usarse en servicios específicos
 * FRONTEND: Se usan en PendientesHeader.jsx y TesoreriaPendientes.jsx para abrir diálogos
 * 
 * OPERACIONES:
 * - TRANSFERENCIA_INTERNA: Mover dinero entre cuentas propias
 * - PAGO_PROVEEDOR: Pagar a cuenta externa de proveedor
 * - RETIRO_DINERO: Retirar efectivo de cuenta
 * - INGRESO_DINERO: Depositar efectivo en cuenta
 * - GASTO_URGENTE: Crear provisión y pago en una sola operación
 */
export const TIPO_OPERACION_TESORERIA = {
  TRANSFERENCIA_INTERNA: 'TRANSFERENCIA_INTERNA',
  PAGO_PROVEEDOR: 'PAGO_PROVEEDOR',
  RETIRO_DINERO: 'RETIRO_DINERO',
  INGRESO_DINERO: 'INGRESO_DINERO',
  GASTO_URGENTE: 'GASTO_URGENTE',
};



// ════════════════════════════════════════════════════════════════════════════
// TIPOS DE OPERACIÓN ESPECIALIZADA - OPERACIONES DE CAJA
// ════════════════════════════════════════════════════════════════════════════

/**
 * TIPO_OPERACION_CAJA
 * 
 * Define todos los tipos de operaciones especializadas que generan MovimientosCaja
 * con trazabilidad completa mediante correlativoOperacionCaja.
 * 
 * BACKEND: Se usa en servicios especializados para identificar el tipo de operación
 * FRONTEND: Se usa en diálogos para construir el objeto OperacionEspecializadaCaja
 * 
 * CATEGORÍAS:
 * - ATENCIONES: Operaciones que atienden documentos pendientes
 * - OPERACIONES: Operaciones directas de caja sin documento previo
 */
export const TIPO_OPERACION_CAJA = {
  // ═══════════════════════════════════════════════════════════
  // ATENCIONES (8 tipos)
  // ═══════════════════════════════════════════════════════════
  PAGO_CXC: 'PAGO_CXC',
  PAGO_CXP: 'PAGO_CXP',
  PAGO_DEUDA_PERSONAL: 'PAGO_DEUDA_PERSONAL',
  PAGO_DEUDA_TRIBUTARIA: 'PAGO_DEUDA_TRIBUTARIA',
  VALIDAR_ASIGNACION: 'VALIDAR_ASIGNACION',
  VALIDAR_GASTO_DIRECTO: 'VALIDAR_GASTO_DIRECTO',
  DESEMBOLSO_PRESTAMO: 'DESEMBOLSO_PRESTAMO',
  PAGO_CUOTA_PRESTAMO: 'PAGO_CUOTA_PRESTAMO',
  
  // ═══════════════════════════════════════════════════════════
  // OPERACIONES (5 tipos)
  // ═══════════════════════════════════════════════════════════
  TRANSFERENCIA_INTERNA: 'TRANSFERENCIA_INTERNA',
  PAGO_PROVEEDOR_DIRECTO: 'PAGO_PROVEEDOR_DIRECTO',
  RETIRO_DINERO: 'RETIRO_DINERO',
  INGRESO_DINERO: 'INGRESO_DINERO',
  PAGO_URGENTE: 'PAGO_URGENTE',
};

// ════════════════════════════════════════════════════════════════════════════
// PORCENTAJES TRIBUTARIOS - SUNAT PERÚ
// ════════════════════════════════════════════════════════════════════════════

/**
 * PORCENTAJES_SUNAT
 * 
 * Porcentajes estándar de SUNAT para cálculos tributarios.
 * Estos son valores por defecto, la empresa puede tener valores personalizados.
 */
export const PORCENTAJES_SUNAT = {
  ITF: 0.005,
  DETRACCION_GENERAL: 4.00,
  DETRACCION_TRANSPORTE: 4.00,
  DETRACCION_ALQUILER: 10.00,
  RETENCION_GENERAL: 3.00,
  PERCEPCION_VENTA_INTERNA: 2.00,
  PERCEPCION_IMPORTACION: 1.00,
  PERCEPCION_COMBUSTIBLE: 0.50,
};

/**
 * MONTOS_MINIMOS_SUNAT
 * 
 * Montos mínimos para aplicar conceptos tributarios según SUNAT.
 */
export const MONTOS_MINIMOS_SUNAT = {
  DETRACCION: 700.00,
  RETENCION: 700.00,
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CÁLCULO COMPARTIDAS (Frontend y Backend)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calcula el monto de ITF
 */
export const calcularITF = (monto) => {
  return Number((monto * PORCENTAJES_SUNAT.ITF / 100).toFixed(2));
};

/**
 * Calcula el monto de detracción
 */
export const calcularDetraccion = (monto, porcentaje = PORCENTAJES_SUNAT.DETRACCION_GENERAL) => {
  return Number((monto * porcentaje / 100).toFixed(2));
};

/**
 * Calcula el monto de retención
 */
export const calcularRetencion = (monto, porcentaje = PORCENTAJES_SUNAT.RETENCION_GENERAL) => {
  return Number((monto * porcentaje / 100).toFixed(2));
};

/**
 * Calcula el monto de percepción
 */
export const calcularPercepcion = (monto, porcentaje = PORCENTAJES_SUNAT.PERCEPCION_VENTA_INTERNA) => {
  return Number((monto * porcentaje / 100).toFixed(2));
};

/**
 * Valida si se debe aplicar detracción según monto mínimo
 */
export const debeAplicarDetraccion = (monto, montoMinimo = MONTOS_MINIMOS_SUNAT.DETRACCION) => {
  return monto >= montoMinimo;
};

/**
 * Valida si se debe aplicar retención según monto mínimo
 */
export const debeAplicarRetencion = (monto, montoMinimo = MONTOS_MINIMOS_SUNAT.RETENCION) => {
  return monto >= montoMinimo;
};

// ════════════════════════════════════════════════════════════════════════════
// ESTRUCTURA DE OPERACIÓN ESPECIALIZADA DE CAJA
// ════════════════════════════════════════════════════════════════════════════

/**
 * crearOperacionEspecializadaCaja
 * 
 * Factory function para crear el objeto de operación especializada.
 * Garantiza que la estructura sea consistente en frontend y backend.
 * 
 * @param {Object} params - Parámetros de la operación
 * @returns {Object} - Objeto OperacionEspecializadaCaja
 */
export const crearOperacionEspecializadaCaja = (params = {}) => {
  return {
    // ════════════════════════════════════════════════════════
    // 1. METADATOS DE LA OPERACIÓN
    // ════════════════════════════════════════════════════════
    metadata: {
      tipoOperacion: params.tipoOperacion || null,
      empresaId: params.empresaId || null,
      usuarioId: params.usuarioId || null,
      fechaOperacion: params.fechaOperacion || new Date(),
      correlativoOperacion: params.correlativoOperacion || null,
      moduloOrigenId: params.moduloOrigenId || null,
      centroCostoId: params.centroCostoId || null,
      observaciones: params.observaciones || null,
    },

    // ════════════════════════════════════════════════════════
    // 2. CUENTAS INVOLUCRADAS
    // ════════════════════════════════════════════════════════
    cuentas: {
      cuentaOrigenId: params.cuentaOrigenId || null,
      cuentaDestinoId: params.cuentaDestinoId || null,
      cuentaSunatId: params.cuentaSunatId || null,
      bancoOrigenId: params.bancoOrigenId || null,
      entidadComercialId: params.entidadComercialId || null,
    },

    // ════════════════════════════════════════════════════════
    // 3. MONTOS Y MONEDA
    // ════════════════════════════════════════════════════════
    montos: {
      montoPrincipal: params.montoPrincipal || 0,
      monedaId: params.monedaId || null,
      tipoCambio: params.tipoCambio || 1.0000,
      
      detraccion: params.detraccion || {
        aplica: false,
        porcentaje: 0,
        monto: 0,
        numeroComprobante: null,
        fechaComprobante: null,
      },
      
      retencion: params.retencion || {
        aplica: false,
        porcentaje: 0,
        monto: 0,
        numeroComprobante: null,
        fechaComprobante: null,
      },
      
      percepcion: params.percepcion || {
        aplica: false,
        porcentaje: 0,
        monto: 0,
        numeroComprobante: null,
        fechaComprobante: null,
      },
      
      itf: params.itf || {
        aplica: false,
        porcentaje: PORCENTAJES_SUNAT.ITF,
        monto: 0,
      },
      
      comision: params.comision || {
        aplica: false,
        monto: 0,
      },
    },

    // ════════════════════════════════════════════════════════
    // 4. MEDIO DE PAGO
    // ════════════════════════════════════════════════════════
    medioPago: {
      medioPagoId: params.medioPagoId || null,
      numeroOperacion: params.numeroOperacion || null,
      numeroCheque: params.numeroCheque || null,
      fechaCheque: params.fechaCheque || null,
    },

    // ════════════════════════════════════════════════════════
    // 5. DATOS ESPECÍFICOS DE LA OPERACIÓN
    // ════════════════════════════════════════════════════════
    datosEspecificos: {
      cuentaPorCobrarId: params.cuentaPorCobrarId || null,
      cuentaPorPagarId: params.cuentaPorPagarId || null,
      deudaConPersonalId: params.deudaConPersonalId || null,
      deudaTributariaId: params.deudaTributariaId || null,
      cuotaPrestamoId: params.cuotaPrestamoId || null,
      detMovsEntregaRendirIds: params.detMovsEntregaRendirIds || [],
      prestamoBancarioId: params.prestamoBancarioId || null,
      numeroConstanciaSunat: params.numeroConstanciaSunat || null,
      montoAplicadoDeuda: params.montoAplicadoDeuda || 0,
      esTransferencia: params.esTransferencia || false,
      movimientoRelacionadoId: params.movimientoRelacionadoId || null,
    },

    // ════════════════════════════════════════════════════════
    // 6. MOVIMIENTOS PREVIEW
    // ════════════════════════════════════════════════════════
    movimientosPreview: params.movimientosPreview || [],
  };
};

/**
 * crearMovimientoPreview
 * 
 * Factory function para crear un movimiento preview.
 * 
 * @param {Object} params - Parámetros del movimiento
 * @returns {Object} - Objeto MovimientoCajaPreview
 */
export const crearMovimientoPreview = (params = {}) => {
  return {
    orden: params.orden || 1,
    tipo: params.tipo || 'INGRESO',
    concepto: params.concepto || '',
    cuentaCorrienteId: params.cuentaCorrienteId || null,
    monto: params.monto || 0,
    monedaId: params.monedaId || null,
    tipoMovimientoId: params.tipoMovimientoId || null,
    entidadComercialId: params.entidadComercialId || null,
    productoId: params.productoId || null,
  };
};

/**
 * validarOperacionEspecializada
 * 
 * Valida que una operación especializada tenga todos los campos requeridos.
 * Se usa tanto en frontend (antes de enviar) como en backend (antes de procesar).
 * 
 * @param {Object} operacion - Objeto OperacionEspecializadaCaja
 * @returns {Object} - { valido: boolean, errores: string[] }
 */
export const validarOperacionEspecializada = (operacion) => {
  const errores = [];

  // Validar metadata
  if (!operacion.metadata.tipoOperacion) {
    errores.push('Tipo de operación es requerido');
  }
  if (!operacion.metadata.empresaId) {
    errores.push('Empresa es requerida');
  }
  if (!operacion.metadata.usuarioId) {
    errores.push('Usuario es requerido');
  }
  if (!operacion.metadata.fechaOperacion) {
    errores.push('Fecha de operación es requerida');
  }

  // Validar montos
  if (!operacion.montos.montoPrincipal || operacion.montos.montoPrincipal <= 0) {
    errores.push('Monto principal debe ser mayor a cero');
  }
  if (!operacion.montos.monedaId) {
    errores.push('Moneda es requerida');
  }

  // Validar medio de pago
  if (!operacion.medioPago.medioPagoId) {
    errores.push('Medio de pago es requerido');
  }

  // Validar movimientos preview
  if (!operacion.movimientosPreview || operacion.movimientosPreview.length === 0) {
    errores.push('Debe haber al menos un movimiento a crear');
  }

  return {
    valido: errores.length === 0,
    errores,
  };
};

/**
 * calcularResumenFinanciero
 * 
 * Calcula el resumen financiero de una operación.
 * Útil para mostrar en el preview antes de guardar.
 * 
 * @param {Object} operacion - Objeto OperacionEspecializadaCaja
 * @returns {Object} - Resumen financiero
 */
export const calcularResumenFinanciero = (operacion) => {
  const { montos } = operacion;
  
  const totalIngresos = operacion.movimientosPreview
    .filter(m => m.tipo === 'INGRESO')
    .reduce((sum, m) => sum + m.monto, 0);
  
  const totalEgresos = operacion.movimientosPreview
    .filter(m => m.tipo === 'EGRESO')
    .reduce((sum, m) => sum + m.monto, 0);
  
  return {
    montoPrincipal: montos.montoPrincipal,
    montoDetraccion: montos.detraccion.aplica ? montos.detraccion.monto : 0,
    montoRetencion: montos.retencion.aplica ? montos.retencion.monto : 0,
    montoPercepcion: montos.percepcion.aplica ? montos.percepcion.monto : 0,
    montoITF: montos.itf.aplica ? montos.itf.monto : 0,
    montoComision: montos.comision.aplica ? montos.comision.monto : 0,
    totalIngresos,
    totalEgresos,
    movimientoNeto: totalIngresos - totalEgresos,
  };
};




// ════════════════════════════════════════════════════════════════════════════
// ORIGEN DE DOCUMENTOS - TESORERÍA PENDIENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * ORIGEN_DOCUMENTO_TESORERIA
 * 
 * Define los posibles orígenes de documentos en la vista de Tesorería Pendientes.
 * Estos valores son GENERADOS por el backend y CONSUMIDOS por el frontend.
 * 
 * BACKEND: Se asignan en pendientes.service.js al transformar los datos
 * FRONTEND: Se usan en PendientesTable.jsx para determinar qué botón mostrar
 * 
 * IMPORTANTE: Estos strings deben coincidir EXACTAMENTE entre backend y frontend.
 * 
 * ORÍGENES:
 * - CUENTAS_POR_COBRAR: Facturas/Boletas pendientes de cobro
 * - CUENTAS_POR_PAGAR: Facturas de proveedores pendientes de pago
 * - ASIGNACION_RENDIR: Entregas de fondos a responsables (sin entidad comercial)
 * - GASTO_DIRECTO: Gastos directos con entidad comercial
 * - DEUDA_PERSONAL: Deudas con personal (préstamos, adelantos)
 * - DEUDA_TRIBUTARIA: Deudas tributarias (IGV, Renta, EsSalud, ONP)
 */
export const ORIGEN_DOCUMENTO_TESORERIA = {
  CUENTAS_POR_COBRAR: 'Cuentas por Cobrar',
  CUENTAS_POR_PAGAR: 'Cuentas por Pagar',
  ASIGNACION_RENDIR: 'Asignación a Rendir',
  GASTO_DIRECTO: 'Gasto Directo',
  DEUDA_PERSONAL: 'Deuda Personal',
  DEUDA_TRIBUTARIA: 'Deuda Tributaria',
};

// ════════════════════════════════════════════════════════════════════════════
// LABELS Y CONFIGURACIÓN DE UI - TESORERÍA PENDIENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * LABELS_TIPO_FILTRO
 * 
 * Labels y configuración visual para los botones de filtro de tipo.
 * Se usa en PendientesHeader.jsx para renderizar los botones.
 */
export const LABELS_TIPO_FILTRO = {
  [TIPO_FILTRO_TESORERIA.TODOS]: {
    label: 'Todos',
    severity: 'secondary',
    icon: 'pi pi-list',
  },
  [TIPO_FILTRO_TESORERIA.COBRAR]: {
    label: 'Por Cobrar',
    severity: 'success',
    icon: 'pi pi-arrow-down',
  },
  [TIPO_FILTRO_TESORERIA.PAGAR]: {
    label: 'Por Pagar',
    severity: 'danger',
    icon: 'pi pi-arrow-up',
  },
  [TIPO_FILTRO_TESORERIA.ASIGNACIONES]: {
    label: 'Asignaciones',
    severity: 'info',
    icon: 'pi pi-money-bill',
  },
  [TIPO_FILTRO_TESORERIA.GASTOS_DIRECTOS]: {
    label: 'Gastos Directos',
    severity: 'warning',
    icon: 'pi pi-shopping-cart',
  },
};

/**
 * LABELS_TIPO_DEUDA
 * 
 * Labels y configuración visual para los botones de deudas.
 * Se usa en PendientesHeader.jsx para renderizar los botones.
 */
export const LABELS_TIPO_DEUDA = {
  [TIPO_DEUDA_TESORERIA.DEUDAS_PERSONAL]: {
    label: 'Deudas Personal',
    severity: 'help',
    icon: 'pi pi-users',
  },
  [TIPO_DEUDA_TESORERIA.DEUDAS_TRIBUTARIAS]: {
    label: 'Deudas Tributarias',
    severity: 'contrast',
    icon: 'pi pi-building',
  },
};

/**
 * LABELS_TIPO_ENTREGA
 * 
 * Labels y configuración visual para los botones de entregas.
 * Se usa en PendientesHeader.jsx para renderizar los botones.
 */
export const LABELS_TIPO_ENTREGA = {
  [TIPO_ENTREGA_TESORERIA.ASIGNACIONES]: {
    label: 'Asignaciones',
    severity: 'info',
    icon: 'pi pi-money-bill',
  },
  [TIPO_ENTREGA_TESORERIA.GASTOS_DIRECTOS]: {
    label: 'Gastos Directos',
    severity: 'warning',
    icon: 'pi pi-shopping-cart',
  },
};
/**
 * LABELS_TEXTO_ENTREGAS
 * 
 * Textos descriptivos para mostrar en los resúmenes de entregas.
 * Se usa en PendientesHeader.jsx para mostrar "asig" o "gastos" en los totales.
 */
export const LABELS_TEXTO_ENTREGAS = {
  [TIPO_ENTREGA_TESORERIA.ASIGNACIONES]: {
    singular: 'asignación',
    plural: 'asignaciones',
    abreviado: 'asig',
  },
  [TIPO_ENTREGA_TESORERIA.GASTOS_DIRECTOS]: {
    singular: 'gasto',
    plural: 'gastos',
    abreviado: 'gastos',
  },
};

/**
 * LABELS_TIPO_VENCIMIENTO
 * 
 * Labels y configuración visual para los botones de vencimiento.
 * Se usa en PendientesHeader.jsx para renderizar los botones.
 */
export const LABELS_TIPO_VENCIMIENTO = {
  [TIPO_VENCIMIENTO_TESORERIA.TODOS]: {
    label: 'Todos',
    severity: 'secondary',
    icon: 'pi pi-calendar',
  },
  [TIPO_VENCIMIENTO_TESORERIA.VENCIDOS]: {
    label: 'Vencidos',
    severity: 'danger',
    icon: 'pi pi-exclamation-triangle',
  },
  [TIPO_VENCIMIENTO_TESORERIA.HOY]: {
    label: 'Vencen Hoy',
    severity: 'warning',
    icon: 'pi pi-clock',
  },
  [TIPO_VENCIMIENTO_TESORERIA.SEMANA]: {
    label: 'Vencen esta Semana',
    severity: 'info',
    icon: 'pi pi-calendar-plus',
  },
};

/**
 * LABELS_TIPO_OPERACION
 * 
 * Labels y configuración visual para los botones de operaciones.
 * Se usa en PendientesHeader.jsx para renderizar los botones.
 */
export const LABELS_TIPO_OPERACION = {
  [TIPO_OPERACION_TESORERIA.TRANSFERENCIA_INTERNA]: {
    label: 'Transfer. Interna',
    severity: 'info',
    icon: 'pi pi-arrow-right-arrow-left',
    descripcion: 'Transferencia entre nuestras cuentas',
  },
  [TIPO_OPERACION_TESORERIA.PAGO_PROVEEDOR]: {
    label: 'Pago Proveedor',
    severity: 'warning',
    icon: 'pi pi-send',
    descripcion: 'Pago a cuenta externa de proveedor',
  },
  [TIPO_OPERACION_TESORERIA.RETIRO_DINERO]: {
    label: 'Retiro Dinero',
    severity: 'danger',
    icon: 'pi pi-minus-circle',
    descripcion: 'Retiro de efectivo',
  },
  [TIPO_OPERACION_TESORERIA.INGRESO_DINERO]: {
    label: 'Ingreso Dinero',
    severity: 'success',
    icon: 'pi pi-plus-circle',
    descripcion: 'Depósito de efectivo',
  },
  [TIPO_OPERACION_TESORERIA.GASTO_URGENTE]: {
    label: 'Gasto Urgente',
    severity: 'danger',
    icon: 'pi pi-bolt',
    descripcion: 'Provisión + Pago inmediato',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN POR DEFECTO (para imports más limpios)
// ════════════════════════════════════════════════════════════════════════════

export default {
  // Constantes de filtros
  TIPO_FILTRO_TESORERIA,
  TIPO_DEUDA_TESORERIA,
  TIPO_VENCIMIENTO_TESORERIA,
  TIPO_ENTREGA_TESORERIA,
  TIPO_OPERACION_TESORERIA,
  ORIGEN_DOCUMENTO_TESORERIA,
  
  // Constantes de operaciones especializadas
  TIPO_OPERACION_CAJA,
  PORCENTAJES_SUNAT,
  MONTOS_MINIMOS_SUNAT,
  
  // Labels y configuración UI
  LABELS_TIPO_FILTRO,
  LABELS_TIPO_DEUDA,
  LABELS_TIPO_ENTREGA,
  LABELS_TIPO_VENCIMIENTO,
  LABELS_TIPO_OPERACION,
  LABELS_TEXTO_ENTREGAS,
  
  // Funciones de cálculo
  calcularITF,
  calcularDetraccion,
  calcularRetencion,
  calcularPercepcion,
  debeAplicarDetraccion,
  debeAplicarRetencion,
  
  // Funciones de estructura
  crearOperacionEspecializadaCaja,
  crearMovimientoPreview,
  validarOperacionEspecializada,
  calcularResumenFinanciero,
};