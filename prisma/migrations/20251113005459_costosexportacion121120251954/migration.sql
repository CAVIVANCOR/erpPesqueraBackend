/*
  Warnings:

  - You are about to drop the column `concepto` on the `CostosExportacionCotizacion` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `CostosExportacionCotizacion` table. All the data in the column will be lost.
  - You are about to drop the column `responsableSegunIncoterm` on the `CostosExportacionCotizacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CostosExportacionCotizacion" DROP COLUMN "concepto",
DROP COLUMN "descripcion",
DROP COLUMN "responsableSegunIncoterm";
