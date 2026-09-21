-- AlterTable
ALTER TABLE "PagoCuentaPorPagar" ADD COLUMN     "detraccionId" BIGINT;

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_detraccionId_idx" ON "PagoCuentaPorPagar"("detraccionId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_refOperacionEspecializadaMovCaja_idx" ON "PagoCuentaPorPagar"("refOperacionEspecializadaMovCaja");

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_detraccionId_fkey" FOREIGN KEY ("detraccionId") REFERENCES "Detraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
