-- CreateTable
CREATE TABLE "CotizacionCompras" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoProductoId" BIGINT NOT NULL,
    "tipoEstadoProductoId" BIGINT NOT NULL,
    "destinoProductoId" BIGINT NOT NULL,
    "formaTransaccionId" BIGINT NOT NULL,
    "modoDespachoRecepcionId" BIGINT NOT NULL,
    "respComprasId" BIGINT NOT NULL,
    "respProduccionId" BIGINT NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "autorizaCompraId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(65,30) NOT NULL,
    "contactoProveedorId" BIGINT NOT NULL,
    "direccionProveedorId" BIGINT NOT NULL,
    "proveedorId" BIGINT NOT NULL,
    "bancoId" BIGINT NOT NULL,
    "formaPagoId" BIGINT NOT NULL,
    "respAlmacenId" BIGINT NOT NULL,
    "estadoCotizacionId" BIGINT NOT NULL,
    "centroCostoId" BIGINT NOT NULL,
    "reqCompraId" BIGINT,
    "usuarioGeneroReqCompraId" BIGINT,
    "fechaUsuarioGeneroReqCompraId" TIMESTAMP(3),
    "ordenCompraId" BIGINT,
    "usuarioGeneroOrdenCompraId" BIGINT,
    "fechaUsuarioGeneroOrdenCompra" TIMESTAMP(3),
    "supervisorCompraCampoId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionCompras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetCotizacionCompras" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "cotizacionComprasId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "proveedorId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "movIngresoAlmacenId" BIGINT NOT NULL,
    "ordenCompraId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "centroCostoId" BIGINT NOT NULL,

    CONSTRAINT "DetCotizacionCompras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetDocsReqCotizaCompras" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionComprasId" BIGINT NOT NULL,
    "docRequeridaComprasId" BIGINT NOT NULL,
    "numeroDocumento" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "urlDocumento" TEXT,
    "observaciones" TEXT,
    "verificado" BOOLEAN NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetDocsReqCotizaCompras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaARendirPCompras" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionComprasId" BIGINT NOT NULL,
    "respEntregaRendirId" BIGINT NOT NULL,
    "entregaLiquidada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLiquidacion" TIMESTAMP(3),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,
    "centroCostoId" BIGINT NOT NULL,

    CONSTRAINT "EntregaARendirPCompras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetMovsEntregaRendirPCompras" (
    "id" BIGSERIAL NOT NULL,
    "entregaARendirPComprasId" BIGINT NOT NULL,
    "responsableId" BIGINT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "centroCostoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetMovsEntregaRendirPCompras_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CotizacionCompras" ADD CONSTRAINT "CotizacionCompras_tipoProductoId_fkey" FOREIGN KEY ("tipoProductoId") REFERENCES "TipoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionCompras" ADD CONSTRAINT "CotizacionCompras_tipoEstadoProductoId_fkey" FOREIGN KEY ("tipoEstadoProductoId") REFERENCES "TipoEstadoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionCompras" ADD CONSTRAINT "CotizacionCompras_destinoProductoId_fkey" FOREIGN KEY ("destinoProductoId") REFERENCES "DestinoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionCompras" ADD CONSTRAINT "CotizacionCompras_formaTransaccionId_fkey" FOREIGN KEY ("formaTransaccionId") REFERENCES "FormaTransaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionCompras" ADD CONSTRAINT "CotizacionCompras_modoDespachoRecepcionId_fkey" FOREIGN KEY ("modoDespachoRecepcionId") REFERENCES "ModoDespachoRecepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetCotizacionCompras" ADD CONSTRAINT "DetCotizacionCompras_cotizacionComprasId_fkey" FOREIGN KEY ("cotizacionComprasId") REFERENCES "CotizacionCompras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetDocsReqCotizaCompras" ADD CONSTRAINT "DetDocsReqCotizaCompras_cotizacionComprasId_fkey" FOREIGN KEY ("cotizacionComprasId") REFERENCES "CotizacionCompras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetDocsReqCotizaCompras" ADD CONSTRAINT "DetDocsReqCotizaCompras_docRequeridaComprasId_fkey" FOREIGN KEY ("docRequeridaComprasId") REFERENCES "DocRequeridaComprasVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPCompras" ADD CONSTRAINT "EntregaARendirPCompras_cotizacionComprasId_fkey" FOREIGN KEY ("cotizacionComprasId") REFERENCES "CotizacionCompras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_entregaARendirPComprasId_fkey" FOREIGN KEY ("entregaARendirPComprasId") REFERENCES "EntregaARendirPCompras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
