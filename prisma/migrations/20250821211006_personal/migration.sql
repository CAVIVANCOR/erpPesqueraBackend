-- AlterTable
ALTER TABLE "public"."DocumentoPesca" ADD COLUMN     "paraEmbarcacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paraOperacionFaena" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paraTripulantes" BOOLEAN NOT NULL DEFAULT false;
