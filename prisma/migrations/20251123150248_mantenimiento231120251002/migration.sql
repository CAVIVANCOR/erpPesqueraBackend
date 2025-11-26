/*
  Warnings:

  - You are about to drop the column `aprobacionComprasId` on the `DetInsumosTareaOT` table. All the data in the column will be lost.
  - You are about to drop the column `proveedorId` on the `DetInsumosTareaOT` table. All the data in the column will be lost.
  - You are about to drop the column `validaTerminoTareaId` on the `DetTareasOT` table. All the data in the column will be lost.
  - You are about to drop the column `fechaCreacion` on the `OTMantenimiento` table. All the data in the column will be lost.
  - Added the required column `tipoDocumentoId` to the `OTMantenimiento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DetInsumosTareaOT" DROP COLUMN "aprobacionComprasId",
DROP COLUMN "proveedorId",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "personalApruebaComprasId" BIGINT,
ADD COLUMN     "proveedorEntidadComercialId" BIGINT;

-- AlterTable
ALTER TABLE "DetTareasOT" DROP COLUMN "validaTerminoTareaId",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "personalValidaTerminoTareaId" BIGINT;

-- AlterTable
ALTER TABLE "OTMantenimiento" DROP COLUMN "fechaCreacion",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaDocumento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "numCorreDoc" VARCHAR(40),
ADD COLUMN     "numSerieDoc" VARCHAR(40),
ADD COLUMN     "numeroDocumento" TEXT,
ADD COLUMN     "serieDocId" BIGINT,
ADD COLUMN     "tipoDocumentoId" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_personalApruebaComprasId_fkey" FOREIGN KEY ("personalApruebaComprasId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_proveedorEntidadComercialId_fkey" FOREIGN KEY ("proveedorEntidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetTareasOT" ADD CONSTRAINT "DetTareasOT_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetTareasOT" ADD CONSTRAINT "DetTareasOT_personalValidaTerminoTareaId_fkey" FOREIGN KEY ("personalValidaTerminoTareaId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "SedesEmpresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_tipoProvieneDeId_fkey" FOREIGN KEY ("tipoProvieneDeId") REFERENCES "TipoProvieneDe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
