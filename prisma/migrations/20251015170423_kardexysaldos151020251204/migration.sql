/*
  Warnings:

  - You are about to drop the column `esCustodia` on the `SaldosProductoCliente` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[empresaId,almacenId,productoId,clienteId,custodia]` on the table `SaldosProductoCliente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."KardexAlmacen_empresaId_clienteId_productoId_esCustodia_idx";

-- DropIndex
DROP INDEX "public"."KardexAlmacen_empresaId_clienteId_productoId_esCustodia_lot_idx";

-- DropIndex
DROP INDEX "public"."SaldosProductoCliente_empresaId_almacenId_productoId_client_key";

-- AlterTable
ALTER TABLE "SaldosProductoCliente" DROP COLUMN "esCustodia",
ADD COLUMN     "custodia" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "idx_kardex_propio_general" ON "KardexAlmacen"("empresaId", "almacenId", "productoId", "esCustodia", "fechaMovimientoAlmacen", "esIngresoEgreso", "id");

-- CreateIndex
CREATE INDEX "idx_kardex_custodia_general" ON "KardexAlmacen"("empresaId", "almacenId", "productoId", "clienteId", "esCustodia", "fechaMovimientoAlmacen", "esIngresoEgreso", "id");

-- CreateIndex
CREATE INDEX "idx_kardex_propio_detallado" ON "KardexAlmacen"("empresaId", "almacenId", "productoId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie", "fechaMovimientoAlmacen", "esIngresoEgreso", "id");

-- CreateIndex
CREATE INDEX "idx_kardex_custodia_detallado" ON "KardexAlmacen"("empresaId", "almacenId", "productoId", "clienteId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie", "fechaMovimientoAlmacen", "esIngresoEgreso", "id");

-- CreateIndex
CREATE INDEX "idx_kardex_reportes_fecha" ON "KardexAlmacen"("empresaId", "almacenId", "fechaMovimientoAlmacen", "productoId", "esCustodia");

-- CreateIndex
CREATE INDEX "idx_kardex_movimiento" ON "KardexAlmacen"("movimientoAlmacenId");

-- CreateIndex
CREATE INDEX "idx_saldo_det_propio_completo" ON "SaldosDetProductoCliente"("empresaId", "almacenId", "productoId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie");

-- CreateIndex
CREATE INDEX "idx_saldo_det_custodia_completo" ON "SaldosDetProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie");

-- CreateIndex
CREATE INDEX "idx_saldo_det_general" ON "SaldosDetProductoCliente"("empresaId", "almacenId", "productoId", "esCustodia");

-- CreateIndex
CREATE INDEX "idx_saldo_gen_propio" ON "SaldosProductoCliente"("empresaId", "almacenId", "productoId", "custodia");

-- CreateIndex
CREATE INDEX "idx_saldo_gen_cliente" ON "SaldosProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "custodia");

-- CreateIndex
CREATE UNIQUE INDEX "SaldosProductoCliente_empresaId_almacenId_productoId_client_key" ON "SaldosProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "custodia");

-- RenameIndex
ALTER INDEX "KardexAlmacen_clienteId_idx" RENAME TO "idx_kardex_cliente";

-- RenameIndex
ALTER INDEX "KardexAlmacen_productoId_idx" RENAME TO "idx_kardex_producto";
