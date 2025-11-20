/*
  Warnings:

  - You are about to drop the column `liquidadoPorId` on the `EntregaARendirPVentas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EntregaARendir" ADD COLUMN     "respLiquidacionId" BIGINT,
ADD COLUMN     "urlLiquidacionPdf" TEXT;

-- AlterTable
ALTER TABLE "EntregaARendirPCompras" ADD COLUMN     "respLiquidacionId" BIGINT,
ADD COLUMN     "urlLiquidacionPdf" TEXT;

-- AlterTable
ALTER TABLE "EntregaARendirPVentas" DROP COLUMN "liquidadoPorId",
ADD COLUMN     "respLiquidacionId" BIGINT,
ADD COLUMN     "urlLiquidacionPdf" TEXT;

-- AlterTable
ALTER TABLE "EntregaARendirPescaConsumo" ADD COLUMN     "respLiquidacionId" BIGINT,
ADD COLUMN     "urlLiquidacionPdf" TEXT;

-- CreateIndex
CREATE INDEX "EntregaARendir_respEntregaRendirId_idx" ON "EntregaARendir"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "EntregaARendir_entregaLiquidada_idx" ON "EntregaARendir"("entregaLiquidada");

-- CreateIndex
CREATE INDEX "EntregaARendir_temporadaPescaId_idx" ON "EntregaARendir"("temporadaPescaId");

-- CreateIndex
CREATE INDEX "EntregaARendirPCompras_requerimientoCompraId_idx" ON "EntregaARendirPCompras"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "EntregaARendirPVentas_respEntregaRendirId_idx" ON "EntregaARendirPVentas"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "EntregaARendirPVentas_entregaLiquidada_idx" ON "EntregaARendirPVentas"("entregaLiquidada");

-- CreateIndex
CREATE INDEX "EntregaARendirPescaConsumo_respEntregaRendirId_idx" ON "EntregaARendirPescaConsumo"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "EntregaARendirPescaConsumo_entregaLiquidada_idx" ON "EntregaARendirPescaConsumo"("entregaLiquidada");

-- CreateIndex
CREATE INDEX "EntregaARendirPescaConsumo_novedadPescaConsumoId_idx" ON "EntregaARendirPescaConsumo"("novedadPescaConsumoId");

-- AddForeignKey
ALTER TABLE "EntregaARendirPVentas" ADD CONSTRAINT "EntregaARendirPVentas_respLiquidacionId_fkey" FOREIGN KEY ("respLiquidacionId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPVentas" ADD CONSTRAINT "EntregaARendirPVentas_respEntregaRendirId_fkey" FOREIGN KEY ("respEntregaRendirId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPVentas" ADD CONSTRAINT "EntregaARendirPVentas_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendir" ADD CONSTRAINT "EntregaARendir_respLiquidacionId_fkey" FOREIGN KEY ("respLiquidacionId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendir" ADD CONSTRAINT "EntregaARendir_respEntregaRendirId_fkey" FOREIGN KEY ("respEntregaRendirId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendir" ADD CONSTRAINT "EntregaARendir_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPCompras" ADD CONSTRAINT "EntregaARendirPCompras_respLiquidacionId_fkey" FOREIGN KEY ("respLiquidacionId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPCompras" ADD CONSTRAINT "EntregaARendirPCompras_respEntregaRendirId_fkey" FOREIGN KEY ("respEntregaRendirId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPCompras" ADD CONSTRAINT "EntregaARendirPCompras_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPescaConsumo" ADD CONSTRAINT "EntregaARendirPescaConsumo_respLiquidacionId_fkey" FOREIGN KEY ("respLiquidacionId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPescaConsumo" ADD CONSTRAINT "EntregaARendirPescaConsumo_respEntregaRendirId_fkey" FOREIGN KEY ("respEntregaRendirId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPescaConsumo" ADD CONSTRAINT "EntregaARendirPescaConsumo_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
