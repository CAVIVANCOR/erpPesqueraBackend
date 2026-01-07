/*
  Warnings:

  - You are about to drop the column `actualizadoEn` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `contabilizado` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `emailsEnviados` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `fechaContabilizacion` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `fechaTransfErpContable` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `numIdTransfErpContable` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `personaRespTransfErpContable` on the `PreFactura` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ComprobanteElectronico" DROP CONSTRAINT "ComprobanteElectronico_asientoContableId_fkey";

-- DropIndex
DROP INDEX "ComprobanteElectronico_contabilizado_idx";

-- DropIndex
DROP INDEX "ComprobanteElectronico_empresaId_fechaEmision_idx";

-- DropIndex
DROP INDEX "ComprobanteElectronico_nubefactAceptadoPorSunat_idx";

-- DropIndex
DROP INDEX "ComprobanteElectronico_serieDocId_numeroCorrelativo_key";

-- AlterTable
ALTER TABLE "ComprobanteElectronico" DROP COLUMN "actualizadoEn",
DROP COLUMN "asientoContableId",
DROP COLUMN "contabilizado",
DROP COLUMN "creadoEn",
DROP COLUMN "emailsEnviados",
DROP COLUMN "fechaContabilizacion",
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CuentaPorCobrar" ADD COLUMN     "comprobanteElectronicoId" BIGINT,
ADD COLUMN     "esGerencial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PreFactura" DROP COLUMN "fechaTransfErpContable",
DROP COLUMN "numIdTransfErpContable",
DROP COLUMN "personaRespTransfErpContable",
ADD COLUMN     "esGerencial" BOOLEAN DEFAULT false,
ADD COLUMN     "esParticionada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preFacturaOrigenId" BIGINT;

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_empresaId_idx" ON "ComprobanteElectronico"("empresaId");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_comprobanteModificaId_idx" ON "ComprobanteElectronico"("comprobanteModificaId");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_esGerencial_idx" ON "CuentaPorCobrar"("esGerencial");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_comprobanteElectronicoId_idx" ON "CuentaPorCobrar"("comprobanteElectronicoId");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_preFacturaId_idx" ON "CuentaPorCobrar"("preFacturaId");

-- CreateIndex
CREATE INDEX "PreFactura_esGerencial_idx" ON "PreFactura"("esGerencial");

-- CreateIndex
CREATE INDEX "PreFactura_preFacturaOrigenId_idx" ON "PreFactura"("preFacturaOrigenId");

-- CreateIndex
CREATE INDEX "PreFactura_esParticionada_idx" ON "PreFactura"("esParticionada");

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_preFacturaOrigenId_fkey" FOREIGN KEY ("preFacturaOrigenId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_comprobanteElectronicoId_fkey" FOREIGN KEY ("comprobanteElectronicoId") REFERENCES "ComprobanteElectronico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
