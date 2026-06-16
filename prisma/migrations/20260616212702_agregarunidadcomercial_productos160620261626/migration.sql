-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "unidadMedidaComercialId" BIGINT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_unidadMedidaComercialId_fkey" FOREIGN KEY ("unidadMedidaComercialId") REFERENCES "UnidadMedida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
