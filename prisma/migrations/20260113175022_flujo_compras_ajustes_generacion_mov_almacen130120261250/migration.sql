-- AlterTable
ALTER TABLE "DescargaFaenaConsumo" ADD COLUMN     "movSalidaAlmacenId" BIGINT;

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ADD COLUMN     "movSalidaAlmacenId" BIGINT;

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_movSalidaAlmacenId_idx" ON "DescargaFaenaConsumo"("movSalidaAlmacenId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_movSalidaAlmacenId_idx" ON "DescargaFaenaPesca"("movSalidaAlmacenId");

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_movSalidaAlmacenId_fkey" FOREIGN KEY ("movSalidaAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_movSalidaAlmacenId_fkey" FOREIGN KEY ("movSalidaAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
