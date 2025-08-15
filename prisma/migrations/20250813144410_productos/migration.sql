/*
  Warnings:

  - Made the column `codigo` on table `TipoMaterial` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."TipoMaterial" ALTER COLUMN "codigo" SET NOT NULL;
