/*
  Warnings:

  - You are about to drop the column `custodia` on the `MovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `liquidacionViajeId` on the `MovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `refEmbarcacionMatricula` on the `MovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `refEmbarcacionNombre` on the `MovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `refEmbarcacionNroPlaca` on the `MovimientoAlmacen` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MovimientoAlmacen" DROP COLUMN "custodia",
DROP COLUMN "liquidacionViajeId",
DROP COLUMN "refEmbarcacionMatricula",
DROP COLUMN "refEmbarcacionNombre",
DROP COLUMN "refEmbarcacionNroPlaca",
ADD COLUMN     "esCustodia" BOOLEAN NOT NULL DEFAULT false;
