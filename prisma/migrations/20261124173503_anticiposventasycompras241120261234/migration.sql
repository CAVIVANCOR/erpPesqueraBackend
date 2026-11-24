-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "esAnticipo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ordenCompraFinalAnticipoId" BIGINT;

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "esAnticipo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preFacturaFinalAnticipoId" BIGINT;

-- CreateIndex
CREATE INDEX "OrdenCompra_ordenCompraFinalAnticipoId_idx" ON "OrdenCompra"("ordenCompraFinalAnticipoId");

-- CreateIndex
CREATE INDEX "PreFactura_preFacturaFinalAnticipoId_idx" ON "PreFactura"("preFacturaFinalAnticipoId");

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_preFacturaFinalAnticipoId_fkey" FOREIGN KEY ("preFacturaFinalAnticipoId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_ordenCompraFinalAnticipoId_fkey" FOREIGN KEY ("ordenCompraFinalAnticipoId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
