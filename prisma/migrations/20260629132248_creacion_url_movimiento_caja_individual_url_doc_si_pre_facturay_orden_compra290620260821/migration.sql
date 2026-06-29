-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "urlOperacionIndividualOperacionCaja" TEXT;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "urlDocumentoRef" VARCHAR(500);

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "urlDocumentoRef" VARCHAR(500);
