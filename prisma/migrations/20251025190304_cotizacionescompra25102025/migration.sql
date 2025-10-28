/*
  Warnings:

  - You are about to drop the column `cantidad` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `fechaSeleccion` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `lugarEntrega` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `motivoSeleccion` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `precioUnitario` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `productoId` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `seleccionado` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `seleccionadoPor` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `tiempoEntregaDias` on the `CotizacionProveedor` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CotizacionProveedor" DROP CONSTRAINT "CotizacionProveedor_productoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleReqCompra" DROP CONSTRAINT "DetalleReqCompra_cotizacionProveedorId_fkey";

-- DropIndex
DROP INDEX "public"."CotizacionProveedor_seleccionado_idx";

-- AlterTable
ALTER TABLE "CotizacionProveedor" DROP COLUMN "cantidad",
DROP COLUMN "fechaSeleccion",
DROP COLUMN "lugarEntrega",
DROP COLUMN "motivoSeleccion",
DROP COLUMN "precioUnitario",
DROP COLUMN "productoId",
DROP COLUMN "seleccionado",
DROP COLUMN "seleccionadoPor",
DROP COLUMN "tiempoEntregaDias";

-- CreateTable
CREATE TABLE "DetalleCotizacionProveedor" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionProveedorId" BIGINT NOT NULL,
    "detalleReqCompraId" BIGINT,
    "productoId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "esProductoAlternativo" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleCotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetalleCotizacionProveedor_cotizacionProveedorId_idx" ON "DetalleCotizacionProveedor"("cotizacionProveedorId");

-- CreateIndex
CREATE INDEX "DetalleCotizacionProveedor_detalleReqCompraId_idx" ON "DetalleCotizacionProveedor"("detalleReqCompraId");

-- CreateIndex
CREATE INDEX "DetalleCotizacionProveedor_productoId_idx" ON "DetalleCotizacionProveedor"("productoId");

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCotizacionProveedor" ADD CONSTRAINT "DetalleCotizacionProveedor_cotizacionProveedorId_fkey" FOREIGN KEY ("cotizacionProveedorId") REFERENCES "CotizacionProveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCotizacionProveedor" ADD CONSTRAINT "DetalleCotizacionProveedor_detalleReqCompraId_fkey" FOREIGN KEY ("detalleReqCompraId") REFERENCES "DetalleReqCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCotizacionProveedor" ADD CONSTRAINT "DetalleCotizacionProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
