/*
  Warnings:

  - You are about to drop the column `entregaARendirId` on the `DetMovsEntregaRendir` table. All the data in the column will be lost.
  - You are about to drop the `EntregaARendir` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DetMovsEntregaRendir" DROP CONSTRAINT "DetMovsEntregaRendir_entregaARendirId_fkey";

-- DropForeignKey
ALTER TABLE "EntregaARendir" DROP CONSTRAINT "EntregaARendir_centroCostoId_fkey";

-- DropForeignKey
ALTER TABLE "EntregaARendir" DROP CONSTRAINT "EntregaARendir_respEntregaRendirId_fkey";

-- DropForeignKey
ALTER TABLE "EntregaARendir" DROP CONSTRAINT "EntregaARendir_respLiquidacionId_fkey";

-- DropForeignKey
ALTER TABLE "EntregaARendir" DROP CONSTRAINT "EntregaARendir_temporadaPescaId_fkey";

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" DROP COLUMN "entregaARendirId",
ADD COLUMN     "actualizadoPorId" BIGINT,
ADD COLUMN     "creadoPorId" BIGINT,
ADD COLUMN     "documentoOrigenId" BIGINT NOT NULL DEFAULT 37,
ADD COLUMN     "empresaId" BIGINT NOT NULL DEFAULT 1,
ADD COLUMN     "moduloOrigenId" BIGINT NOT NULL DEFAULT 2;

-- DropTable
DROP TABLE "EntregaARendir";

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_empresaId_idx" ON "DetMovsEntregaRendir"("empresaId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_moduloOrigenId_idx" ON "DetMovsEntregaRendir"("moduloOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_documentoOrigenId_idx" ON "DetMovsEntregaRendir"("documentoOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_responsableId_idx" ON "DetMovsEntregaRendir"("responsableId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_fechaMovimiento_idx" ON "DetMovsEntregaRendir"("fechaMovimiento");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_creadoPorId_idx" ON "DetMovsEntregaRendir"("creadoPorId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_actualizadoPorId_idx" ON "DetMovsEntregaRendir"("actualizadoPorId");

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_moduloOrigenId_fkey" FOREIGN KEY ("moduloOrigenId") REFERENCES "ModuloSistema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
