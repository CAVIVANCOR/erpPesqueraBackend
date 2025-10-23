/*
  Warnings:

  - You are about to drop the `CotizacionCompras` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetCotizacionCompras` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetDocsReqCotizaCompras` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetGastosComprasProd` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetProductoFinalCotizacionCompras` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetalleOrdenCompra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetalleReqCompra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntregaARendirPCompras` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrdenCompra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RequerimientoCompra` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CotizacionCompras" DROP CONSTRAINT "CotizacionCompras_destinoProductoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CotizacionCompras" DROP CONSTRAINT "CotizacionCompras_formaTransaccionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CotizacionCompras" DROP CONSTRAINT "CotizacionCompras_modoDespachoRecepcionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CotizacionCompras" DROP CONSTRAINT "CotizacionCompras_tipoEstadoProductoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CotizacionCompras" DROP CONSTRAINT "CotizacionCompras_tipoProductoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetCotizacionCompras" DROP CONSTRAINT "DetCotizacionCompras_cotizacionComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetCotizacionCompras" DROP CONSTRAINT "DetCotizacionCompras_productoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetDocsReqCotizaCompras" DROP CONSTRAINT "DetDocsReqCotizaCompras_cotizacionComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetDocsReqCotizaCompras" DROP CONSTRAINT "DetDocsReqCotizaCompras_docRequeridaComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetGastosComprasProd" DROP CONSTRAINT "DetGastosComprasProd_cotizacionComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetMovsEntregaRendirPCompras" DROP CONSTRAINT "DetMovsEntregaRendirPCompras_entregaARendirPComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetProductoFinalCotizacionCompras" DROP CONSTRAINT "DetProductoFinalCotizacionCompras_cotizacionComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetProductoFinalCotizacionCompras" DROP CONSTRAINT "DetProductoFinalCotizacionCompras_productoFinalId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleMovimientoAlmacen" DROP CONSTRAINT "DetalleMovimientoAlmacen_detalleReqCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleOrdenCompra" DROP CONSTRAINT "DetalleOrdenCompra_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleOrdenCompra" DROP CONSTRAINT "DetalleOrdenCompra_productoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleReqCompra" DROP CONSTRAINT "DetalleReqCompra_productoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleReqCompra" DROP CONSTRAINT "DetalleReqCompra_requerimientoCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EntregaARendirPCompras" DROP CONSTRAINT "EntregaARendirPCompras_cotizacionComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrdenCompra" DROP CONSTRAINT "OrdenCompra_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequerimientoCompra" DROP CONSTRAINT "RequerimientoCompra_proveedorId_fkey";

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "motivoSinFactura" TEXT,
ADD COLUMN     "numeroComprobante" TEXT,
ADD COLUMN     "tipoDocumentoId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD COLUMN     "numeroComprobante" TEXT,
ADD COLUMN     "tipoDocumentoId" BIGINT;

-- DropTable
DROP TABLE "public"."CotizacionCompras";

-- DropTable
DROP TABLE "public"."DetCotizacionCompras";

-- DropTable
DROP TABLE "public"."DetDocsReqCotizaCompras";

-- DropTable
DROP TABLE "public"."DetGastosComprasProd";

-- DropTable
DROP TABLE "public"."DetProductoFinalCotizacionCompras";

-- DropTable
DROP TABLE "public"."DetalleOrdenCompra";

-- DropTable
DROP TABLE "public"."DetalleReqCompra";

-- DropTable
DROP TABLE "public"."EntregaARendirPCompras";

-- DropTable
DROP TABLE "public"."OrdenCompra";

-- DropTable
DROP TABLE "public"."RequerimientoCompra";

-- CreateTable
CREATE TABLE "detalle_orden_compra" (
    "id" BIGSERIAL NOT NULL,
    "ordenCompraId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "cantidadRecibida" DECIMAL(65,30) DEFAULT 0,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "centroCostoId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detalle_orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requerimientos_compra" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "esConCotizacion" BOOLEAN NOT NULL DEFAULT false,
    "tipoProductoId" BIGINT NOT NULL,
    "tipoEstadoProductoId" BIGINT NOT NULL,
    "destinoProductoId" BIGINT NOT NULL,
    "proveedorId" BIGINT,
    "formaPagoId" BIGINT,
    "modoDespachoRecepcionId" BIGINT,
    "monedaId" BIGINT,
    "tipoCambio" DECIMAL(65,30),
    "ordenTrabajoId" BIGINT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRequerida" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "solicitanteId" BIGINT,
    "respComprasId" BIGINT,
    "respProduccionId" BIGINT,
    "respAlmacenId" BIGINT,
    "supervisorCampoId" BIGINT,
    "aprobadoPorId" BIGINT,
    "autorizaCompraId" BIGINT,
    "estadoId" BIGINT NOT NULL,
    "centroCostoId" BIGINT,
    "urlReqCompraPdf" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "requerimientos_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_req_compra" (
    "id" BIGSERIAL NOT NULL,
    "requerimientoCompraId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "proveedorId" BIGINT,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "costoUnitario" DECIMAL(65,30),
    "subtotal" DECIMAL(65,30),
    "monedaId" BIGINT,
    "cotizacionProveedorId" BIGINT,
    "centroCostoId" BIGINT,
    "observaciones" TEXT,
    "ordenCompraDetalleId" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detalle_req_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizaciones_proveedor" (
    "id" BIGSERIAL NOT NULL,
    "requerimientoCompraId" BIGINT NOT NULL,
    "proveedorId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tiempoEntregaDias" INTEGER,
    "lugarEntrega" TEXT,
    "seleccionado" BOOLEAN NOT NULL DEFAULT false,
    "motivoSeleccion" TEXT,
    "fechaSeleccion" TIMESTAMP(3),
    "seleccionadoPor" BIGINT,
    "urlCotizacionPdf" TEXT,
    "fechaCotizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizaciones_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas_rendir_compras" (
    "id" BIGSERIAL NOT NULL,
    "requerimientoCompraId" BIGINT NOT NULL,
    "respEntregaRendirId" BIGINT NOT NULL,
    "entregaLiquidada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLiquidacion" TIMESTAMP(3),
    "centroCostoId" BIGINT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "entregas_rendir_compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "requerimientoCompraId" BIGINT,
    "proveedorId" BIGINT NOT NULL,
    "formaPagoId" BIGINT,
    "monedaId" BIGINT,
    "tipoCambio" DECIMAL(65,30),
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "solicitanteId" BIGINT,
    "aprobadoPorId" BIGINT,
    "estadoId" BIGINT NOT NULL,
    "centroCostoId" BIGINT,
    "movIngresoAlmacenId" BIGINT,
    "observaciones" TEXT,
    "urlOrdenCompraPdf" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "detalle_orden_compra_ordenCompraId_idx" ON "detalle_orden_compra"("ordenCompraId");

-- CreateIndex
CREATE INDEX "detalle_orden_compra_productoId_idx" ON "detalle_orden_compra"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "requerimientos_compra_codigo_key" ON "requerimientos_compra"("codigo");

-- CreateIndex
CREATE INDEX "requerimientos_compra_empresaId_fechaCreacion_idx" ON "requerimientos_compra"("empresaId", "fechaCreacion");

-- CreateIndex
CREATE INDEX "requerimientos_compra_estadoId_idx" ON "requerimientos_compra"("estadoId");

-- CreateIndex
CREATE INDEX "requerimientos_compra_proveedorId_idx" ON "requerimientos_compra"("proveedorId");

-- CreateIndex
CREATE INDEX "requerimientos_compra_codigo_idx" ON "requerimientos_compra"("codigo");

-- CreateIndex
CREATE INDEX "detalle_req_compra_requerimientoCompraId_idx" ON "detalle_req_compra"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "detalle_req_compra_productoId_idx" ON "detalle_req_compra"("productoId");

-- CreateIndex
CREATE INDEX "detalle_req_compra_proveedorId_idx" ON "detalle_req_compra"("proveedorId");

-- CreateIndex
CREATE INDEX "cotizaciones_proveedor_requerimientoCompraId_idx" ON "cotizaciones_proveedor"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "cotizaciones_proveedor_proveedorId_idx" ON "cotizaciones_proveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "cotizaciones_proveedor_seleccionado_idx" ON "cotizaciones_proveedor"("seleccionado");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_rendir_compras_requerimientoCompraId_key" ON "entregas_rendir_compras"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "entregas_rendir_compras_respEntregaRendirId_idx" ON "entregas_rendir_compras"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "entregas_rendir_compras_entregaLiquidada_idx" ON "entregas_rendir_compras"("entregaLiquidada");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_codigo_key" ON "ordenes_compra"("codigo");

-- CreateIndex
CREATE INDEX "ordenes_compra_empresaId_fechaEmision_idx" ON "ordenes_compra"("empresaId", "fechaEmision");

-- CreateIndex
CREATE INDEX "ordenes_compra_estadoId_idx" ON "ordenes_compra"("estadoId");

-- CreateIndex
CREATE INDEX "ordenes_compra_proveedorId_idx" ON "ordenes_compra"("proveedorId");

-- CreateIndex
CREATE INDEX "ordenes_compra_requerimientoCompraId_idx" ON "ordenes_compra"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "ordenes_compra_codigo_idx" ON "ordenes_compra"("codigo");

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_entregaARendirPComprasId_fkey" FOREIGN KEY ("entregaARendirPComprasId") REFERENCES "entregas_rendir_compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_detalleReqCompraId_fkey" FOREIGN KEY ("detalleReqCompraId") REFERENCES "detalle_req_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "detalle_orden_compra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "detalle_orden_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_compra" ADD CONSTRAINT "requerimientos_compra_tipoProductoId_fkey" FOREIGN KEY ("tipoProductoId") REFERENCES "TipoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_compra" ADD CONSTRAINT "requerimientos_compra_tipoEstadoProductoId_fkey" FOREIGN KEY ("tipoEstadoProductoId") REFERENCES "TipoEstadoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_compra" ADD CONSTRAINT "requerimientos_compra_destinoProductoId_fkey" FOREIGN KEY ("destinoProductoId") REFERENCES "DestinoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_compra" ADD CONSTRAINT "requerimientos_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_compra" ADD CONSTRAINT "requerimientos_compra_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_compra" ADD CONSTRAINT "requerimientos_compra_modoDespachoRecepcionId_fkey" FOREIGN KEY ("modoDespachoRecepcionId") REFERENCES "ModoDespachoRecepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_req_compra" ADD CONSTRAINT "detalle_req_compra_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "requerimientos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_req_compra" ADD CONSTRAINT "detalle_req_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_req_compra" ADD CONSTRAINT "detalle_req_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_req_compra" ADD CONSTRAINT "detalle_req_compra_cotizacionProveedorId_fkey" FOREIGN KEY ("cotizacionProveedorId") REFERENCES "cotizaciones_proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_proveedor" ADD CONSTRAINT "cotizaciones_proveedor_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "requerimientos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_proveedor" ADD CONSTRAINT "cotizaciones_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_proveedor" ADD CONSTRAINT "cotizaciones_proveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_rendir_compras" ADD CONSTRAINT "entregas_rendir_compras_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "requerimientos_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "requerimientos_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;
