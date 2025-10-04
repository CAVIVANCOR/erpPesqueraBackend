/*
  Warnings:

  - You are about to drop the column `urlDocEmbarcacio` on the `DetDocEmbarcacionPescaConsumo` table. All the data in the column will be lost.
  - Added the required column `novedadPescaConsumoId` to the `CalaFaenaConsumo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CalaFaenaConsumo" ADD COLUMN     "novedadPescaConsumoId" BIGINT NOT NULL,
ALTER COLUMN "fechaHoraInicio" DROP NOT NULL,
ALTER COLUMN "fechaHoraFin" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DetDocEmbarcacionPescaConsumo" DROP COLUMN "urlDocEmbarcacio",
ADD COLUMN     "docVencido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urlDocEmbarcacion" TEXT;
