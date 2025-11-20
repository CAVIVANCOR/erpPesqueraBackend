/*
  Warnings:

  - Made the column `estadoDocAlmacenId` on table `MovimientoAlmacen` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EstadoMultiFuncion" ADD COLUMN     "severityColor" TEXT;

-- AlterTable
ALTER TABLE "MovimientoAlmacen" ALTER COLUMN "estadoDocAlmacenId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_estadoDocAlmacenId_fkey" FOREIGN KEY ("estadoDocAlmacenId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
