/*
  Warnings:

  - You are about to alter the column `monto` on the `DetMovsEntregaRendirMovAlmacen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,4)`.
  - You are about to alter the column `numeroSerieComprobante` on the `DetMovsEntregaRendirMovAlmacen` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `numeroCorrelativoComprobante` on the `DetMovsEntregaRendirMovAlmacen` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `urlComprobanteMovimiento` on the `DetMovsEntregaRendirMovAlmacen` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `urlComprobanteOperacionMovCaja` on the `DetMovsEntregaRendirMovAlmacen` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `urlLiquidacionPdf` on the `EntregaARendirMovAlmacen` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.

*/
-- AlterTable
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "numeroSerieComprobante" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "numeroCorrelativoComprobante" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "urlComprobanteMovimiento" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "urlComprobanteOperacionMovCaja" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "EntregaARendirMovAlmacen" ALTER COLUMN "urlLiquidacionPdf" SET DATA TYPE VARCHAR(500);

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirMovAlmacen_entregaARendirMovAlmacenId_idx" ON "DetMovsEntregaRendirMovAlmacen"("entregaARendirMovAlmacenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirMovAlmacen_tipoMovimientoId_idx" ON "DetMovsEntregaRendirMovAlmacen"("tipoMovimientoId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirMovAlmacen_responsableId_idx" ON "DetMovsEntregaRendirMovAlmacen"("responsableId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirMovAlmacen_fechaMovimiento_idx" ON "DetMovsEntregaRendirMovAlmacen"("fechaMovimiento");

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
