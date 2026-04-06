-- AlterTable
ALTER TABLE "PagoCuentaPorPagar" ADD COLUMN     "prestamoBancarioId" BIGINT;

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_prestamoBancarioId_idx" ON "PagoCuentaPorPagar"("prestamoBancarioId");

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_prestamoBancarioId_fkey" FOREIGN KEY ("prestamoBancarioId") REFERENCES "PrestamoBancario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
