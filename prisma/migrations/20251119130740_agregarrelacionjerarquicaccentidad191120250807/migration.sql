-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cuentaDestinoEntidadComercialId_fkey" FOREIGN KEY ("cuentaDestinoEntidadComercialId") REFERENCES "CtaCteEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
