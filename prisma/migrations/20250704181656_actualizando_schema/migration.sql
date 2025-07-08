-- AlterTable
ALTER TABLE "DetalleMovimientoAlmacen" ADD COLUMN     "detalleReqCompraId" BIGINT;

-- AlterTable
ALTER TABLE "DetalleReqCompra" ADD COLUMN     "cantidadAComprar" DECIMAL(65,30),
ADD COLUMN     "cantidadDesdeAlmacen" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "movIngresoAlmacenId" BIGINT,
ADD COLUMN     "urlOrdenCompraPdf" TEXT;

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_detalleReqCompraId_fkey" FOREIGN KEY ("detalleReqCompraId") REFERENCES "DetalleReqCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
