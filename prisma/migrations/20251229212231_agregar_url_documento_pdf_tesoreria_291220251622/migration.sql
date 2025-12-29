/*
  Warnings:

  - You are about to drop the `CronogramaPrestamo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CronogramaPrestamo" DROP CONSTRAINT "CronogramaPrestamo_prestamoBancarioId_fkey";

-- AlterTable
ALTER TABLE "GarantiaPrestamo" ADD COLUMN     "urlDocumentoPDF" VARCHAR(500);

-- AlterTable
ALTER TABLE "InversionFinanciera" ADD COLUMN     "urlDocumentoPDF" VARCHAR(500);

-- AlterTable
ALTER TABLE "LineaCredito" ADD COLUMN     "urlDocumentoPDF" VARCHAR(500);

-- AlterTable
ALTER TABLE "MovimientoInversion" ADD COLUMN     "urlDocumentoPDF" VARCHAR(500);

-- AlterTable
ALTER TABLE "PrestamoBancario" ADD COLUMN     "urlDocAdicionalPDF" VARCHAR(500),
ADD COLUMN     "urlDocumentoPDF" VARCHAR(500);

-- DropTable
DROP TABLE "CronogramaPrestamo";
