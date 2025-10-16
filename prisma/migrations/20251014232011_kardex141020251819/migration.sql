/*
  Warnings:

  - You are about to drop the column `custodia` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `paletaAlmacenId` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacionId` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `custodia` on the `SaldosDetProductoCliente` table. All the data in the column will be lost.
  - You are about to drop the column `paletaAlmacenId` on the `SaldosDetProductoCliente` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacionId` on the `SaldosDetProductoCliente` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[empresaId,almacenId,productoId,clienteId,esCustodia,lote,fechaIngreso,fechaProduccion,fechaVencimiento,estadoId,estadoCalidadId,numContenedor,nroSerie]` on the table `SaldosDetProductoCliente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."KardexAlmacen_empresaId_clienteId_productoId_custodia_idx";

-- DropIndex
DROP INDEX "public"."KardexAlmacen_empresaId_clienteId_productoId_custodia_lote__idx";

-- DropIndex
DROP INDEX "public"."SaldosDetProductoCliente_empresaId_almacenId_productoId_cli_key";

-- AlterTable
ALTER TABLE "KardexAlmacen" DROP COLUMN "custodia",
DROP COLUMN "paletaAlmacenId",
DROP COLUMN "ubicacionId",
ADD COLUMN     "esCustodia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estadoCalidadId" BIGINT;

-- AlterTable
ALTER TABLE "SaldosDetProductoCliente" DROP COLUMN "custodia",
DROP COLUMN "paletaAlmacenId",
DROP COLUMN "ubicacionId",
ADD COLUMN     "esCustodia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estadoCalidadId" BIGINT;

-- CreateIndex
CREATE INDEX "KardexAlmacen_empresaId_clienteId_productoId_esCustodia_idx" ON "KardexAlmacen"("empresaId", "clienteId", "productoId", "esCustodia");

-- CreateIndex
CREATE INDEX "KardexAlmacen_empresaId_clienteId_productoId_esCustodia_lot_idx" ON "KardexAlmacen"("empresaId", "clienteId", "productoId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie");

-- CreateIndex
CREATE UNIQUE INDEX "SaldosDetProductoCliente_empresaId_almacenId_productoId_cli_key" ON "SaldosDetProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "esCustodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "estadoId", "estadoCalidadId", "numContenedor", "nroSerie");
