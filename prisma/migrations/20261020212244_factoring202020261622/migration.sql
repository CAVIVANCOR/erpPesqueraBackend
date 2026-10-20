-- AlterTable
ALTER TABLE "PagoCuentaPorCobrar" ADD COLUMN     "prestamoBancarioId" BIGINT;

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_prestamoBancarioId_idx" ON "PagoCuentaPorCobrar"("prestamoBancarioId");

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_prestamoBancarioId_fkey" FOREIGN KEY ("prestamoBancarioId") REFERENCES "PrestamoBancario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
