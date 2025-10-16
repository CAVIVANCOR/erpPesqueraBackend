/*
  Warnings:

  - You are about to drop the column `custodia` on the `DetalleMovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `paletaAlmacenId` on the `DetalleMovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacionDestinoId` on the `DetalleMovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacionOrigenId` on the `DetalleMovimientoAlmacen` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DetalleMovimientoAlmacen" DROP COLUMN "custodia",
DROP COLUMN "paletaAlmacenId",
DROP COLUMN "ubicacionDestinoId",
DROP COLUMN "ubicacionOrigenId",
ADD COLUMN     "esCustodia" BOOLEAN NOT NULL DEFAULT false;
