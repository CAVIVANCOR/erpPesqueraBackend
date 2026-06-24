-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "esTransferencia" BOOLEAN DEFAULT false,
ADD COLUMN     "movimientoRelacionadoId" BIGINT;

-- CreateIndex
CREATE INDEX "MovimientoCaja_esTransferencia_idx" ON "MovimientoCaja"("esTransferencia");

-- CreateIndex
CREATE INDEX "MovimientoCaja_movimientoRelacionadoId_idx" ON "MovimientoCaja"("movimientoRelacionadoId");

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_movimientoRelacionadoId_fkey" FOREIGN KEY ("movimientoRelacionadoId") REFERENCES "MovimientoCaja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
