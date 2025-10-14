/*
  Warnings:

  - You are about to drop the column `enlacePescaConsumoProductoMateriaPrimaId` on the `Especie` table. All the data in the column will be lost.
  - You are about to drop the column `enlacePescaIndustrialProductoMateriaPrimaId` on the `Especie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Especie" DROP COLUMN "enlacePescaConsumoProductoMateriaPrimaId",
DROP COLUMN "enlacePescaIndustrialProductoMateriaPrimaId";

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "especieId" BIGINT;
