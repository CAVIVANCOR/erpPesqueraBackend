/*
  Warnings:

  - You are about to drop the column `codigoCuenta` on the `DetalleAsientoContable` table. All the data in the column will be lost.
  - You are about to drop the column `nombreCuenta` on the `DetalleAsientoContable` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DetalleAsientoContable_codigoCuenta_idx";

-- AlterTable
ALTER TABLE "DetalleAsientoContable" DROP COLUMN "codigoCuenta",
DROP COLUMN "nombreCuenta";
