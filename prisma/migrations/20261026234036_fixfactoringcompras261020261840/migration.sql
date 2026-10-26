-- AlterTable
ALTER TABLE "FormaPago" ADD COLUMN     "esFactoringCompras" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "bancoFactoringId" BIGINT,
ADD COLUMN     "factoringConIntereses" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaPrestamoFactoring" TIMESTAMP(3),
ADD COLUMN     "fechaVencimientoFactoring" TIMESTAMP(3),
ADD COLUMN     "numeroPrestamoFactoring" VARCHAR(40),
ADD COLUMN     "ordenCompraInteresFactoringId" BIGINT;

-- CreateIndex
CREATE INDEX "OrdenCompra_ordenCompraInteresFactoringId_idx" ON "OrdenCompra"("ordenCompraInteresFactoringId");

-- CreateIndex
CREATE INDEX "OrdenCompra_bancoFactoringId_idx" ON "OrdenCompra"("bancoFactoringId");

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_bancoFactoringId_fkey" FOREIGN KEY ("bancoFactoringId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_ordenCompraInteresFactoringId_fkey" FOREIGN KEY ("ordenCompraInteresFactoringId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
