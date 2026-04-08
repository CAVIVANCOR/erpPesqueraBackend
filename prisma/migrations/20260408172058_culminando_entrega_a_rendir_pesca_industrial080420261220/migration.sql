-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "entregaARendirLiquidada" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaLiquidacionEntregaARendir" TIMESTAMP(3),
ADD COLUMN     "urlLiquidacionEntregaARendir" TEXT;
