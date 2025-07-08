/*
  Warnings:

  - You are about to drop the column `proveedorId` on the `CotizacionCompras` table. All the data in the column will be lost.
  - You are about to drop the column `igv` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `PreFactura` table. All the data in the column will be lost.
  - Added the required column `proveedorMateriaPrimaId` to the `CotizacionCompras` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CotizacionCompras" DROP COLUMN "proveedorId",
ADD COLUMN     "ProveedorPlantaProcesoId" BIGINT,
ADD COLUMN     "clienteCompraMateriaPrimaId" BIGINT,
ADD COLUMN     "conceptoMovSalidaProcesarId" BIGINT,
ADD COLUMN     "proveedorMateriaPrimaId" BIGINT NOT NULL,
ADD COLUMN     "respCalidadClienteMateriaPrimaId" BIGINT,
ADD COLUMN     "respCalidadPlantaProcesoId" BIGINT,
ADD COLUMN     "respProduccionClienteMateriaPrimaId" BIGINT,
ADD COLUMN     "respProduccionPlantaProcesoId" BIGINT;

-- AlterTable
ALTER TABLE "PreFactura" DROP COLUMN "igv",
DROP COLUMN "subtotal",
DROP COLUMN "total",
ADD COLUMN     "precioVentaTotal" DECIMAL(65,30),
ADD COLUMN     "totalIGV" DECIMAL(65,30),
ADD COLUMN     "valorVentaTotal" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "DetGastosComprasProd" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionComprasId" BIGINT NOT NULL,
    "entregaARendirPComprasId" BIGINT NOT NULL,
    "detMovEntregaRendirPComprasId" BIGINT NOT NULL,
    "costoProduccionId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetGastosComprasProd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetProductoFinalCotizacionCompras" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionComprasId" BIGINT NOT NULL,
    "productoFinalId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "peso" DECIMAL(65,30) NOT NULL,
    "costoUnitMateriaPrima" DECIMAL(65,30) NOT NULL,
    "costoUnitProceso" DECIMAL(65,30) NOT NULL,
    "costoUnitario" DECIMAL(65,30) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetProductoFinalCotizacionCompras_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetGastosComprasProd" ADD CONSTRAINT "DetGastosComprasProd_cotizacionComprasId_fkey" FOREIGN KEY ("cotizacionComprasId") REFERENCES "CotizacionCompras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetCotizacionCompras" ADD CONSTRAINT "DetCotizacionCompras_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetProductoFinalCotizacionCompras" ADD CONSTRAINT "DetProductoFinalCotizacionCompras_cotizacionComprasId_fkey" FOREIGN KEY ("cotizacionComprasId") REFERENCES "CotizacionCompras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetProductoFinalCotizacionCompras" ADD CONSTRAINT "DetProductoFinalCotizacionCompras_productoFinalId_fkey" FOREIGN KEY ("productoFinalId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
