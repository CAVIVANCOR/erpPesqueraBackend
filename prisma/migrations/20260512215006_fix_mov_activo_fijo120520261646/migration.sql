/*
  Warnings:

  - You are about to drop the column `actualizadoEn` on the `MovimientoActivoFijo` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `MovimientoActivoFijo` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[asientoContableId]` on the table `MovimientoActivoFijo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `periodoContableId` to the `MovimientoActivoFijo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MovimientoActivoFijo` table without a default value. This is not possible if the table is not empty.
  - Made the column `creadoPor` on table `MovimientoActivoFijo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `actualizadoPor` on table `MovimientoActivoFijo` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "MovimientoActivoFijo_asientoContableId_idx";

-- DropIndex
DROP INDEX "MovimientoActivoFijo_empresaId_activoId_fechaMovimiento_idx";

-- AlterTable
ALTER TABLE "MovimientoActivoFijo" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
ADD COLUMN     "centroCostoId" BIGINT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "periodoContableId" BIGINT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "creadoPor" SET NOT NULL,
ALTER COLUMN "actualizadoPor" SET NOT NULL;

-- AlterTable
ALTER TABLE "TipoActivo" ADD COLUMN     "cuentaActivoId" BIGINT,
ADD COLUMN     "cuentaDepreciacionAcumuladaId" BIGINT,
ADD COLUMN     "cuentaDepreciacionId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoActivoFijo_asientoContableId_key" ON "MovimientoActivoFijo"("asientoContableId");

-- CreateIndex
CREATE INDEX "MovimientoActivoFijo_empresaId_idx" ON "MovimientoActivoFijo"("empresaId");

-- CreateIndex
CREATE INDEX "MovimientoActivoFijo_activoId_idx" ON "MovimientoActivoFijo"("activoId");

-- CreateIndex
CREATE INDEX "MovimientoActivoFijo_periodoContableId_idx" ON "MovimientoActivoFijo"("periodoContableId");

-- CreateIndex
CREATE INDEX "MovimientoActivoFijo_fechaMovimiento_idx" ON "MovimientoActivoFijo"("fechaMovimiento");

-- AddForeignKey
ALTER TABLE "MovimientoActivoFijo" ADD CONSTRAINT "MovimientoActivoFijo_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoActivoFijo" ADD CONSTRAINT "MovimientoActivoFijo_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoActivo" ADD CONSTRAINT "TipoActivo_cuentaActivoId_fkey" FOREIGN KEY ("cuentaActivoId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoActivo" ADD CONSTRAINT "TipoActivo_cuentaDepreciacionId_fkey" FOREIGN KEY ("cuentaDepreciacionId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoActivo" ADD CONSTRAINT "TipoActivo_cuentaDepreciacionAcumuladaId_fkey" FOREIGN KEY ("cuentaDepreciacionAcumuladaId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
