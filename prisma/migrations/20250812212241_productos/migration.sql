/*
  Warnings:

  - You are about to alter the column `descripcionExtendida` on the `Producto` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(120)`.

*/
-- AlterTable
ALTER TABLE "public"."Producto" ALTER COLUMN "descripcionExtendida" SET DATA TYPE VARCHAR(120);
