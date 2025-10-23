/*
  Warnings:

  - You are about to drop the `cotizaciones_proveedor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `detalle_orden_compra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `detalle_req_compra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `entregas_rendir_compras` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ordenes_compra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `requerimientos_compra` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DetMovsEntregaRendirPCompras" DROP CONSTRAINT "DetMovsEntregaRendirPCompras_entregaARendirPComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleMovimientoAlmacen" DROP CONSTRAINT "DetalleMovimientoAlmacen_detalleReqCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."cotizaciones_proveedor" DROP CONSTRAINT "cotizaciones_proveedor_productoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."cotizaciones_proveedor" DROP CONSTRAINT "cotizaciones_proveedor_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."cotizaciones_proveedor" DROP CONSTRAINT "cotizaciones_proveedor_requerimientoCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detalle_orden_compra" DROP CONSTRAINT "detalle_orden_compra_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detalle_orden_compra" DROP CONSTRAINT "detalle_orden_compra_productoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detalle_req_compra" DROP CONSTRAINT "detalle_req_compra_cotizacionProveedorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detalle_req_compra" DROP CONSTRAINT "detalle_req_compra_productoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detalle_req_compra" DROP CONSTRAINT "detalle_req_compra_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detalle_req_compra" DROP CONSTRAINT "detalle_req_compra_requerimientoCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."entregas_rendir_compras" DROP CONSTRAINT "entregas_rendir_compras_requerimientoCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ordenes_compra" DROP CONSTRAINT "ordenes_compra_formaPagoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ordenes_compra" DROP CONSTRAINT "ordenes_compra_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ordenes_compra" DROP CONSTRAINT "ordenes_compra_requerimientoCompraId_fkey";

-- DropForeignKey
ALTER TABLE "public"."requerimientos_compra" DROP CONSTRAINT "requerimientos_compra_destinoProductoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."requerimientos_compra" DROP CONSTRAINT "requerimientos_compra_formaPagoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."requerimientos_compra" DROP CONSTRAINT "requerimientos_compra_modoDespachoRecepcionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."requerimientos_compra" DROP CONSTRAINT "requerimientos_compra_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."requerimientos_compra" DROP CONSTRAINT "requerimientos_compra_tipoEstadoProductoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."requerimientos_compra" DROP CONSTRAINT "requerimientos_compra_tipoProductoId_fkey";

-- DropTable
DROP TABLE "public"."cotizaciones_proveedor";

-- DropTable
DROP TABLE "public"."detalle_orden_compra";

-- DropTable
DROP TABLE "public"."detalle_req_compra";

-- DropTable
DROP TABLE "public"."entregas_rendir_compras";

-- DropTable
DROP TABLE "public"."ordenes_compra";

-- DropTable
DROP TABLE "public"."requerimientos_compra";

-- CreateTable
CREATE TABLE "DetalleOrdenCompra" (
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

    CONSTRAINT "DetalleOrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequerimientoCompra" (
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

    CONSTRAINT "RequerimientoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleReqCompra" (
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

    CONSTRAINT "DetalleReqCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedor" (
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

    CONSTRAINT "CotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaARendirPCompras" (
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

    CONSTRAINT "EntregaARendirPCompras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenCompra" (
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

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_ordenCompraId_idx" ON "DetalleOrdenCompra"("ordenCompraId");

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_productoId_idx" ON "DetalleOrdenCompra"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "RequerimientoCompra_codigo_key" ON "RequerimientoCompra"("codigo");

-- CreateIndex
CREATE INDEX "RequerimientoCompra_empresaId_fechaCreacion_idx" ON "RequerimientoCompra"("empresaId", "fechaCreacion");

-- CreateIndex
CREATE INDEX "RequerimientoCompra_estadoId_idx" ON "RequerimientoCompra"("estadoId");

-- CreateIndex
CREATE INDEX "RequerimientoCompra_proveedorId_idx" ON "RequerimientoCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "RequerimientoCompra_codigo_idx" ON "RequerimientoCompra"("codigo");

-- CreateIndex
CREATE INDEX "DetalleReqCompra_requerimientoCompraId_idx" ON "DetalleReqCompra"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "DetalleReqCompra_productoId_idx" ON "DetalleReqCompra"("productoId");

-- CreateIndex
CREATE INDEX "DetalleReqCompra_proveedorId_idx" ON "DetalleReqCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "CotizacionProveedor_requerimientoCompraId_idx" ON "CotizacionProveedor"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "CotizacionProveedor_proveedorId_idx" ON "CotizacionProveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "CotizacionProveedor_seleccionado_idx" ON "CotizacionProveedor"("seleccionado");

-- CreateIndex
CREATE UNIQUE INDEX "EntregaARendirPCompras_requerimientoCompraId_key" ON "EntregaARendirPCompras"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "EntregaARendirPCompras_respEntregaRendirId_idx" ON "EntregaARendirPCompras"("respEntregaRendirId");

-- CreateIndex
CREATE INDEX "EntregaARendirPCompras_entregaLiquidada_idx" ON "EntregaARendirPCompras"("entregaLiquidada");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_codigo_key" ON "OrdenCompra"("codigo");

-- CreateIndex
CREATE INDEX "OrdenCompra_empresaId_fechaEmision_idx" ON "OrdenCompra"("empresaId", "fechaEmision");

-- CreateIndex
CREATE INDEX "OrdenCompra_estadoId_idx" ON "OrdenCompra"("estadoId");

-- CreateIndex
CREATE INDEX "OrdenCompra_proveedorId_idx" ON "OrdenCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "OrdenCompra_requerimientoCompraId_idx" ON "OrdenCompra"("requerimientoCompraId");

-- CreateIndex
CREATE INDEX "OrdenCompra_codigo_idx" ON "OrdenCompra"("codigo");

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_entregaARendirPComprasId_fkey" FOREIGN KEY ("entregaARendirPComprasId") REFERENCES "EntregaARendirPCompras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_detalleReqCompraId_fkey" FOREIGN KEY ("detalleReqCompraId") REFERENCES "DetalleReqCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_tipoProductoId_fkey" FOREIGN KEY ("tipoProductoId") REFERENCES "TipoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_tipoEstadoProductoId_fkey" FOREIGN KEY ("tipoEstadoProductoId") REFERENCES "TipoEstadoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_destinoProductoId_fkey" FOREIGN KEY ("destinoProductoId") REFERENCES "DestinoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_modoDespachoRecepcionId_fkey" FOREIGN KEY ("modoDespachoRecepcionId") REFERENCES "ModoDespachoRecepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReqCompra" ADD CONSTRAINT "DetalleReqCompra_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "RequerimientoCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReqCompra" ADD CONSTRAINT "DetalleReqCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReqCompra" ADD CONSTRAINT "DetalleReqCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReqCompra" ADD CONSTRAINT "DetalleReqCompra_cotizacionProveedorId_fkey" FOREIGN KEY ("cotizacionProveedorId") REFERENCES "CotizacionProveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "RequerimientoCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPCompras" ADD CONSTRAINT "EntregaARendirPCompras_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "RequerimientoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "RequerimientoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;
