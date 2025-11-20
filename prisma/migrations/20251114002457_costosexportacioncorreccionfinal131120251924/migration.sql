-- AlterTable
ALTER TABLE "CostoExportacionPorIncoterm" ADD COLUMN     "documentoAsociadoId" BIGINT,
ADD COLUMN     "requiereDocumento" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" ADD CONSTRAINT "CostoExportacionPorIncoterm_documentoAsociadoId_fkey" FOREIGN KEY ("documentoAsociadoId") REFERENCES "DocRequeridaVentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostosExportacionCotizacion" ADD CONSTRAINT "CostosExportacionCotizacion_documentoAsociadoId_fkey" FOREIGN KEY ("documentoAsociadoId") REFERENCES "DocRequeridaVentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
