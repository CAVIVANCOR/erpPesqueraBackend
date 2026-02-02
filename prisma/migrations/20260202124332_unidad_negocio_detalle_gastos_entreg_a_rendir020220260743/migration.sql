-- AlterTable
ALTER TABLE "ContratoServicio" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "CotizacionVentas" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "asignacionOrigenId" BIGINT,
ADD COLUMN     "detalleGastosPlanificados" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "asignacionOrigenId" BIGINT,
ADD COLUMN     "detalleGastosPlanificados" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD COLUMN     "asignacionOrigenId" BIGINT,
ADD COLUMN     "detalleGastosPlanificados" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD COLUMN     "asignacionOrigenId" BIGINT,
ADD COLUMN     "detalleGastosPlanificados" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD COLUMN     "asignacionOrigenId" BIGINT,
ADD COLUMN     "detalleGastosPlanificados" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "asignacionOrigenId" BIGINT,
ADD COLUMN     "detalleGastosPlanificados" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD COLUMN     "asignacionOrigenId" BIGINT,
ADD COLUMN     "detalleGastosPlanificados" TEXT;

-- AlterTable
ALTER TABLE "MovimientoAlmacen" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "RequerimientoCompra" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "unidadNegocioId" BIGINT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "dashboardPorDefecto" VARCHAR(60) NOT NULL DEFAULT 'modular';

-- CreateTable
CREATE TABLE "UnidadNegocio" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "icono" VARCHAR(50),
    "color" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaModificacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadNegocio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnidadNegocio_activo_idx" ON "UnidadNegocio"("activo");

-- CreateIndex
CREATE INDEX "ContratoServicio_unidadNegocioId_idx" ON "ContratoServicio"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "CotizacionVentas_unidadNegocioId_idx" ON "CotizacionVentas"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "DetMovsEntRendirPescaConsumo_asignacionOrigenId_idx" ON "DetMovsEntRendirPescaConsumo"("asignacionOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendir_asignacionOrigenId_idx" ON "DetMovsEntregaRendir"("asignacionOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirContratoServicios_asignacionOrigenId_idx" ON "DetMovsEntregaRendirContratoServicios"("asignacionOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirMovAlmacen_asignacionOrigenId_idx" ON "DetMovsEntregaRendirMovAlmacen"("asignacionOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirOTMantenimiento_asignacionOrigenId_idx" ON "DetMovsEntregaRendirOTMantenimiento"("asignacionOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirPCompras_asignacionOrigenId_idx" ON "DetMovsEntregaRendirPCompras"("asignacionOrigenId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirPVentas_asignacionOrigenId_idx" ON "DetMovsEntregaRendirPVentas"("asignacionOrigenId");

-- CreateIndex
CREATE INDEX "MovimientoAlmacen_unidadNegocioId_idx" ON "MovimientoAlmacen"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "NovedadPescaConsumo_unidadNegocioId_idx" ON "NovedadPescaConsumo"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "OrdenCompra_unidadNegocioId_idx" ON "OrdenCompra"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "PreFactura_unidadNegocioId_idx" ON "PreFactura"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "RequerimientoCompra_unidadNegocioId_idx" ON "RequerimientoCompra"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "TemporadaPesca_unidadNegocioId_idx" ON "TemporadaPesca"("unidadNegocioId");

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_asignacionOrigenId_fkey" FOREIGN KEY ("asignacionOrigenId") REFERENCES "DetMovsEntregaRendirPVentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_asignacionOrigenId_fkey" FOREIGN KEY ("asignacionOrigenId") REFERENCES "DetMovsEntRendirPescaConsumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_asignacionOrigenId_fkey" FOREIGN KEY ("asignacionOrigenId") REFERENCES "DetMovsEntregaRendir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_asignacionOrigenId_fkey" FOREIGN KEY ("asignacionOrigenId") REFERENCES "DetMovsEntregaRendirPCompras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD CONSTRAINT "DetMovsEntregaRendirMovAlmacen_asignacionOrigenId_fkey" FOREIGN KEY ("asignacionOrigenId") REFERENCES "DetMovsEntregaRendirMovAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD CONSTRAINT "DetMovsEntregaRendirContratoServicios_asignacionOrigenId_fkey" FOREIGN KEY ("asignacionOrigenId") REFERENCES "DetMovsEntregaRendirContratoServicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD CONSTRAINT "DetMovsEntregaRendirOTMantenimiento_asignacionOrigenId_fkey" FOREIGN KEY ("asignacionOrigenId") REFERENCES "DetMovsEntregaRendirOTMantenimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadPescaConsumo" ADD CONSTRAINT "NovedadPescaConsumo_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
