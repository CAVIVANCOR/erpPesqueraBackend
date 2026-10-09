/*
  Warnings:

  - A unique constraint covering the columns `[notaCreditoPreFacturaId]` on the table `PagoCuentaPorCobrar` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[notaCreditoOrdenCompraId]` on the table `PagoCuentaPorPagar` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PagoCuentaPorCobrar" ADD COLUMN     "notaCreditoPreFacturaId" BIGINT;

-- AlterTable
ALTER TABLE "PagoCuentaPorPagar" ADD COLUMN     "notaCreditoOrdenCompraId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "PagoCuentaPorCobrar_notaCreditoPreFacturaId_key" ON "PagoCuentaPorCobrar"("notaCreditoPreFacturaId");

-- CreateIndex
CREATE UNIQUE INDEX "PagoCuentaPorPagar_notaCreditoOrdenCompraId_key" ON "PagoCuentaPorPagar"("notaCreditoOrdenCompraId");

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_notaCreditoPreFacturaId_fkey" FOREIGN KEY ("notaCreditoPreFacturaId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_notaCreditoOrdenCompraId_fkey" FOREIGN KEY ("notaCreditoOrdenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
