-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "tipoDetraccionId" BIGINT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tipoDetraccionId_fkey" FOREIGN KEY ("tipoDetraccionId") REFERENCES "TipoDetraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
