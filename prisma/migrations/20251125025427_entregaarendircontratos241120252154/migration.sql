-- CreateTable
CREATE TABLE "EntregaARendirContratoServicios" (
    "id" BIGSERIAL NOT NULL,
    "contratoServicioId" BIGINT NOT NULL,
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

    CONSTRAINT "EntregaARendirContratoServicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetMovsEntregaRendirContratoServicios" (
    "id" BIGSERIAL NOT NULL,
    "entregaARendirContratoServicioId" BIGINT NOT NULL,
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

    CONSTRAINT "DetMovsEntregaRendirContratoServicios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntregaARendirContratoServicios_contratoServicioId_key" ON "EntregaARendirContratoServicios"("contratoServicioId");

-- CreateIndex
CREATE INDEX "EntregaARendirContratoServicios_respEntregaRendirId_idx" ON "EntregaARendirContratoServicios"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "EntregaARendirContratoServicios_entregaLiquidada_idx" ON "EntregaARendirContratoServicios"("entregaLiquidada");

-- CreateIndex
CREATE INDEX "EntregaARendirContratoServicios_contratoServicioId_idx" ON "EntregaARendirContratoServicios"("contratoServicioId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirContratoServicios_entregaARendirContrat_idx" ON "DetMovsEntregaRendirContratoServicios"("entregaARendirContratoServicioId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirContratoServicios_tipoMovimientoId_idx" ON "DetMovsEntregaRendirContratoServicios"("tipoMovimientoId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirContratoServicios_responsableId_idx" ON "DetMovsEntregaRendirContratoServicios"("responsableId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirContratoServicios_fechaMovimiento_idx" ON "DetMovsEntregaRendirContratoServicios"("fechaMovimiento");

-- AddForeignKey
ALTER TABLE "EntregaARendirContratoServicios" ADD CONSTRAINT "EntregaARendirContratoServicios_contratoServicioId_fkey" FOREIGN KEY ("contratoServicioId") REFERENCES "ContratoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirContratoServicios" ADD CONSTRAINT "EntregaARendirContratoServicios_respLiquidacionId_fkey" FOREIGN KEY ("respLiquidacionId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirContratoServicios" ADD CONSTRAINT "EntregaARendirContratoServicios_respEntregaRendirId_fkey" FOREIGN KEY ("respEntregaRendirId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirContratoServicios" ADD CONSTRAINT "EntregaARendirContratoServicios_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_entregaARendirContra_fkey" FOREIGN KEY ("entregaARendirContratoServicioId") REFERENCES "EntregaARendirContratoServicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
