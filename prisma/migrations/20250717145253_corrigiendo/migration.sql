/*
  Warnings:

  - You are about to drop the column `rutaArchivosAdjuntos` on the `Empresa` table. All the data in the column will be lost.
  - You are about to drop the column `rutaReportesGenerados` on the `Empresa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Empresa" DROP COLUMN "rutaArchivosAdjuntos",
DROP COLUMN "rutaReportesGenerados";
