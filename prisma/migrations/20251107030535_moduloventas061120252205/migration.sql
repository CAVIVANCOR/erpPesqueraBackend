-- AlterTable
ALTER TABLE "CotizacionVentas" ADD COLUMN     "numCorreDoc" VARCHAR(40),
ADD COLUMN     "numSerieDoc" VARCHAR(40);

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "numCorreDoc" VARCHAR(40),
ADD COLUMN     "numSerieDoc" VARCHAR(40);
