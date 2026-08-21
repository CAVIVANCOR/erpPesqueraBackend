-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "empresaId" BIGINT;

-- CreateIndex
CREATE INDEX "MovimientoCaja_empresaId_idx" ON "MovimientoCaja"("empresaId");

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
