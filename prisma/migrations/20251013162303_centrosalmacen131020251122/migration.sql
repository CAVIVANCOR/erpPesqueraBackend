/*
  Warnings:

  - Added the required column `empresaId` to the `CentrosAlmacen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CentrosAlmacen" ADD COLUMN     "empresaId" BIGINT NOT NULL;
