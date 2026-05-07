-- AlterTable
ALTER TABLE "DetalleAsientoContable" ADD COLUMN     "activoId" BIGINT;

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_activoId_idx" ON "DetalleAsientoContable"("activoId");

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
