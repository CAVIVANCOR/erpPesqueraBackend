/*
  Warnings:

  - You are about to drop the column `serieDocFinalId` on the `OrdenCompra` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrdenCompra" DROP CONSTRAINT "OrdenCompra_serieDocFinalId_fkey";

-- DropIndex
DROP INDEX "OrdenCompra_serieDocFinalId_idx";

-- AlterTable
ALTER TABLE "CuentaPorPagar" ADD COLUMN     "esGerencial" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "OrdenCompra" DROP COLUMN "serieDocFinalId",
ADD COLUMN     "esGerencial" BOOLEAN DEFAULT false,
ADD COLUMN     "esParticionada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "facturado" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaFacturacion" TIMESTAMP(3),
ADD COLUMN     "ordenCompraOrigenId" BIGINT;

-- CreateIndex
CREATE INDEX "CuentaPorPagar_esGerencial_idx" ON "CuentaPorPagar"("esGerencial");

-- CreateIndex
CREATE INDEX "OrdenCompra_facturado_idx" ON "OrdenCompra"("facturado");

-- CreateIndex
CREATE INDEX "OrdenCompra_esGerencial_idx" ON "OrdenCompra"("esGerencial");

-- CreateIndex
CREATE INDEX "OrdenCompra_ordenCompraOrigenId_idx" ON "OrdenCompra"("ordenCompraOrigenId");

-- CreateIndex
CREATE INDEX "OrdenCompra_esParticionada_idx" ON "OrdenCompra"("esParticionada");

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_ordenCompraOrigenId_fkey" FOREIGN KEY ("ordenCompraOrigenId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
