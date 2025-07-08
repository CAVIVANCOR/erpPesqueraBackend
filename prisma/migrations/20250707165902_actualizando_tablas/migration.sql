/*
  Warnings:

  - Added the required column `centroCostoId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoCotizacionId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `centroCostoId` to the `DetCotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `centroCostoId` to the `EntregaARendir` table without a default value. This is not possible if the table is not empty.
  - Added the required column `centroCostoId` to the `EntregaARendirPescaConsumo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CotizacionVentas" ADD COLUMN     "centroCostoId" BIGINT NOT NULL,
ADD COLUMN     "estadoCotizacionId" BIGINT NOT NULL,
ADD COLUMN     "puertoCargaId" BIGINT,
ADD COLUMN     "puertoDescargaId" BIGINT;

-- AlterTable
ALTER TABLE "DetCotizacionVentas" ADD COLUMN     "centroCostoId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "DetallePreFactura" ADD COLUMN     "centroCostoId" BIGINT;

-- AlterTable
ALTER TABLE "EntregaARendir" ADD COLUMN     "centroCostoId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "EntregaARendirPescaConsumo" ADD COLUMN     "centroCostoId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "centroCostoId" BIGINT;

-- CreateTable
CREATE TABLE "EntregaARendirPVentas" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionVentasId" BIGINT NOT NULL,
    "respEntregaRendirId" BIGINT NOT NULL,
    "entregaLiquidada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLiquidacion" TIMESTAMP(3),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,
    "centroCostoId" BIGINT NOT NULL,

    CONSTRAINT "EntregaARendirPVentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetMovsEntregaRendirPVentas" (
    "id" BIGSERIAL NOT NULL,
    "entregaARendirPVentasId" BIGINT NOT NULL,
    "responsableId" BIGINT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "centroCostoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetMovsEntregaRendirPVentas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EntregaARendirPVentas" ADD CONSTRAINT "EntregaARendirPVentas_cotizacionVentasId_fkey" FOREIGN KEY ("cotizacionVentasId") REFERENCES "CotizacionVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_entregaARendirPVentasId_fkey" FOREIGN KEY ("entregaARendirPVentasId") REFERENCES "EntregaARendirPVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
