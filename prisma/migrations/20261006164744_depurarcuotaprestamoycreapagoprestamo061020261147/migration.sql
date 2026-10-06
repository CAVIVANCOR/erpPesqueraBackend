/*
  Warnings:

  - You are about to drop the column `movimientoCajaId` on the `CuotaPrestamo` table. All the data in the column will be lost.
  - You are about to drop the column `refOperacionEspecializadaMovCaja` on the `CuotaPrestamo` table. All the data in the column will be lost.
  - You are about to drop the `_AsientoContableToCuotaPrestamo` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `estadoCuotaId` on table `CuotaPrestamo` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CuotaPrestamo" DROP CONSTRAINT "CuotaPrestamo_estadoCuotaId_fkey";

-- DropForeignKey
ALTER TABLE "CuotaPrestamo" DROP CONSTRAINT "CuotaPrestamo_movimientoCajaId_fkey";

-- DropForeignKey
ALTER TABLE "_AsientoContableToCuotaPrestamo" DROP CONSTRAINT "_AsientoContableToCuotaPrestamo_A_fkey";

-- DropForeignKey
ALTER TABLE "_AsientoContableToCuotaPrestamo" DROP CONSTRAINT "_AsientoContableToCuotaPrestamo_B_fkey";

-- AlterTable
ALTER TABLE "CuotaPrestamo" DROP COLUMN "movimientoCajaId",
DROP COLUMN "refOperacionEspecializadaMovCaja",
ALTER COLUMN "estadoCuotaId" SET NOT NULL;

-- DropTable
DROP TABLE "_AsientoContableToCuotaPrestamo";

-- CreateTable
CREATE TABLE "PagoCuotaPrestamo" (
    "id" BIGSERIAL NOT NULL,
    "cuotaPrestamoId" BIGINT NOT NULL,
    "movimientoCajaId" BIGINT,
    "refOperacionEspecializadaMovCaja" BIGINT,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "montoCapital" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoInteres" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoSeguro" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoComision" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoMora" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoTotal" DECIMAL(18,2) NOT NULL,
    "diasMora" INTEGER,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PagoCuotaPrestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagoCuotaPrestamo_cuotaPrestamoId_idx" ON "PagoCuotaPrestamo"("cuotaPrestamoId");

-- CreateIndex
CREATE INDEX "PagoCuotaPrestamo_movimientoCajaId_idx" ON "PagoCuotaPrestamo"("movimientoCajaId");

-- CreateIndex
CREATE INDEX "PagoCuotaPrestamo_refOperacionEspecializadaMovCaja_idx" ON "PagoCuotaPrestamo"("refOperacionEspecializadaMovCaja");

-- CreateIndex
CREATE INDEX "PagoCuotaPrestamo_fechaPago_idx" ON "PagoCuotaPrestamo"("fechaPago");

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_estadoCuotaId_fkey" FOREIGN KEY ("estadoCuotaId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuotaPrestamo" ADD CONSTRAINT "PagoCuotaPrestamo_cuotaPrestamoId_fkey" FOREIGN KEY ("cuotaPrestamoId") REFERENCES "CuotaPrestamo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuotaPrestamo" ADD CONSTRAINT "PagoCuotaPrestamo_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
