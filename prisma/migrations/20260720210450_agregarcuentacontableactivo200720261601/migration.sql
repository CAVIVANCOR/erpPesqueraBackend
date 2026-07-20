-- AlterTable
ALTER TABLE "Activo" ADD COLUMN     "cuentaContableId" BIGINT;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
