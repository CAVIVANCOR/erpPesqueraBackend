/*
  Warnings:

  - You are about to alter the column `costoUnitario` on the `DetalleMovimientoAlmacen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,4)`.

*/
-- AlterTable
ALTER TABLE "DetalleMovimientoAlmacen" ALTER COLUMN "costoUnitario" SET DATA TYPE DECIMAL(18,4);
