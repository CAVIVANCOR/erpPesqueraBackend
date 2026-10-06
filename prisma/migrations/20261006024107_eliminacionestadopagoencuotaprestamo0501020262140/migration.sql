/*
  Warnings:

  - You are about to drop the column `estadoPago` on the `CuotaPrestamo` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CuotaPrestamo_estadoPago_idx";

-- AlterTable
ALTER TABLE "CuotaPrestamo" DROP COLUMN "estadoPago";

-- DropEnum
DROP TYPE "EstadoPagoCuota";
