-- CreateTable
CREATE TABLE "LiqNovedadPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "novedadPescaConsumoId" BIGINT NOT NULL,
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

    CONSTRAINT "LiqNovedadPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovLiqNovedadPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "liqNovedadPescaConsumoId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "centroCostoId" BIGINT,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovLiqNovedadPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiqNovedadPescaConsumo_novedadPescaConsumoId_key" ON "LiqNovedadPescaConsumo"("novedadPescaConsumoId");

-- AddForeignKey
ALTER TABLE "LiqNovedadPescaConsumo" ADD CONSTRAINT "LiqNovedadPescaConsumo_novedadPescaConsumoId_fkey" FOREIGN KEY ("novedadPescaConsumoId") REFERENCES "NovedadPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiqNovedadPescaConsumo" ADD CONSTRAINT "MovLiqNovedadPescaConsumo_liqNovedadPescaConsumoId_fkey" FOREIGN KEY ("liqNovedadPescaConsumoId") REFERENCES "LiqNovedadPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
