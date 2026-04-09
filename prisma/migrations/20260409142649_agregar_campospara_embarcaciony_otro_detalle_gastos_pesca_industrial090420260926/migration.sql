-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "embarcacionId" BIGINT,
ADD COLUMN     "enlaceAOtroDetalleGastoId" BIGINT;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
