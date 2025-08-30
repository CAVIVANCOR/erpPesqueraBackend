/*
  Warnings:

  - Added the required column `nombreCientifico` to the `Especie` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Especie" ADD COLUMN     "nombreCientifico" VARCHAR(100) NOT NULL;
