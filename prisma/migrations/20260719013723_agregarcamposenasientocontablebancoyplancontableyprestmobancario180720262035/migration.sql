-- AlterTable
ALTER TABLE "AsientoContable" ADD COLUMN     "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Banco" ADD COLUMN     "cuentaContableId" BIGINT;

-- AlterTable
ALTER TABLE "PrestamoBancario" ADD COLUMN     "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaContable" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Banco" ADD CONSTRAINT "Banco_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
