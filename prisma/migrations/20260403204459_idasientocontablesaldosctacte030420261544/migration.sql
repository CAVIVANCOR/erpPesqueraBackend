-- AlterTable
ALTER TABLE "SaldoCuentaCorriente" ADD COLUMN     "asientoContableId" BIGINT;

-- AddForeignKey
ALTER TABLE "SaldoCuentaCorriente" ADD CONSTRAINT "SaldoCuentaCorriente_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
