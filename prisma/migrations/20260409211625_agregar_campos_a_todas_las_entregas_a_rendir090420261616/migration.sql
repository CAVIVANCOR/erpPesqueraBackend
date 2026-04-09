-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "embarcacionId" BIGINT,
ADD COLUMN     "enlaceAOtroDetalleGastoId" BIGINT,
ADD COLUMN     "entregaARendirLiquidada" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaLiquidacionEntregaARendir" TIMESTAMP(3),
ADD COLUMN     "urlLiquidacionEntregaARendir" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD COLUMN     "enlaceAOtroDetalleGastoId" BIGINT,
ADD COLUMN     "entregaARendirLiquidada" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaLiquidacionEntregaARendir" TIMESTAMP(3),
ADD COLUMN     "urlLiquidacionEntregaARendir" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD COLUMN     "enlaceAOtroDetalleGastoId" BIGINT,
ADD COLUMN     "entregaARendirLiquidada" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaLiquidacionEntregaARendir" TIMESTAMP(3),
ADD COLUMN     "urlLiquidacionEntregaARendir" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD COLUMN     "enlaceAOtroDetalleGastoId" BIGINT,
ADD COLUMN     "entregaARendirLiquidada" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaLiquidacionEntregaARendir" TIMESTAMP(3),
ADD COLUMN     "urlLiquidacionEntregaARendir" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "enlaceAOtroDetalleGastoId" BIGINT,
ADD COLUMN     "entregaARendirLiquidada" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaLiquidacionEntregaARendir" TIMESTAMP(3),
ADD COLUMN     "urlLiquidacionEntregaARendir" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD COLUMN     "enlaceAOtroDetalleGastoId" BIGINT,
ADD COLUMN     "entregaARendirLiquidada" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaLiquidacionEntregaARendir" TIMESTAMP(3),
ADD COLUMN     "urlLiquidacionEntregaARendir" TEXT;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
