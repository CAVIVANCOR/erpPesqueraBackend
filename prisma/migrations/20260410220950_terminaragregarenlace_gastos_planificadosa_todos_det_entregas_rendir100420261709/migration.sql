-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "enlaceGastosPlanificadosId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD COLUMN     "enlaceGastosPlanificadosId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD COLUMN     "enlaceGastosPlanificadosId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD COLUMN     "enlaceGastosPlanificadosId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "enlaceGastosPlanificadosId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD COLUMN     "enlaceGastosPlanificadosId" BIGINT;

-- CreateIndex
CREATE INDEX "DetMovsEntRendirPescaConsumo_enlaceGastosPlanificadosId_idx" ON "DetMovsEntRendirPescaConsumo"("enlaceGastosPlanificadosId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirContratoServicios_enlaceGastosPlanifica_idx" ON "DetMovsEntregaRendirContratoServicios"("enlaceGastosPlanificadosId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirMovAlmacen_enlaceGastosPlanificadosId_idx" ON "DetMovsEntregaRendirMovAlmacen"("enlaceGastosPlanificadosId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirOTMantenimiento_enlaceGastosPlanificado_idx" ON "DetMovsEntregaRendirOTMantenimiento"("enlaceGastosPlanificadosId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirPCompras_enlaceGastosPlanificadosId_idx" ON "DetMovsEntregaRendirPCompras"("enlaceGastosPlanificadosId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirPVentas_enlaceGastosPlanificadosId_idx" ON "DetMovsEntregaRendirPVentas"("enlaceGastosPlanificadosId");

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_enlaceGastosPlanificadosId_fkey" FOREIGN KEY ("enlaceGastosPlanificadosId") REFERENCES "DetGastosPlanificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_enlaceGastosPlanificadosId_fkey" FOREIGN KEY ("enlaceGastosPlanificadosId") REFERENCES "DetGastosPlanificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_enlaceGastosPlanificadosId_fkey" FOREIGN KEY ("enlaceGastosPlanificadosId") REFERENCES "DetGastosPlanificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_enlaceGastosPlanificadosId_fkey" FOREIGN KEY ("enlaceGastosPlanificadosId") REFERENCES "DetGastosPlanificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_enlaceGastosPlanific_fkey" FOREIGN KEY ("enlaceGastosPlanificadosId") REFERENCES "DetGastosPlanificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_enlaceGastosPlanificad_fkey" FOREIGN KEY ("enlaceGastosPlanificadosId") REFERENCES "DetGastosPlanificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
