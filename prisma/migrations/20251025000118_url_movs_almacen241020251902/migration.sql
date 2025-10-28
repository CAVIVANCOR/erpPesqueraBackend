/*
  Warnings:

  - You are about to drop the column `urlMovimientoConCostosPDF` on the `MovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `urlMovimientosinCostosPDF` on the `MovimientoAlmacen` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MovimientoAlmacen" DROP COLUMN "urlMovimientoConCostosPDF",
DROP COLUMN "urlMovimientosinCostosPDF",
ADD COLUMN     "urlMovAlmacenConCostosPdf" TEXT,
ADD COLUMN     "urlMovAlmacenPdf" TEXT;
