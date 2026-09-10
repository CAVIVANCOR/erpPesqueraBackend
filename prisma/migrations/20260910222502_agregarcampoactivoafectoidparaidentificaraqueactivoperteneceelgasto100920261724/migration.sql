-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "activoAfectoId" BIGINT;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "activoAfectoId" BIGINT;

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_activoAfectoId_idx" ON "DetMovsEntregaRendir"("activoAfectoId");

-- CreateIndex
CREATE INDEX "OrdenCompra_activoAfectoId_idx" ON "OrdenCompra"("activoAfectoId");

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_activoAfectoId_fkey" FOREIGN KEY ("activoAfectoId") REFERENCES "Activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_activoAfectoId_fkey" FOREIGN KEY ("activoAfectoId") REFERENCES "Activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
