-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "combustibleStockFinalTemporada" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleStockInicialTemporada" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "combustibleStockFinalTemporada" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleStockInicialTemporada" DECIMAL(65,30) DEFAULT 0.00;
