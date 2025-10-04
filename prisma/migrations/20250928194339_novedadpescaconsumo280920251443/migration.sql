/*
  Warnings:

  - Added the required column `estadoNovedadPescaConsumoId` to the `NovedadPescaConsumo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."NovedadPescaConsumo" ADD COLUMN     "estadoNovedadPescaConsumoId" BIGINT NOT NULL,
ADD COLUMN     "novedadPescaConsumoIniciada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "toneladasCapturadas" DECIMAL(65,30);
