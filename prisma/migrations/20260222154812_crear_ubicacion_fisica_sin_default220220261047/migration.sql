-- DropIndex
DROP INDEX "idx_kardex_custodia_detallado";

-- DropIndex
DROP INDEX "idx_kardex_propio_detallado";

-- DropIndex
DROP INDEX "idx_saldo_det_custodia_completo";

-- DropIndex
DROP INDEX "idx_saldo_det_propio_completo";

-- AlterTable
ALTER TABLE "DetalleMovimientoAlmacen" ADD COLUMN     "ubicacionFisicaId" BIGINT;

-- AlterTable
ALTER TABLE "KardexAlmacen" ADD COLUMN     "ubicacionFisicaId" BIGINT;

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "nroLiquidacionFacturacion" VARCHAR(40);

-- AlterTable
ALTER TABLE "SaldosDetProductoCliente" ADD COLUMN     "ubicacionFisicaId" BIGINT;

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "precioPorTonDolares" DECIMAL(10,2) DEFAULT 0.00;

-- CreateTable
CREATE TABLE "DetGastosPlanificados" (
    "id" BIGSERIAL NOT NULL,
    "detMovEntregaRendirTemporadaPescaId" BIGINT,
    "detMovEntRendirPescaConsumoId" BIGINT,
    "detMovEntregaRendirPComprasId" BIGINT,
    "detMovEntregaRendirPVentasId" BIGINT,
    "detMovEntregaRendirMovAlmacenId" BIGINT,
    "detMovEntregaRendirContratoId" BIGINT,
    "detMovEntregaRendirOTId" BIGINT,
    "productoId" BIGINT NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "montoPlanificado" DECIMAL(65,30) NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetGastosPlanificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UbicacionFisica" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "almacenId" BIGINT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "UbicacionFisica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_detMovEntregaRendirTemporadaPescaId_idx" ON "DetGastosPlanificados"("detMovEntregaRendirTemporadaPescaId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_detMovEntRendirPescaConsumoId_idx" ON "DetGastosPlanificados"("detMovEntRendirPescaConsumoId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_detMovEntregaRendirPComprasId_idx" ON "DetGastosPlanificados"("detMovEntregaRendirPComprasId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_detMovEntregaRendirPVentasId_idx" ON "DetGastosPlanificados"("detMovEntregaRendirPVentasId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_detMovEntregaRendirMovAlmacenId_idx" ON "DetGastosPlanificados"("detMovEntregaRendirMovAlmacenId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_detMovEntregaRendirContratoId_idx" ON "DetGastosPlanificados"("detMovEntregaRendirContratoId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_detMovEntregaRendirOTId_idx" ON "DetGastosPlanificados"("detMovEntregaRendirOTId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_productoId_idx" ON "DetGastosPlanificados"("productoId");

-- CreateIndex
CREATE INDEX "DetGastosPlanificados_monedaId_idx" ON "DetGastosPlanificados"("monedaId");

-- CreateIndex
CREATE INDEX "idx_ubicacion_almacen" ON "UbicacionFisica"("almacenId");

-- CreateIndex
CREATE INDEX "idx_det_mov_ubicacion" ON "DetalleMovimientoAlmacen"("ubicacionFisicaId");

-- CreateIndex
CREATE INDEX "idx_kardex_propio_detallado" ON "KardexAlmacen"("empresaId", "almacenId", "productoId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie", "ubicacionFisicaId", "fechaMovimientoAlmacen", "esIngresoEgreso", "id");

-- CreateIndex
CREATE INDEX "idx_kardex_custodia_detallado" ON "KardexAlmacen"("empresaId", "almacenId", "productoId", "clienteId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie", "ubicacionFisicaId", "fechaMovimientoAlmacen", "esIngresoEgreso", "id");

-- CreateIndex
CREATE INDEX "idx_kardex_ubicacion" ON "KardexAlmacen"("ubicacionFisicaId");

-- CreateIndex
CREATE INDEX "idx_saldo_det_propio_completo" ON "SaldosDetProductoCliente"("empresaId", "almacenId", "productoId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie", "ubicacionFisicaId");

-- CreateIndex
CREATE INDEX "idx_saldo_det_custodia_completo" ON "SaldosDetProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie", "ubicacionFisicaId");

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_detMovEntregaRendirTemporadaPescaId_fkey" FOREIGN KEY ("detMovEntregaRendirTemporadaPescaId") REFERENCES "DetMovsEntregaRendir"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_detMovEntRendirPescaConsumoId_fkey" FOREIGN KEY ("detMovEntRendirPescaConsumoId") REFERENCES "DetMovsEntRendirPescaConsumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_detMovEntregaRendirPComprasId_fkey" FOREIGN KEY ("detMovEntregaRendirPComprasId") REFERENCES "DetMovsEntregaRendirPCompras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_detMovEntregaRendirPVentasId_fkey" FOREIGN KEY ("detMovEntregaRendirPVentasId") REFERENCES "DetMovsEntregaRendirPVentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_detMovEntregaRendirMovAlmacenId_fkey" FOREIGN KEY ("detMovEntregaRendirMovAlmacenId") REFERENCES "DetMovsEntregaRendirMovAlmacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_detMovEntregaRendirContratoId_fkey" FOREIGN KEY ("detMovEntregaRendirContratoId") REFERENCES "DetMovsEntregaRendirContratoServicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_detMovEntregaRendirOTId_fkey" FOREIGN KEY ("detMovEntregaRendirOTId") REFERENCES "DetMovsEntregaRendirOTMantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetGastosPlanificados" ADD CONSTRAINT "DetGastosPlanificados_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_ubicacionFisicaId_fkey" FOREIGN KEY ("ubicacionFisicaId") REFERENCES "UbicacionFisica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UbicacionFisica" ADD CONSTRAINT "UbicacionFisica_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KardexAlmacen" ADD CONSTRAINT "KardexAlmacen_ubicacionFisicaId_fkey" FOREIGN KEY ("ubicacionFisicaId") REFERENCES "UbicacionFisica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldosDetProductoCliente" ADD CONSTRAINT "SaldosDetProductoCliente_ubicacionFisicaId_fkey" FOREIGN KEY ("ubicacionFisicaId") REFERENCES "UbicacionFisica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
