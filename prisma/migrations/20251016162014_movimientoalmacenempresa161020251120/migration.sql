-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
