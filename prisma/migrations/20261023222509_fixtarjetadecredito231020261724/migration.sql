-- AlterTable
ALTER TABLE "CuentaCorriente" ADD COLUMN     "diaCierre" INTEGER,
ADD COLUMN     "diaPago" INTEGER,
ADD COLUMN     "limiteCredito" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "TipoCuentaCorriente" ADD COLUMN     "esTarjetaCredito" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TipoPrestamo" ADD COLUMN     "esTarjetaCredito" BOOLEAN NOT NULL DEFAULT false;
