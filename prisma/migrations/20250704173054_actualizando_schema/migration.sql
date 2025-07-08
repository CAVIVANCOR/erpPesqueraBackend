/*
  Warnings:

  - You are about to drop the column `urlOTPdf` on the `OTMantenimiento` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DetalleReqCompra" ADD COLUMN     "ordenCompraDetalleId" BIGINT;

-- AlterTable
ALTER TABLE "OTMantenimiento" DROP COLUMN "urlOTPdf",
ADD COLUMN     "urlOrdenTrabajoPdf" TEXT;

-- AlterTable
ALTER TABLE "RequerimientoCompra" ADD COLUMN     "urlReqCompraPdf" TEXT;

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "proveedorId" BIGINT NOT NULL,
    "formaPagoId" BIGINT,
    "centroCostoId" BIGINT,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" TIMESTAMP(3),
    "estadoId" BIGINT NOT NULL,
    "solicitanteId" BIGINT,
    "aprobadoPorId" BIGINT,
    "observaciones" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleOrdenCompra" (
    "id" BIGSERIAL NOT NULL,
    "ordenCompraId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(65,30),
    "centroCostoId" BIGINT,
    "observaciones" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleOrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_codigo_key" ON "OrdenCompra"("codigo");

-- AddForeignKey
ALTER TABLE "DetalleReqCompra" ADD CONSTRAINT "DetalleReqCompra_ordenCompraDetalleId_fkey" FOREIGN KEY ("ordenCompraDetalleId") REFERENCES "DetalleOrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
