/*
  Warnings:

  - You are about to drop the column `tipoPrestamo` on the `PrestamoBancario` table. All the data in the column will be lost.
  - Added the required column `tipoPrestamoId` to the `PrestamoBancario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PrestamoBancario" DROP COLUMN "tipoPrestamo",
ADD COLUMN     "refNroProformaVentaExportacion" VARCHAR(100),
ADD COLUMN     "tipoPrestamoId" BIGINT NOT NULL;

-- DropEnum
DROP TYPE "TipoPrestamo";

-- CreateTable
CREATE TABLE "TipoPrestamo" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "descripcionCorta" VARCHAR(100),
    "requiereGarantia" BOOLEAN NOT NULL DEFAULT false,
    "esComercioExterior" BOOLEAN NOT NULL DEFAULT false,
    "esLeasing" BOOLEAN NOT NULL DEFAULT false,
    "esFactoring" BOOLEAN NOT NULL DEFAULT false,
    "permiteRefinanciar" BOOLEAN NOT NULL DEFAULT true,
    "severityColor" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "TipoPrestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TipoPrestamo_activo_idx" ON "TipoPrestamo"("activo");

-- CreateIndex
CREATE INDEX "TipoPrestamo_esComercioExterior_idx" ON "TipoPrestamo"("esComercioExterior");

-- CreateIndex
CREATE INDEX "PrestamoBancario_tipoPrestamoId_idx" ON "PrestamoBancario"("tipoPrestamoId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_refNroProformaVentaExportacion_idx" ON "PrestamoBancario"("refNroProformaVentaExportacion");

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_tipoPrestamoId_fkey" FOREIGN KEY ("tipoPrestamoId") REFERENCES "TipoPrestamo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoPrestamo" ADD CONSTRAINT "TipoPrestamo_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoPrestamo" ADD CONSTRAINT "TipoPrestamo_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
