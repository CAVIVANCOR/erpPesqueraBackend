-- AlterTable
ALTER TABLE "public"."AccionesPreviasFaena" ADD COLUMN     "paraPescaConsumo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paraPescaIndustrial" BOOLEAN NOT NULL DEFAULT false;
