-- AlterTable
ALTER TABLE "DetalleMovimientoAlmacen" ADD COLUMN     "cantidadComercial" DECIMAL(18,4),
ADD COLUMN     "costoComercial" DECIMAL(18,4),
ALTER COLUMN "lote" SET DATA TYPE VARCHAR(80);
