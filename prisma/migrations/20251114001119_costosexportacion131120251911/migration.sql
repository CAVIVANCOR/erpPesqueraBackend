-- DropForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" DROP CONSTRAINT "CostoExportacionPorIncoterm_incotermId_fkey";

-- DropForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" DROP CONSTRAINT "CostoExportacionPorIncoterm_productoId_fkey";

-- AlterTable
ALTER TABLE "CostoExportacionPorIncoterm" ADD COLUMN     "monedaDefaultId" BIGINT,
ADD COLUMN     "proveedorDefaultId" BIGINT,
ADD COLUMN     "valorVentaDefault" DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" ADD CONSTRAINT "CostoExportacionPorIncoterm_proveedorDefaultId_fkey" FOREIGN KEY ("proveedorDefaultId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" ADD CONSTRAINT "CostoExportacionPorIncoterm_monedaDefaultId_fkey" FOREIGN KEY ("monedaDefaultId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" ADD CONSTRAINT "CostoExportacionPorIncoterm_incotermId_fkey" FOREIGN KEY ("incotermId") REFERENCES "Incoterm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" ADD CONSTRAINT "CostoExportacionPorIncoterm_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
