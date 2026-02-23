/*
  Warnings:

  - You are about to drop the column `comisionMantenimiento` on the `LineaCredito` table. All the data in the column will be lost.
  - You are about to drop the column `comisionUtilizacion` on the `LineaCredito` table. All the data in the column will be lost.
  - You are about to drop the column `tipoLinea` on the `LineaCredito` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LineaCredito" DROP COLUMN "comisionMantenimiento",
DROP COLUMN "comisionUtilizacion",
DROP COLUMN "tipoLinea";

-- AlterTable
ALTER TABLE "PrestamoBancario" ADD COLUMN     "sublineaCreditoId" BIGINT;

-- CreateTable
CREATE TABLE "SublineaCredito" (
    "id" BIGSERIAL NOT NULL,
    "lineaCreditoId" BIGINT NOT NULL,
    "tipoPrestamoId" BIGINT NOT NULL,
    "descripcion" VARCHAR(200),
    "montoAsignado" DECIMAL(18,2) NOT NULL,
    "montoUtilizado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "montoDisponible" DECIMAL(18,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "SublineaCredito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SublineaCredito_lineaCreditoId_idx" ON "SublineaCredito"("lineaCreditoId");

-- CreateIndex
CREATE INDEX "SublineaCredito_tipoPrestamoId_idx" ON "SublineaCredito"("tipoPrestamoId");

-- CreateIndex
CREATE INDEX "SublineaCredito_activo_idx" ON "SublineaCredito"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "SublineaCredito_lineaCreditoId_tipoPrestamoId_key" ON "SublineaCredito"("lineaCreditoId", "tipoPrestamoId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_sublineaCreditoId_idx" ON "PrestamoBancario"("sublineaCreditoId");

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_sublineaCreditoId_fkey" FOREIGN KEY ("sublineaCreditoId") REFERENCES "SublineaCredito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SublineaCredito" ADD CONSTRAINT "SublineaCredito_lineaCreditoId_fkey" FOREIGN KEY ("lineaCreditoId") REFERENCES "LineaCredito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SublineaCredito" ADD CONSTRAINT "SublineaCredito_tipoPrestamoId_fkey" FOREIGN KEY ("tipoPrestamoId") REFERENCES "TipoPrestamo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SublineaCredito" ADD CONSTRAINT "SublineaCredito_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SublineaCredito" ADD CONSTRAINT "SublineaCredito_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
