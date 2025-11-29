-- CreateTable
CREATE TABLE "EntregaARendirOTMantenimiento" (
    "id" BIGSERIAL NOT NULL,
    "otMantenimientoId" BIGINT NOT NULL,
    "respEntregaRendirId" BIGINT NOT NULL,
    "entregaLiquidada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLiquidacion" TIMESTAMP(3),
    "centroCostoId" BIGINT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,
    "urlLiquidacionPdf" VARCHAR(500),
    "respLiquidacionId" BIGINT,

    CONSTRAINT "EntregaARendirOTMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetMovsEntregaRendirOTMantenimiento" (
    "id" BIGSERIAL NOT NULL,
    "entregaARendirOTMantenimientoId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "productoId" BIGINT,
    "responsableId" BIGINT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "monedaId" BIGINT,
    "descripcion" TEXT,
    "entidadComercialId" BIGINT,
    "tipoDocumentoId" BIGINT,
    "numeroSerieComprobante" VARCHAR(20),
    "numeroCorrelativoComprobante" VARCHAR(20),
    "urlComprobanteMovimiento" VARCHAR(500),
    "validadoTesoreria" BOOLEAN NOT NULL DEFAULT false,
    "fechaValidacionTesoreria" TIMESTAMP(3),
    "operacionSinFactura" BOOLEAN NOT NULL DEFAULT false,
    "motivoSinFactura" TEXT,
    "operacionMovCajaId" BIGINT,
    "fechaOperacionMovCaja" TIMESTAMP(3),
    "urlComprobanteOperacionMovCaja" VARCHAR(500),
    "moduloOrigenMovCajaId" BIGINT,
    "centroCostoId" BIGINT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntregaARendirOTMantenimiento_otMantenimientoId_key" ON "EntregaARendirOTMantenimiento"("otMantenimientoId");

-- CreateIndex
CREATE INDEX "EntregaARendirOTMantenimiento_respEntregaRendirId_idx" ON "EntregaARendirOTMantenimiento"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "EntregaARendirOTMantenimiento_entregaLiquidada_idx" ON "EntregaARendirOTMantenimiento"("entregaLiquidada");

-- CreateIndex
CREATE INDEX "EntregaARendirOTMantenimiento_otMantenimientoId_idx" ON "EntregaARendirOTMantenimiento"("otMantenimientoId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirOTMantenimiento_entregaARendirOTManteni_idx" ON "DetMovsEntregaRendirOTMantenimiento"("entregaARendirOTMantenimientoId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirOTMantenimiento_tipoMovimientoId_idx" ON "DetMovsEntregaRendirOTMantenimiento"("tipoMovimientoId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirOTMantenimiento_responsableId_idx" ON "DetMovsEntregaRendirOTMantenimiento"("responsableId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirOTMantenimiento_fechaMovimiento_idx" ON "DetMovsEntregaRendirOTMantenimiento"("fechaMovimiento");

-- AddForeignKey
ALTER TABLE "EntregaARendirOTMantenimiento" ADD CONSTRAINT "EntregaARendirOTMantenimiento_otMantenimientoId_fkey" FOREIGN KEY ("otMantenimientoId") REFERENCES "OTMantenimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirOTMantenimiento" ADD CONSTRAINT "EntregaARendirOTMantenimiento_respLiquidacionId_fkey" FOREIGN KEY ("respLiquidacionId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirOTMantenimiento" ADD CONSTRAINT "EntregaARendirOTMantenimiento_respEntregaRendirId_fkey" FOREIGN KEY ("respEntregaRendirId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirOTMantenimiento" ADD CONSTRAINT "EntregaARendirOTMantenimiento_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_entregaARendirOTManten_fkey" FOREIGN KEY ("entregaARendirOTMantenimientoId") REFERENCES "EntregaARendirOTMantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
