-- AlterTable
ALTER TABLE "public"."EntidadComercial" ADD COLUMN     "condicionHabidoSUNAT" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "estadoActivoSUNAT" BOOLEAN NOT NULL DEFAULT true;
