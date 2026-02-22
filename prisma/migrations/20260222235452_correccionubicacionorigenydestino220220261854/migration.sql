/*
  Warnings:

  - You are about to drop the column `ubicacionFisicaId` on the `DetalleMovimientoAlmacen` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" DROP CONSTRAINT "DetalleMovimientoAlmacen_ubicacionFisicaId_fkey";

-- DropIndex
DROP INDEX "idx_det_mov_ubicacion";

-- AlterTable
ALTER TABLE "DetalleMovimientoAlmacen" DROP COLUMN "ubicacionFisicaId",
ADD COLUMN     "ubicacionFisicaDestinoId" BIGINT,
ADD COLUMN     "ubicacionFisicaOrigenId" BIGINT;

-- CreateIndex
CREATE INDEX "idx_det_mov_ubicacion_origen" ON "DetalleMovimientoAlmacen"("ubicacionFisicaOrigenId");

-- CreateIndex
CREATE INDEX "idx_det_mov_ubicacion_destino" ON "DetalleMovimientoAlmacen"("ubicacionFisicaDestinoId");

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_ubicacionFisicaOrigenId_fkey" FOREIGN KEY ("ubicacionFisicaOrigenId") REFERENCES "UbicacionFisica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_ubicacionFisicaDestinoId_fkey" FOREIGN KEY ("ubicacionFisicaDestinoId") REFERENCES "UbicacionFisica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
