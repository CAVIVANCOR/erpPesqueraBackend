-- AlterTable
ALTER TABLE "TipoDocumento" ADD COLUMN     "esParaAlmacen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esParaCompras" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esParaVentas" BOOLEAN NOT NULL DEFAULT false;
