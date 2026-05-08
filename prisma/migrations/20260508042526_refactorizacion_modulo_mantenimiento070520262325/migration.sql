/*
  Warnings:

  - You are about to drop the column `autorizadoPorId` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `validadoPorId` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the `DetInsumosTareaOT` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetTareasOT` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[empresaId,numeroCompleto]` on the table `OTMantenimiento` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_detalleMovAlmacenId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_detalleOrdenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_estadoInsumoId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_movimientoAlmacenId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_personalApruebaComprasId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_productoId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_proveedorSugeridoId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_tareaId_fkey";

-- DropForeignKey
ALTER TABLE "DetTareasOT" DROP CONSTRAINT "DetTareasOT_contratistaId_fkey";

-- DropForeignKey
ALTER TABLE "DetTareasOT" DROP CONSTRAINT "DetTareasOT_estadoTareaId_fkey";

-- DropForeignKey
ALTER TABLE "DetTareasOT" DROP CONSTRAINT "DetTareasOT_otMantenimientoId_fkey";

-- DropForeignKey
ALTER TABLE "DetTareasOT" DROP CONSTRAINT "DetTareasOT_personalValidaId_fkey";

-- DropForeignKey
ALTER TABLE "DetTareasOT" DROP CONSTRAINT "DetTareasOT_responsableId_fkey";

-- DropForeignKey
ALTER TABLE "OTMantenimiento" DROP CONSTRAINT "OTMantenimiento_autorizadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "OTMantenimiento" DROP CONSTRAINT "OTMantenimiento_validadoPorId_fkey";

-- AlterTable
ALTER TABLE "OTMantenimiento" DROP COLUMN "autorizadoPorId",
DROP COLUMN "validadoPorId",
ADD COLUMN     "porcentajeAvance" DECIMAL(5,2),
ADD COLUMN     "totalMontoPactado" DECIMAL(18,2),
ADD COLUMN     "totalMontoPagado" DECIMAL(18,2),
ADD COLUMN     "totalSaldo" DECIMAL(18,2);

-- DropTable
DROP TABLE "DetInsumosTareaOT";

-- DropTable
DROP TABLE "DetTareasOT";

-- CreateTable
CREATE TABLE "DetContratistasOT" (
    "id" BIGSERIAL NOT NULL,
    "otMantenimientoId" BIGINT NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "contratistaId" BIGINT NOT NULL,
    "productoServicioId" BIGINT NOT NULL,
    "activoId" BIGINT,
    "servicioDescripcion" TEXT NOT NULL,
    "montoPactado" DECIMAL(18,2) NOT NULL,
    "montoPagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "preFacturaId" BIGINT,
    "urlDocumentoContratista" VARCHAR(500),
    "urlFotosProductos" VARCHAR(500),
    "urlFotosAntes" VARCHAR(500),
    "urlFotosDespues" VARCHAR(500),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DetContratistasOT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetRepuestosContratistaOT" (
    "id" BIGSERIAL NOT NULL,
    "detContratistaOTId" BIGINT NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "productoId" BIGINT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL,
    "precioUnitario" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "incluidoEnPresupuesto" BOOLEAN NOT NULL DEFAULT true,
    "ordenCompraId" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DetRepuestosContratistaOT_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetContratistasOT_otMantenimientoId_idx" ON "DetContratistasOT"("otMantenimientoId");

-- CreateIndex
CREATE INDEX "DetContratistasOT_contratistaId_idx" ON "DetContratistasOT"("contratistaId");

-- CreateIndex
CREATE INDEX "DetContratistasOT_productoServicioId_idx" ON "DetContratistasOT"("productoServicioId");

-- CreateIndex
CREATE INDEX "DetContratistasOT_activoId_idx" ON "DetContratistasOT"("activoId");

-- CreateIndex
CREATE INDEX "DetContratistasOT_monedaId_idx" ON "DetContratistasOT"("monedaId");

-- CreateIndex
CREATE INDEX "DetContratistasOT_estadoId_idx" ON "DetContratistasOT"("estadoId");

-- CreateIndex
CREATE INDEX "DetContratistasOT_preFacturaId_idx" ON "DetContratistasOT"("preFacturaId");

-- CreateIndex
CREATE UNIQUE INDEX "DetContratistasOT_otMantenimientoId_numeroLinea_key" ON "DetContratistasOT"("otMantenimientoId", "numeroLinea");

-- CreateIndex
CREATE INDEX "DetRepuestosContratistaOT_detContratistaOTId_idx" ON "DetRepuestosContratistaOT"("detContratistaOTId");

-- CreateIndex
CREATE INDEX "DetRepuestosContratistaOT_productoId_idx" ON "DetRepuestosContratistaOT"("productoId");

-- CreateIndex
CREATE INDEX "DetRepuestosContratistaOT_ordenCompraId_idx" ON "DetRepuestosContratistaOT"("ordenCompraId");

-- CreateIndex
CREATE UNIQUE INDEX "DetRepuestosContratistaOT_detContratistaOTId_numeroLinea_key" ON "DetRepuestosContratistaOT"("detContratistaOTId", "numeroLinea");

-- CreateIndex
CREATE INDEX "OTMantenimiento_empresaId_idx" ON "OTMantenimiento"("empresaId");

-- CreateIndex
CREATE INDEX "OTMantenimiento_activoId_idx" ON "OTMantenimiento"("activoId");

-- CreateIndex
CREATE INDEX "OTMantenimiento_estadoId_idx" ON "OTMantenimiento"("estadoId");

-- CreateIndex
CREATE INDEX "OTMantenimiento_tipoMantenimientoId_idx" ON "OTMantenimiento"("tipoMantenimientoId");

-- CreateIndex
CREATE INDEX "OTMantenimiento_responsableId_idx" ON "OTMantenimiento"("responsableId");

-- CreateIndex
CREATE INDEX "OTMantenimiento_fechaDocumento_idx" ON "OTMantenimiento"("fechaDocumento");

-- CreateIndex
CREATE INDEX "OTMantenimiento_fechaProgramada_idx" ON "OTMantenimiento"("fechaProgramada");

-- CreateIndex
CREATE INDEX "OTMantenimiento_fechaInicio_idx" ON "OTMantenimiento"("fechaInicio");

-- CreateIndex
CREATE INDEX "OTMantenimiento_fechaFin_idx" ON "OTMantenimiento"("fechaFin");

-- CreateIndex
CREATE INDEX "OTMantenimiento_empresaId_estadoId_idx" ON "OTMantenimiento"("empresaId", "estadoId");

-- CreateIndex
CREATE INDEX "OTMantenimiento_empresaId_activoId_idx" ON "OTMantenimiento"("empresaId", "activoId");

-- CreateIndex
CREATE INDEX "OTMantenimiento_empresaId_fechaDocumento_idx" ON "OTMantenimiento"("empresaId", "fechaDocumento");

-- CreateIndex
CREATE INDEX "OTMantenimiento_numeroCompleto_idx" ON "OTMantenimiento"("numeroCompleto");

-- CreateIndex
CREATE UNIQUE INDEX "OTMantenimiento_empresaId_numeroCompleto_key" ON "OTMantenimiento"("empresaId", "numeroCompleto");

-- AddForeignKey
ALTER TABLE "DetContratistasOT" ADD CONSTRAINT "DetContratistasOT_otMantenimientoId_fkey" FOREIGN KEY ("otMantenimientoId") REFERENCES "OTMantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetContratistasOT" ADD CONSTRAINT "DetContratistasOT_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetContratistasOT" ADD CONSTRAINT "DetContratistasOT_productoServicioId_fkey" FOREIGN KEY ("productoServicioId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetContratistasOT" ADD CONSTRAINT "DetContratistasOT_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetContratistasOT" ADD CONSTRAINT "DetContratistasOT_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetContratistasOT" ADD CONSTRAINT "DetContratistasOT_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetContratistasOT" ADD CONSTRAINT "DetContratistasOT_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetRepuestosContratistaOT" ADD CONSTRAINT "DetRepuestosContratistaOT_detContratistaOTId_fkey" FOREIGN KEY ("detContratistaOTId") REFERENCES "DetContratistasOT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetRepuestosContratistaOT" ADD CONSTRAINT "DetRepuestosContratistaOT_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetRepuestosContratistaOT" ADD CONSTRAINT "DetRepuestosContratistaOT_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetRepuestosContratistaOT" ADD CONSTRAINT "DetRepuestosContratistaOT_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
