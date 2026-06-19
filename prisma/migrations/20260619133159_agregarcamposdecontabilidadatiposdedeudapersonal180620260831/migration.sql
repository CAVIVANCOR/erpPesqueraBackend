-- AlterTable
ALTER TABLE "TipoDeudaPersonal" ADD COLUMN     "cuentaContableId" BIGINT,
ADD COLUMN     "periodicidad" "FrecuenciaPago";

-- CreateIndex
CREATE INDEX "TipoDeudaPersonal_cuentaContableId_idx" ON "TipoDeudaPersonal"("cuentaContableId");

-- CreateIndex
CREATE INDEX "TipoDeudaPersonal_periodicidad_idx" ON "TipoDeudaPersonal"("periodicidad");

-- AddForeignKey
ALTER TABLE "TipoDeudaPersonal" ADD CONSTRAINT "TipoDeudaPersonal_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
