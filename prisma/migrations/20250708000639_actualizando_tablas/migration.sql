-- AddForeignKey
ALTER TABLE "DetCotizacionVentas" ADD CONSTRAINT "DetCotizacionVentas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
