/*
  Warnings:

  - You are about to drop the column `cantidad` on the `DetInsumosTareaOT` table. All the data in the column will be lost.
  - You are about to drop the column `costoUnitario` on the `DetInsumosTareaOT` table. All the data in the column will be lost.
  - You are about to drop the column `proveedorEntidadComercialId` on the `DetInsumosTareaOT` table. All the data in the column will be lost.
  - You are about to drop the column `adjuntoCotizacionDos` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `adjuntoCotizacionUno` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `fechaValidaTerminoTarea` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `personalValidaTerminoTareaId` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `urlCotizacionDosPdf` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `urlCotizacionUnoPdf` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `urlFotosAntesPdf` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `causa` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `docOrigenProvieneId` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `numCorreDoc` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `numSerieDoc` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `solucion` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `tipoProvieneDeId` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `urlFotosAntesDeOTPdf` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `urlFotosDespuesDeOTPdf` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to alter the column `nombre` on the `TipoMantenimiento` table. The data in that column could be lost. The data in that column will be cast from `VarChar(40)` to `VarChar(20)`.
  - A unique constraint covering the columns `[otMantenimientoId,numeroTarea]` on the table `DetTareasOT` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre]` on the table `TipoMantenimiento` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cantidadRequerida` to the `DetInsumosTareaOT` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoInsumoId` to the `DetInsumosTareaOT` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoTareaId` to the `DetTareasOT` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numeroTarea` to the `DetTareasOT` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monedaId` to the `OTMantenimiento` table without a default value. This is not possible if the table is not empty.
  - Made the column `activoId` on table `OTMantenimiento` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_proveedorEntidadComercialId_fkey";

-- DropForeignKey
ALTER TABLE "DetInsumosTareaOT" DROP CONSTRAINT "DetInsumosTareaOT_tareaId_fkey";

-- DropForeignKey
ALTER TABLE "DetTareasOT" DROP CONSTRAINT "DetTareasOT_otMantenimientoId_fkey";

-- DropForeignKey
ALTER TABLE "DetTareasOT" DROP CONSTRAINT "DetTareasOT_personalValidaTerminoTareaId_fkey";

-- DropForeignKey
ALTER TABLE "OTMantenimiento" DROP CONSTRAINT "OTMantenimiento_activoId_fkey";

-- DropForeignKey
ALTER TABLE "OTMantenimiento" DROP CONSTRAINT "OTMantenimiento_tipoProvieneDeId_fkey";

-- AlterTable
ALTER TABLE "DetInsumosTareaOT" DROP COLUMN "cantidad",
DROP COLUMN "costoUnitario",
DROP COLUMN "proveedorEntidadComercialId",
ADD COLUMN     "cantidadConsumida" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "cantidadRequerida" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "detalleMovAlmacenId" BIGINT,
ADD COLUMN     "detalleOrdenCompraId" BIGINT,
ADD COLUMN     "estadoInsumoId" BIGINT NOT NULL,
ADD COLUMN     "movimientoAlmacenId" BIGINT,
ADD COLUMN     "ordenCompraId" BIGINT,
ADD COLUMN     "proveedorSugeridoId" BIGINT;

-- AlterTable
ALTER TABLE "DetTareasOT" DROP COLUMN "adjuntoCotizacionDos",
DROP COLUMN "adjuntoCotizacionUno",
DROP COLUMN "fechaValidaTerminoTarea",
DROP COLUMN "personalValidaTerminoTareaId",
DROP COLUMN "urlCotizacionDosPdf",
DROP COLUMN "urlCotizacionUnoPdf",
DROP COLUMN "urlFotosAntesPdf",
ADD COLUMN     "contratistaId" BIGINT,
ADD COLUMN     "estadoTareaId" BIGINT NOT NULL,
ADD COLUMN     "numeroTarea" INTEGER NOT NULL,
ADD COLUMN     "personalValidaId" BIGINT;

-- AlterTable
ALTER TABLE "OTMantenimiento" DROP COLUMN "causa",
DROP COLUMN "descripcion",
DROP COLUMN "docOrigenProvieneId",
DROP COLUMN "numCorreDoc",
DROP COLUMN "numSerieDoc",
DROP COLUMN "solucion",
DROP COLUMN "tipoProvieneDeId",
DROP COLUMN "urlFotosAntesDeOTPdf",
DROP COLUMN "urlFotosDespuesDeOTPdf",
ADD COLUMN     "descripcionProblema" TEXT,
ADD COLUMN     "monedaId" BIGINT NOT NULL,
ADD COLUMN     "planMantenimientoId" BIGINT,
ADD COLUMN     "solucionAplicada" TEXT,
ADD COLUMN     "urlFotosAntesPdf" TEXT,
ADD COLUMN     "urlFotosDespuesPdf" TEXT,
ADD COLUMN     "validadoPorId" BIGINT,
ALTER COLUMN "activoId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TipoMantenimiento" ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "descripcion" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DetTareasOT_otMantenimientoId_numeroTarea_key" ON "DetTareasOT"("otMantenimientoId", "numeroTarea");

-- CreateIndex
CREATE UNIQUE INDEX "TipoMantenimiento_nombre_key" ON "TipoMantenimiento"("nombre");

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetTareasOT" ADD CONSTRAINT "DetTareasOT_otMantenimientoId_fkey" FOREIGN KEY ("otMantenimientoId") REFERENCES "OTMantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetTareasOT" ADD CONSTRAINT "DetTareasOT_estadoTareaId_fkey" FOREIGN KEY ("estadoTareaId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetTareasOT" ADD CONSTRAINT "DetTareasOT_personalValidaId_fkey" FOREIGN KEY ("personalValidaId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetTareasOT" ADD CONSTRAINT "DetTareasOT_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "DetTareasOT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_estadoInsumoId_fkey" FOREIGN KEY ("estadoInsumoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_movimientoAlmacenId_fkey" FOREIGN KEY ("movimientoAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_detalleMovAlmacenId_fkey" FOREIGN KEY ("detalleMovAlmacenId") REFERENCES "DetalleMovimientoAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_detalleOrdenCompraId_fkey" FOREIGN KEY ("detalleOrdenCompraId") REFERENCES "DetalleOrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_proveedorSugeridoId_fkey" FOREIGN KEY ("proveedorSugeridoId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
