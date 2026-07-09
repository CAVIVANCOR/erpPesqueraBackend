/*
  Warnings:

  - You are about to drop the `DesembolsoPrestamo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AsientoContableToDesembolsoPrestamo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DesembolsoPrestamo" DROP CONSTRAINT "DesembolsoPrestamo_creadoPor_fkey";

-- DropForeignKey
ALTER TABLE "DesembolsoPrestamo" DROP CONSTRAINT "DesembolsoPrestamo_movimientoCajaId_fkey";

-- DropForeignKey
ALTER TABLE "DesembolsoPrestamo" DROP CONSTRAINT "DesembolsoPrestamo_prestamoBancarioId_fkey";

-- DropForeignKey
ALTER TABLE "_AsientoContableToDesembolsoPrestamo" DROP CONSTRAINT "_AsientoContableToDesembolsoPrestamo_A_fkey";

-- DropForeignKey
ALTER TABLE "_AsientoContableToDesembolsoPrestamo" DROP CONSTRAINT "_AsientoContableToDesembolsoPrestamo_B_fkey";

-- DropTable
DROP TABLE "DesembolsoPrestamo";

-- DropTable
DROP TABLE "_AsientoContableToDesembolsoPrestamo";
