/*
  Warnings:

  - You are about to drop the column `alto` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `ancho` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `angulo` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `diametro` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `espesor` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `largo` on the `Producto` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Producto" DROP COLUMN "alto",
DROP COLUMN "ancho",
DROP COLUMN "angulo",
DROP COLUMN "diametro",
DROP COLUMN "espesor",
DROP COLUMN "largo",
ADD COLUMN     "medidaAlto" VARCHAR(20),
ADD COLUMN     "medidaAncho" VARCHAR(20),
ADD COLUMN     "medidaAngulo" VARCHAR(20),
ADD COLUMN     "medidaDiametro" VARCHAR(20),
ADD COLUMN     "medidaEspesor" VARCHAR(20),
ADD COLUMN     "medidaLargo" VARCHAR(20);
