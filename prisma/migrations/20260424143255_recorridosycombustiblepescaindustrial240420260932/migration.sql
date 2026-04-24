-- AlterTable
ALTER TABLE "DescargaFaenaConsumo" ADD COLUMN     "lugarUbicacionGeografica" TEXT;

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ADD COLUMN     "lugarUbicacionGeografica" TEXT;

-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "combustibleTotalComprado" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleTotalCompradoSoles" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "combustibleTotalComprado" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleTotalCompradoSoles" DECIMAL(65,30) DEFAULT 0.00;
