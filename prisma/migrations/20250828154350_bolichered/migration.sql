-- AlterTable
ALTER TABLE "public"."BolicheRed" ADD COLUMN     "paraPescaConsumo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paraPescaIndustrial" BOOLEAN NOT NULL DEFAULT false;
