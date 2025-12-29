-- AlterEnum
ALTER TYPE "FrecuenciaPago" ADD VALUE 'DIAS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoPrestamo" ADD VALUE 'COMEX_PRE';
ALTER TYPE "TipoPrestamo" ADD VALUE 'COMEX_POST';
ALTER TYPE "TipoPrestamo" ADD VALUE 'FEC';
ALTER TYPE "TipoPrestamo" ADD VALUE 'FACTORING';
ALTER TYPE "TipoPrestamo" ADD VALUE 'FACTORING_INDIRECTO';
ALTER TYPE "TipoPrestamo" ADD VALUE 'LEASING_VEHICULAR';
ALTER TYPE "TipoPrestamo" ADD VALUE 'LEASING_INMOBILIARIO';
ALTER TYPE "TipoPrestamo" ADD VALUE 'WARRANT';

-- AlterTable
ALTER TABLE "PrestamoBancario" ADD COLUMN     "numeroDias" INTEGER;

-- CreateTable
CREATE TABLE "CronogramaPrestamo" (
    "id" BIGSERIAL NOT NULL,
    "prestamoBancarioId" BIGINT NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "montoPrincipal" DECIMAL(18,2) NOT NULL,
    "montoInteres" DECIMAL(18,2) NOT NULL,
    "montoTotal" DECIMAL(18,2) NOT NULL,
    "saldoPendiente" DECIMAL(18,2) NOT NULL,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" TIMESTAMP(3),

    CONSTRAINT "CronogramaPrestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronogramaPrestamo_prestamoBancarioId_idx" ON "CronogramaPrestamo"("prestamoBancarioId");

-- AddForeignKey
ALTER TABLE "CronogramaPrestamo" ADD CONSTRAINT "CronogramaPrestamo_prestamoBancarioId_fkey" FOREIGN KEY ("prestamoBancarioId") REFERENCES "PrestamoBancario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
