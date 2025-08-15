-- AlterTable
ALTER TABLE "public"."Producto" ADD COLUMN     "aplicaColor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaFamilia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaMarca" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaProcedencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaSubfamilia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaTipoAlmacenamiento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaTipoMaterial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaUnidadMedida" BOOLEAN NOT NULL DEFAULT false;
