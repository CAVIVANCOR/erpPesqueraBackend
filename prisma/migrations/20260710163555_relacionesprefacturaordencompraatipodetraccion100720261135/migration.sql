-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_tipoDetraccionId_fkey" FOREIGN KEY ("tipoDetraccionId") REFERENCES "TipoDetraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_tipoDetraccionId_fkey" FOREIGN KEY ("tipoDetraccionId") REFERENCES "TipoDetraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
