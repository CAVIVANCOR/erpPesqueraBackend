-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "urlConsolidadoFaenaCalasDescargas" TEXT,
ADD COLUMN     "urlConsolidadoFinal" TEXT,
ADD COLUMN     "urlLiquidacionPersonalPesca" TEXT;

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "urlConsolidadoFaenaCalasDescargas" TEXT,
ADD COLUMN     "urlConsolidadoFinal" TEXT,
ADD COLUMN     "urlLiquidacionPersonalPesca" TEXT;
