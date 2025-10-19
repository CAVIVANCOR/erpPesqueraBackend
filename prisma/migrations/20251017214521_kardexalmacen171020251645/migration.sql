/*
  Warnings:

  - Added the required column `numDocCompleto` to the `KardexAlmacen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KardexAlmacen" ADD COLUMN     "numDocCompleto" TEXT NOT NULL;
