/*
  Warnings:

  - You are about to drop the `UtilizacionLineaCredito` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoPrestamo" ADD VALUE 'CARTA_CREDITO';
ALTER TYPE "TipoPrestamo" ADD VALUE 'GARANTIA_BANCARIA';
ALTER TYPE "TipoPrestamo" ADD VALUE 'LINEA_REVOLVENTE';

-- DropForeignKey
ALTER TABLE "UtilizacionLineaCredito" DROP CONSTRAINT "UtilizacionLineaCredito_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "UtilizacionLineaCredito" DROP CONSTRAINT "UtilizacionLineaCredito_lineaCreditoId_fkey";

-- DropForeignKey
ALTER TABLE "UtilizacionLineaCredito" DROP CONSTRAINT "UtilizacionLineaCredito_movimientoCajaDevolucionId_fkey";

-- DropForeignKey
ALTER TABLE "UtilizacionLineaCredito" DROP CONSTRAINT "UtilizacionLineaCredito_movimientoCajaUtilizacionId_fkey";

-- AlterTable
ALTER TABLE "PrestamoBancario" ADD COLUMN     "asientoContableId" BIGINT,
ADD COLUMN     "beneficiario" VARCHAR(200),
ADD COLUMN     "esRevolvente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "fechaExpiracion" TIMESTAMP(3),
ADD COLUMN     "lineaCreditoId" BIGINT,
ADD COLUMN     "movimientoCajaDesembolsoId" BIGINT,
ADD COLUMN     "numeroCartaCredito" VARCHAR(50),
ADD COLUMN     "numeroGarantia" VARCHAR(50),
ADD COLUMN     "permitePagoParcial" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "UtilizacionLineaCredito";

-- DropEnum
DROP TYPE "EstadoUtilizacionLinea";

-- CreateIndex
CREATE INDEX "PrestamoBancario_lineaCreditoId_idx" ON "PrestamoBancario"("lineaCreditoId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_movimientoCajaDesembolsoId_idx" ON "PrestamoBancario"("movimientoCajaDesembolsoId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_asientoContableId_idx" ON "PrestamoBancario"("asientoContableId");

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_lineaCreditoId_fkey" FOREIGN KEY ("lineaCreditoId") REFERENCES "LineaCredito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_movimientoCajaDesembolsoId_fkey" FOREIGN KEY ("movimientoCajaDesembolsoId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
