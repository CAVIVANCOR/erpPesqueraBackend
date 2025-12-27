-- AlterTable
ALTER TABLE "CuentaCorriente" ADD COLUMN     "cuentaContableId" BIGINT;

-- CreateIndex
CREATE INDEX "CuentaCorriente_cuentaContableId_idx" ON "CuentaCorriente"("cuentaContableId");

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
