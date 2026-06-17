-- AlterTable
ALTER TABLE "DeudaConPersonal" ADD COLUMN     "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoPagadoAnterior" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DeudaTributaria" ADD COLUMN     "montoPagadoAnterior" DECIMAL(18,2) NOT NULL DEFAULT 0;
