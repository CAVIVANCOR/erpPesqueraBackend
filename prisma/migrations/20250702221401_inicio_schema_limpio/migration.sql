/*
  Warnings:

  - You are about to drop the column `autorizacionZarpePdf` on the `TemporadaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `TemporadaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `TemporadaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `resolucion` on the `TemporadaPesca` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DetalleDocEmbarcacion" DROP CONSTRAINT "DetalleDocEmbarcacion_documentoPescaId_fkey";

-- AlterTable
ALTER TABLE "TemporadaPesca" DROP COLUMN "autorizacionZarpePdf",
DROP COLUMN "estado",
DROP COLUMN "observaciones",
DROP COLUMN "resolucion",
ADD COLUMN     "numeroResolucion" TEXT;
