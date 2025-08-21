/*
  Warnings:

  - Added the required column `estadoActivoId` to the `BolicheRed` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."BolicheRed" ADD COLUMN     "altoM" DECIMAL(65,30),
ADD COLUMN     "estadoActivoId" BIGINT NOT NULL,
ADD COLUMN     "largoContraido" DECIMAL(65,30),
ADD COLUMN     "largoExpandido" DECIMAL(65,30),
ADD COLUMN     "nroFlotadores" INTEGER,
ADD COLUMN     "nroPlomos" INTEGER;
