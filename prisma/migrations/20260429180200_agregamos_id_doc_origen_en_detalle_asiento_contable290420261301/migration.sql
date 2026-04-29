-- AlterTable
ALTER TABLE "DetalleAsientoContable" ADD COLUMN     "documentoOrigenId" BIGINT;

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_documentoOrigenId_idx" ON "DetalleAsientoContable"("documentoOrigenId");

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_documentoOrigenId_fkey" FOREIGN KEY ("documentoOrigenId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;
