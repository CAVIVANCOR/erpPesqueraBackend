-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "esGerencial" BOOLEAN DEFAULT false,
ADD COLUMN     "tipoCambio" DECIMAL(18,6);
