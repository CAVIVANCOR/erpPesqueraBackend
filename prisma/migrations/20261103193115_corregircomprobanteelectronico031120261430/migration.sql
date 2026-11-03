/*
  Warnings:

  - You are about to drop the column `nubefactAceptadoPorSunat` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactCadenaParaQr` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactEnlaceCDR` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactEnlacePDF` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactEnlaceXML` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactHashCpe` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactQr` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactRuta` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactSunatDescription` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactSunatNote` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactSunatResponsecode` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactSunatSoapError` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactSunatTransaction` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactToken` on the `ComprobanteElectronico` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactToken` on the `Empresa` table. All the data in the column will be lost.
  - You are about to drop the column `nubefactUrl` on the `Empresa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ComprobanteElectronico" DROP COLUMN "nubefactAceptadoPorSunat",
DROP COLUMN "nubefactCadenaParaQr",
DROP COLUMN "nubefactEnlaceCDR",
DROP COLUMN "nubefactEnlacePDF",
DROP COLUMN "nubefactEnlaceXML",
DROP COLUMN "nubefactHashCpe",
DROP COLUMN "nubefactQr",
DROP COLUMN "nubefactRuta",
DROP COLUMN "nubefactSunatDescription",
DROP COLUMN "nubefactSunatNote",
DROP COLUMN "nubefactSunatResponsecode",
DROP COLUMN "nubefactSunatSoapError",
DROP COLUMN "nubefactSunatTransaction",
DROP COLUMN "nubefactToken",
ADD COLUMN     "aceptadoPorSunat" BOOLEAN,
ADD COLUMN     "codigoEstadoProveedor" VARCHAR(10),
ADD COLUMN     "descripcionEstadoProveedor" TEXT,
ADD COLUMN     "enlaceCDR" VARCHAR(500),
ADD COLUMN     "enlacePDF" VARCHAR(500),
ADD COLUMN     "enlaceXML" VARCHAR(500),
ADD COLUMN     "errorEnvio" TEXT,
ADD COLUMN     "eventosProveedor" TEXT,
ADD COLUMN     "hashCpe" VARCHAR(100),
ADD COLUMN     "qrBase64" TEXT,
ADD COLUMN     "totalComprobante" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalDescuentos" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalExonerado" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalGratuito" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalGravado" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalIgv" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalInafecto" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalIsc" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Empresa" DROP COLUMN "nubefactToken",
DROP COLUMN "nubefactUrl",
ADD COLUMN     "facturacionElectronicaToken" TEXT,
ADD COLUMN     "facturacionElectronicaUrl" TEXT;

-- AlterTable
ALTER TABLE "EnvioOSE" ADD COLUMN     "tipoAccion" VARCHAR(20) NOT NULL DEFAULT 'EMISION';

-- CreateIndex
CREATE INDEX "EnvioOSE_tipoAccion_idx" ON "EnvioOSE"("tipoAccion");
