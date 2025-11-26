-- CreateTable
CREATE TABLE "EntregaARendirMovAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "movimientoAlmacenId" BIGINT NOT NULL,
    "respEntregaRendirId" BIGINT NOT NULL,
    "entregaLiquidada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLiquidacion" TIMESTAMP(3),
    "centroCostoId" BIGINT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,
    "urlLiquidacionPdf" TEXT,
    "respLiquidacionId" BIGINT,

    CONSTRAINT "EntregaARendirMovAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetMovsEntregaRendirMovAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "entregaARendirMovAlmacenId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "productoId" BIGINT,
    "responsableId" BIGINT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "monedaId" BIGINT,
    "descripcion" TEXT,
    "entidadComercialId" BIGINT,
    "tipoDocumentoId" BIGINT,
    "numeroSerieComprobante" TEXT,
    "numeroCorrelativoComprobante" TEXT,
    "urlComprobanteMovimiento" TEXT,
    "validadoTesoreria" BOOLEAN NOT NULL DEFAULT false,
    "fechaValidacionTesoreria" TIMESTAMP(3),
    "operacionSinFactura" BOOLEAN NOT NULL DEFAULT false,
    "motivoSinFactura" TEXT,
    "operacionMovCajaId" BIGINT,
    "fechaOperacionMovCaja" TIMESTAMP(3),
    "urlComprobanteOperacionMovCaja" TEXT,
    "moduloOrigenMovCajaId" BIGINT,
    "centroCostoId" BIGINT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetMovsEntregaRendirMovAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntregaARendirMovAlmacen_movimientoAlmacenId_key" ON "EntregaARendirMovAlmacen"("movimientoAlmacenId");

-- CreateIndex
CREATE INDEX "EntregaARendirMovAlmacen_respEntregaRendirId_idx" ON "EntregaARendirMovAlmacen"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "EntregaARendirMovAlmacen_entregaLiquidada_idx" ON "EntregaARendirMovAlmacen"("entregaLiquidada");

-- CreateIndex
CREATE INDEX "EntregaARendirMovAlmacen_movimientoAlmacenId_idx" ON "EntregaARendirMovAlmacen"("movimientoAlmacenId");

-- AddForeignKey
ALTER TABLE "EntregaARendirMovAlmacen" ADD CONSTRAINT "EntregaARendirMovAlmacen_movimientoAlmacenId_fkey" FOREIGN KEY ("movimientoAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirMovAlmacen" ADD CONSTRAINT "EntregaARendirMovAlmacen_respLiquidacionId_fkey" FOREIGN KEY ("respLiquidacionId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirMovAlmacen" ADD CONSTRAINT "EntregaARendirMovAlmacen_respEntregaRendirId_fkey" FOREIGN KEY ("respEntregaRendirId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirMovAlmacen" ADD CONSTRAINT "EntregaARendirMovAlmacen_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_entregaARendirMovAlmacenId_fkey" FOREIGN KEY ("entregaARendirMovAlmacenId") REFERENCES "EntregaARendirMovAlmacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
