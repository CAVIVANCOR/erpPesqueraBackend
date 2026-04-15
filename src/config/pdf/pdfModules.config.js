/**
 * pdfModules.config.js - Configuración centralizada del sistema PDF V2
 * C:\Proyectos\megui\erp\erp-pesquera-backend\src\config\pdf\pdfModules.config.js
 * AGREGAR NUEVO MÓDULO: Copiar un elemento existente y ajustar valores
 * Tiempo: 30 segundos
 */

const PDF_MODULES_CONFIG = {
  "temporada-pesca": {
    uploadPath: "uploads/pdf-system/temporada-pesca",
    oldPaths: ["/uploads/resoluciones-temporada/"],
    apiEndpoint: "/api/pdf/temporada-pesca",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "TemporadaPesca",
      field: "urlResolucionPdf",
    },
  },

  "novedad-pesca-consumo": {
    uploadPath: "uploads/pdf-system/novedad-pesca-consumo",
    oldPaths: ["/uploads/resoluciones-novedad/"],
    apiEndpoint: "/api/pdf/novedad-pesca-consumo",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "NovedadPescaConsumo",
      field: "urlResolucionPdf",
    },
  },

  "tesoreria-prestamos-principal": {
    uploadPath: "uploads/pdf-system/tesoreria-prestamos-principal",
    oldPaths: [],
    apiEndpoint: "/api/pdf/tesoreria-prestamos-principal",
    maxFileSize: 20 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "PrestamoBancario",
      field: "urlDocumentoPrincipal",
    },
  },

  "tesoreria-prestamos-adicional": {
    uploadPath: "uploads/pdf-system/tesoreria-prestamos-adicional",
    oldPaths: [],
    apiEndpoint: "/api/pdf/tesoreria-prestamos-adicional",
    maxFileSize: 20 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "PrestamoBancario",
      field: "urlDocumentoAdicional",
    },
  },

  "requerimiento-compra": {
    uploadPath: "uploads/pdf-system/requerimientos",
    oldPaths: ["/uploads/requerimientos-compra/"],
    apiEndpoint: "/api/pdf/requerimiento-compra",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "RequerimientoCompra",
      field: "urlReqCompraPdf",
    },
  },

  "orden-compra": {
    uploadPath: "uploads/pdf-system/ordenes-compra",
    oldPaths: ["/uploads/ordenes-compra/"],
    apiEndpoint: "/api/pdf/orden-compra",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "OrdenCompra",
      field: "urlOrdenCompraPdf",
    },
  },

  "cotizacion-ventas": {
    uploadPath: "uploads/pdf-system/cotizaciones-ventas",
    oldPaths: ["/uploads/cotizaciones-ventas/"],
    apiEndpoint: "/api/pdf/cotizacion-ventas",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "CotizacionVentas",
      field: "urlCotizacionPdf",
    },
  },

  "detalle-cala-especie": {
    uploadPath: "uploads/pdf-system/detalle-cala-especie",
    oldPaths: [],
    apiEndpoint: "/api/pdf/detalle-cala-especie",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetalleCalaEspecie",
      field: "urlDatosCala",
    },
  },
  "detalle-cala-pesca-consumo": {
    uploadPath: "uploads/pdf-system/detalle-cala-pesca-consumo",
    oldPaths: [],
    apiEndpoint: "/api/pdf/detalle-cala-pesca-consumo",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetCalaPescaConsumo",
      field: "urlDatosCala",
    },
  },
  "pre-factura": {
    uploadPath: "uploads/pdf-system/pre-facturas",
    oldPaths: ["/uploads/pre-facturas/"],
    apiEndpoint: "/api/pdf/pre-factura",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "PreFactura",
      field: "urlPreFacturaPdf",
    },
  },

  "movimiento-almacen": {
    uploadPath: "uploads/pdf-system/movimientos-almacen",
    oldPaths: ["/uploads/movimientos-almacen/"],
    apiEndpoint: "/api/pdf/movimiento-almacen",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "MovimientoAlmacen",
      field: "urlMovimientoAlmacenPdf",
    },
  },

  "documentacion-personal": {
    uploadPath: "uploads/pdf-system/documentacion-personal",
    oldPaths: ["/uploads/documentacion-personal/"],
    apiEndpoint: "/api/pdf/documentacion-personal",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DocumentacionPersonal",
      field: "urlDocumento",
    },
  },

  "documentacion-embarcacion": {
    uploadPath: "uploads/pdf-system/documentacion-embarcacion",
    oldPaths: ["/uploads/documentacion-embarcacion/"],
    apiEndpoint: "/api/pdf/documentacion-embarcacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetDocEmbarcacion",
      field: "urlDocEmbarcacion",
    },
  },

  "certificados-embarcacion": {
    uploadPath: "uploads/pdf-system/certificados-embarcacion",
    oldPaths: ["/uploads/certificados-embarcacion/"],
    apiEndpoint: "/api/pdf/certificados-embarcacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "Embarcacion",
      field: "urlFotoEmbarcacion",
    },
  },

  "fichas-tecnicas": {
    uploadPath: "uploads/pdf-system/fichas-tecnicas",
    oldPaths: ["/uploads/fichas-tecnicas/"],
    apiEndpoint: "/api/pdf/fichas-tecnicas",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "Producto",
      field: "urlFichaTecnica",
    },
  },

  producto: {
    uploadPath: "uploads/pdf-system/productos",
    oldPaths: ["/uploads/productos/"],
    apiEndpoint: "/api/pdf/producto",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "Producto",
      field: "urlFichaTecnica",
    },
  },

  "fichas-tecnicas-boliches": {
    uploadPath: "uploads/pdf-system/fichas-tecnicas-boliches",
    oldPaths: ["/uploads/fichas-tecnicas-boliches/"],
    apiEndpoint: "/api/pdf/fichas-tecnicas-boliches",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "BolicheRed",
      field: "urlBolicheRedPdf",
    },
  },

  "boliche-red": {
    uploadPath: "uploads/pdf-system/boliche-red",
    oldPaths: ["/uploads/boliche-red/"],
    apiEndpoint: "/api/pdf/boliche-red",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "BolicheRed",
      field: "urlBolicheRedPdf",
    },
  },

  "ot-mantenimiento-comprobante": {
    uploadPath: "uploads/pdf-system/ot-mantenimiento-comprobante",
    oldPaths: [],
    apiEndpoint: "/api/pdf/ot-mantenimiento-comprobante",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirOTMantenimiento",
      field: "urlComprobanteMovimiento",
    },
  },

  "ot-mantenimiento-operacion": {
    uploadPath: "uploads/pdf-system/ot-mantenimiento-operacion",
    oldPaths: [],
    apiEndpoint: "/api/pdf/ot-mantenimiento-operacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirOTMantenimiento",
      field: "urlComprobanteOperacionMovCaja",
    },
  },

  "ot-mantenimiento-fotos-antes": {
    uploadPath: "uploads/pdf-system/ot-mantenimiento-fotos-antes",
    oldPaths: [],
    apiEndpoint: "/api/pdf/ot-mantenimiento-fotos-antes",
    maxFileSize: 20 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "OTMantenimiento",
      field: "urlFotosAntesPdf",
    },
  },

  "ot-mantenimiento-fotos-despues": {
    uploadPath: "uploads/pdf-system/ot-mantenimiento-fotos-despues",
    oldPaths: [],
    apiEndpoint: "/api/pdf/ot-mantenimiento-fotos-despues",
    maxFileSize: 20 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "OTMantenimiento",
      field: "urlFotosDespuesPdf",
    },
  },

  "ot-mantenimiento-documento": {
    uploadPath: "uploads/pdf-system/ot-mantenimiento-documento",
    oldPaths: [],
    apiEndpoint: "/api/pdf/ot-mantenimiento-documento",
    maxFileSize: 20 * 1024 * 1024,
    allowedTypes: ["application/pdf"],
    maxFiles: 1,
    database: {
      table: "OTMantenimiento",
      field: "urlOrdenTrabajoPdf",
    },
  },

  "datos-adicionales-oc": {
    uploadPath: "uploads/pdf-system/datos-adicionales-oc",
    oldPaths: ["/uploads/datos-adicionales-oc/"],
    apiEndpoint: "/api/pdf/datos-adicionales-oc",
    maxFileSize: 20 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 50,
    database: {
      table: "OrdenCompra",
      field: "urlDatosAdicionalesPdf",
    },
  },

  "acceso-instalacion": {
    uploadPath: "uploads/pdf-system/acceso-instalacion",
    oldPaths: ["/uploads/acceso-instalacion/"],
    apiEndpoint: "/api/pdf/acceso-instalacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "AccesoInstalacion",
      field: "urlDocumentoVisitante",
    },
  },

  "documento-requerido": {
    uploadPath: "uploads/pdf-system/documento-requerido",
    oldPaths: ["/uploads/documento-requerido/"],
    apiEndpoint: "/api/pdf/documento-requerido",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DocumentoRequerido",
      field: "urlDocPdf",
    },
  },

  "confirmaciones-acciones-previas": {
    uploadPath: "uploads/pdf-system/confirmaciones-acciones-previas",
    oldPaths: ["/uploads/confirmaciones-acciones-previas/"],
    apiEndpoint: "/api/pdf/confirmaciones-acciones-previas",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetAccionesPreviasFaena",
      field: "urlConfirmacionPdf",
    },
  },

  "confirmaciones-acciones-previas-consumo": {
    uploadPath: "uploads/pdf-system/confirmaciones-acciones-previas-consumo",
    oldPaths: ["/uploads/confirmaciones-acciones-previas-consumo/"],
    apiEndpoint: "/api/pdf/confirmaciones-acciones-previas-consumo",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetAccionesPreviasFaenaConsumo",
      field: "urlConfirmacionPdf",
    },
  },

  "det-tareas-ot-cotizacion-uno": {
    uploadPath: "uploads/pdf-system/det-tareas-ot-cotizacion-uno",
    oldPaths: ["/uploads/det-tareas-ot-cotizacion-uno/"],
    apiEndpoint: "/api/pdf/det-tareas-ot-cotizacion-uno",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetTareasOT",
      field: "urlCotizacionUnoPdf",
    },
  },

  "det-tareas-ot-cotizacion-dos": {
    uploadPath: "uploads/pdf-system/det-tareas-ot-cotizacion-dos",
    oldPaths: ["/uploads/det-tareas-ot-cotizacion-dos/"],
    apiEndpoint: "/api/pdf/det-tareas-ot-cotizacion-dos",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetTareasOT",
      field: "urlCotizacionDosPdf",
    },
  },

  "det-tareas-ot-fotos": {
    uploadPath: "uploads/pdf-system/det-tareas-ot-fotos",
    oldPaths: ["/uploads/det-tareas-ot-fotos/"],
    apiEndpoint: "/api/pdf/det-tareas-ot-fotos",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetTareasOT",
      field: "urlFotosAntesPdf",
    },
  },

  "det-movs-entrega-rendir-pesca-industrial-comprobante": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-pesca-industrial-comprobante",
    oldPaths: [],
    apiEndpoint:
      "/api/pdf/det-movs-entrega-rendir-pesca-industrial-comprobante",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendir",
      field: "urlComprobanteMovimiento",
    },
  },

  "det-movs-entrega-rendir-pesca-industrial-operacion": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-pesca-industrial-operacion",
    oldPaths: [],
    apiEndpoint: "/api/pdf/det-movs-entrega-rendir-pesca-industrial-operacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendir",
      field: "urlComprobanteOperacionMovCaja",
    },
  },

  "liquidacion-entrega-rendir-pesca-industrial": {
    uploadPath:
      "uploads/pdf-system/liquidacion-entrega-rendir-pesca-industrial",
    oldPaths: [],
    apiEndpoint: "/api/pdf/liquidacion-entrega-rendir-pesca-industrial",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendir",
      field: "urlLiquidacionEntregaARendir",
    },
  },

  "det-movs-entrega-rendir-reqcompras-comprobante": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-reqcompras-comprobante",
    oldPaths: [],
    apiEndpoint: "/api/pdf/det-movs-entrega-rendir-reqcompras-comprobante",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirCompras",
      field: "urlComprobanteMovimiento",
    },
  },

  "det-movs-entrega-rendir-reqcompras-operacion": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-reqcompras-operacion",
    oldPaths: [],
    apiEndpoint: "/api/pdf/det-movs-entrega-rendir-reqcompras-operacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirCompras",
      field: "urlComprobanteOperacionMovCaja",
    },
  },

  "det-movs-entrega-rendir-pesca-consumo-comprobante": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-pesca-consumo-comprobante",
    oldPaths: [],
    apiEndpoint: "/api/pdf/det-movs-entrega-rendir-pesca-consumo-comprobante",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntRendirPescaConsumo",
      field: "urlComprobanteMovimiento",
    },
  },
  "cotizacion-ventas-movimiento-comprobante": {
    uploadPath: "uploads/pdf-system/cotizacion-ventas-movimiento-comprobante",
    oldPaths: [],
    apiEndpoint: "/api/pdf/cotizacion-ventas-movimiento-comprobante",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirVentas",
      field: "urlComprobanteMovimiento",
    },
  },

  "cotizacion-ventas-movimiento-operacion": {
    uploadPath: "uploads/pdf-system/cotizacion-ventas-movimiento-operacion",
    oldPaths: [],
    apiEndpoint: "/api/pdf/cotizacion-ventas-movimiento-operacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirVentas",
      field: "urlComprobanteOperacionMovCaja",
    },
  },

  "det-movs-entrega-rendir-pesca-consumo-operacion": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-pesca-consumo-operacion",
    oldPaths: [],
    apiEndpoint: "/api/pdf/det-movs-entrega-rendir-pesca-consumo-operacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntRendirPescaConsumo",
      field: "urlComprobanteOperacionMovCaja",
    },
  },

  "det-movs-entrega-rendir-mov-almacen-comprobante": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-comprobante",
    oldPaths: [],
    apiEndpoint: "/api/pdf/det-movs-entrega-rendir-mov-almacen-comprobante",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirMovAlmacen",
      field: "urlComprobanteMovimiento",
    },
  },

  "det-movs-entrega-rendir-mov-almacen-operacion": {
    uploadPath:
      "uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-operacion",
    oldPaths: [],
    apiEndpoint: "/api/pdf/det-movs-entrega-rendir-mov-almacen-operacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "DetMovsEntregaRendirMovAlmacen",
      field: "urlComprobanteOperacionMovCaja",
    },
  },

  "faena-pesca-reporte-calas": {
    uploadPath: "uploads/pdf-system/faena-pesca-reporte-calas",
    oldPaths: [],
    apiEndpoint: "/pdf/faena-pesca-reporte-calas",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "FaenaPesca",
      field: "urlReporteFaenaCalas",
    },
  },

  "faena-pesca-declaracion-desembarque": {
    uploadPath: "uploads/pdf-system/faena-pesca-declaracion-desembarque",
    oldPaths: [],
    apiEndpoint: "/pdf/faena-pesca-declaracion-desembarque",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "FaenaPesca",
      field: "urlDeclaracionDesembarqueArmador",
    },
  },

  "movimiento-caja-comprobante": {
    uploadPath: "uploads/pdf-system/movimiento-caja-comprobante",
    oldPaths: [],
    apiEndpoint: "/api/pdf/movimiento-caja-comprobante",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "MovimientoCaja",
      field: "urlDocumentoMovCaja", // ✅ CORREGIDO
    },
  },

  "movimiento-caja-operacion": {
    uploadPath: "uploads/pdf-system/movimiento-caja-operacion",
    oldPaths: [],
    apiEndpoint: "/api/pdf/movimiento-caja-operacion",
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFiles: 20,
    database: {
      table: "MovimientoCaja",
      field: "urlComprobanteOperacionMovCaja", // ✅ CORREGIDO
    },
  },
};

export function getModuleConfig(moduleName) {
  const config = PDF_MODULES_CONFIG[moduleName];
  if (!config) {
    throw new Error(
      `Módulo PDF '${moduleName}' no configurado en pdfModules.config.js`,
    );
  }
  return config;
}

export function getAllModules() {
  return Object.keys(PDF_MODULES_CONFIG);
}

export default PDF_MODULES_CONFIG;
