-- AlterTable
ALTER TABLE "CentroCosto" ADD COLUMN     "cuentaContableId" BIGINT;

-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "centroCostoId" BIGINT;

-- CreateIndex
CREATE INDEX "CentroCosto_cuentaContableId_idx" ON "CentroCosto"("cuentaContableId");

-- CreateIndex
CREATE INDEX "Personal_centroCostoId_idx" ON "Personal"("centroCostoId");

-- AddForeignKey
ALTER TABLE "CentroCosto" ADD CONSTRAINT "CentroCosto_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
