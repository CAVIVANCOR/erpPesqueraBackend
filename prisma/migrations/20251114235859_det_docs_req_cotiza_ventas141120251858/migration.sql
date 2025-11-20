-- AddForeignKey
ALTER TABLE "DetDocsReqCotizaVentas" ADD CONSTRAINT "DetDocsReqCotizaVentas_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
