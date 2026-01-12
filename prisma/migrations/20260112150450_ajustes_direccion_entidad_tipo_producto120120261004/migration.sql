-- AlterTable
ALTER TABLE "DireccionEntidad" ADD COLUMN     "conceptoAlmacenCompraId" BIGINT,
ADD COLUMN     "conceptoAlmacenVentaId" BIGINT,
ADD COLUMN     "condicionesEntregaAlmacen" TEXT,
ADD COLUMN     "condicionesRecepcionAlmacen" TEXT,
ADD COLUMN     "esAlmacenExterno" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TipoProducto" ADD COLUMN     "especificacionesCompra" TEXT,
ADD COLUMN     "especificacionesVenta" TEXT,
ADD COLUMN     "validezOfertaCompra" TEXT,
ADD COLUMN     "validezOfertaVenta" TEXT;
