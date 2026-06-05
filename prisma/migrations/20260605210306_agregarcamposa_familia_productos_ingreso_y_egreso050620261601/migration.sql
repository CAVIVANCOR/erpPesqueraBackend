-- AlterTable
ALTER TABLE "FamiliaProducto" ADD COLUMN     "esParaEgresos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esParaIngresos" BOOLEAN NOT NULL DEFAULT false;
