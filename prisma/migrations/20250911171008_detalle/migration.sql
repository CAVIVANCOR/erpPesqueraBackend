-- AlterTable
ALTER TABLE "public"."DocumentacionEmbarcacion" ADD COLUMN     "cesado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."DocumentacionPersonal" ADD COLUMN     "cesado" BOOLEAN NOT NULL DEFAULT false;
