-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "enlaceGastosPlanificadosId" BIGINT;

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_enlaceGastosPlanificadosId_idx" ON "DetMovsEntregaRendir"("enlaceGastosPlanificadosId");

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_enlaceGastosPlanificadosId_fkey" FOREIGN KEY ("enlaceGastosPlanificadosId") REFERENCES "DetGastosPlanificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
