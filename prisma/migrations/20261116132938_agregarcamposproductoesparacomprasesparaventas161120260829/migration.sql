-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "esParaCompras" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esParaVentas" BOOLEAN NOT NULL DEFAULT false;
