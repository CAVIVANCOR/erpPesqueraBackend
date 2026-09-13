-- AlterTable
ALTER TABLE "PagoCuentaPorCobrar" ADD COLUMN     "urlPagoImpuesto" TEXT,
ADD COLUMN     "urlVoucherOperacionConsolidado" TEXT;

-- AlterTable
ALTER TABLE "PagoCuentaPorPagar" ADD COLUMN     "urlPagoImpuesto" TEXT,
ADD COLUMN     "urlVoucherOperacionConsolidado" TEXT;
