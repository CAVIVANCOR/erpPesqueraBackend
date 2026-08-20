-- AlterTable
ALTER TABLE "PlanCuentasContable" ADD COLUMN     "centroCostoId" BIGINT;

-- AlterTable
ALTER TABLE "TipoMovEntregaRendir" ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100);

-- AddForeignKey
ALTER TABLE "PlanCuentasContable" ADD CONSTRAINT "PlanCuentasContable_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
