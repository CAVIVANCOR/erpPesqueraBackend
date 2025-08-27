/*
  Warnings:

  - You are about to drop the column `urlDocEmbarcacio` on the `DetalleDocEmbarcacion` table. All the data in the column will be lost.
  - You are about to drop the `Especie` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DocumentacionEmbarcacion" DROP CONSTRAINT "DocumentacionEmbarcacion_documentoPescaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentacionPersonal" DROP CONSTRAINT "DocumentacionPersonal_documentoPescaId_fkey";

-- AlterTable
ALTER TABLE "public"."DetalleDocEmbarcacion" DROP COLUMN "urlDocEmbarcacio",
ADD COLUMN     "urlDocEmbarcacion" TEXT;

-- DropTable
DROP TABLE "public"."Especie";
