-- CreateTable
CREATE TABLE "LiquidacionProcesoComprasProd" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionComprasId" BIGINT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "fechaLiquidacion" TIMESTAMP(3) NOT NULL,
    "responsableId" BIGINT NOT NULL,
    "verificadorId" BIGINT,
    "fechaVerificacion" TIMESTAMP(3),
    "urlPdfLiquidacion" TEXT,
    "saldoFinal" DECIMAL(65,30) NOT NULL,
    "observaciones" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidacionProcesoComprasProd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovLiquidacionProcesoComprasProd" (
    "id" BIGSERIAL NOT NULL,
    "liquidacionProcesoComprasProdId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "centroCostoId" BIGINT,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovLiquidacionProcesoComprasProd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionProcesoComprasProd_cotizacionComprasId_key" ON "LiquidacionProcesoComprasProd"("cotizacionComprasId");

-- AddForeignKey
ALTER TABLE "LiquidacionProcesoComprasProd" ADD CONSTRAINT "LiquidacionProcesoComprasProd_cotizacionComprasId_fkey" FOREIGN KEY ("cotizacionComprasId") REFERENCES "CotizacionCompras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiquidacionProcesoComprasProd" ADD CONSTRAINT "MovLiquidacionProcesoComprasProd_liquidacionProcesoCompras_fkey" FOREIGN KEY ("liquidacionProcesoComprasProdId") REFERENCES "LiquidacionProcesoComprasProd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
