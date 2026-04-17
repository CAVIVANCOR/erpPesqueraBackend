-- AlterTable
ALTER TABLE "DescargaFaenaConsumo" ADD COLUMN     "plataformaRecepcionPescaId" BIGINT;

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ADD COLUMN     "plataformaRecepcionPescaId" BIGINT;

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_plataformaRecepcionPescaId_idx" ON "DescargaFaenaConsumo"("plataformaRecepcionPescaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_plataformaRecepcionPescaId_idx" ON "DescargaFaenaPesca"("plataformaRecepcionPescaId");

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_plataformaRecepcionPescaId_fkey" FOREIGN KEY ("plataformaRecepcionPescaId") REFERENCES "DetPlataformaRecepcionPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_plataformaRecepcionPescaId_fkey" FOREIGN KEY ("plataformaRecepcionPescaId") REFERENCES "DetPlataformaRecepcionPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
