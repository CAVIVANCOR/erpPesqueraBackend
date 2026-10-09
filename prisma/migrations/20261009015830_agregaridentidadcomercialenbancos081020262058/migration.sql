-- AlterTable
ALTER TABLE "Banco" ADD COLUMN     "enlaceEntidadComercialId" BIGINT;

-- CreateIndex
CREATE INDEX "Banco_enlaceEntidadComercialId_idx" ON "Banco"("enlaceEntidadComercialId");

-- AddForeignKey
ALTER TABLE "Banco" ADD CONSTRAINT "Banco_enlaceEntidadComercialId_fkey" FOREIGN KEY ("enlaceEntidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
