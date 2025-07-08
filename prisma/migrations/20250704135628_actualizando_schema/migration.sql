/*
  Warnings:

  - Added the required column `fechaMovimiento` to the `MovLiquidacionFaenaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MovLiquidacionFaenaPesca" ADD COLUMN     "fechaMovimiento" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "LiquidacionTemporadaPesca" (
    "id" BIGSERIAL NOT NULL,
    "temporadaPescaId" BIGINT NOT NULL,
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

    CONSTRAINT "LiquidacionTemporadaPesca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovLiquidacionTemporadaPesca" (
    "id" BIGSERIAL NOT NULL,
    "liquidacionTemporadaId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "centroCostoId" BIGINT,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovLiquidacionTemporadaPesca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionTemporadaPesca_temporadaPescaId_key" ON "LiquidacionTemporadaPesca"("temporadaPescaId");

-- AddForeignKey
ALTER TABLE "LiquidacionTemporadaPesca" ADD CONSTRAINT "LiquidacionTemporadaPesca_temporadaPescaId_fkey" FOREIGN KEY ("temporadaPescaId") REFERENCES "TemporadaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiquidacionTemporadaPesca" ADD CONSTRAINT "MovLiquidacionTemporadaPesca_liquidacionTemporadaId_fkey" FOREIGN KEY ("liquidacionTemporadaId") REFERENCES "LiquidacionTemporadaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
