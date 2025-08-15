/*
  Warnings:

  - You are about to drop the `Procedencia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Producto" DROP CONSTRAINT "Producto_procedenciaId_fkey";

-- DropTable
DROP TABLE "public"."Procedencia";
