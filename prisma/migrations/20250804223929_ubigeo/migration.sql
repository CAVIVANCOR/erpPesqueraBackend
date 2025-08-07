/*
  Warnings:

  - You are about to drop the column `gentilicio` on the `Pais` table. All the data in the column will be lost.
  - You are about to drop the column `distritoId` on the `Ubigeo` table. All the data in the column will be lost.
  - You are about to drop the `Distrito` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Distrito" DROP CONSTRAINT "Distrito_provinciaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ubigeo" DROP CONSTRAINT "Ubigeo_distritoId_fkey";

-- AlterTable
ALTER TABLE "public"."Pais" DROP COLUMN "gentilicio";

-- AlterTable
ALTER TABLE "public"."Personal" ADD COLUMN     "esVendedor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Ubigeo" DROP COLUMN "distritoId";

-- DropTable
DROP TABLE "public"."Distrito";
