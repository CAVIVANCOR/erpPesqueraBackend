-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TiposDocIdentidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
