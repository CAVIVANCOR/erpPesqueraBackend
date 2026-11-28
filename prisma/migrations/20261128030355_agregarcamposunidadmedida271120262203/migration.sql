-- AlterTable
ALTER TABLE "UnidadMedida" ADD COLUMN     "esParaPresentacion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "esParaUnidadMedidaComercial" BOOLEAN NOT NULL DEFAULT true;
