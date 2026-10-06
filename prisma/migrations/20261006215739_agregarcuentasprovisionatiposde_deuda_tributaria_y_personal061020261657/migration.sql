-- AlterTable
ALTER TABLE "TipoDeudaPersonal" ADD COLUMN     "cuentaProvisionId" BIGINT;

-- AlterTable
ALTER TABLE "TipoDeudaTributaria" ADD COLUMN     "cuentaProvisionId" BIGINT;

-- CreateIndex
CREATE INDEX "TipoDeudaPersonal_cuentaProvisionId_idx" ON "TipoDeudaPersonal"("cuentaProvisionId");

-- CreateIndex
CREATE INDEX "TipoDeudaTributaria_cuentaProvisionId_idx" ON "TipoDeudaTributaria"("cuentaProvisionId");

-- AddForeignKey
ALTER TABLE "TipoDeudaPersonal" ADD CONSTRAINT "TipoDeudaPersonal_cuentaProvisionId_fkey" FOREIGN KEY ("cuentaProvisionId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoDeudaTributaria" ADD CONSTRAINT "TipoDeudaTributaria_cuentaProvisionId_fkey" FOREIGN KEY ("cuentaProvisionId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
