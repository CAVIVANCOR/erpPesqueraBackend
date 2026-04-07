/*
  Warnings:

  - You are about to drop the column `tipoReferenciaId` on the `AsientoContableInterfaz` table. All the data in the column will be lost.
  - You are about to drop the column `tipoReferenciaId` on the `ConfiguracionCuentaContable` table. All the data in the column will be lost.
  - You are about to drop the column `tipoReferenciaId` on the `MovimientoCaja` table. All the data in the column will be lost.
  - You are about to drop the `TipoReferenciaMovimientoCaja` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[empresaId,tipoMovimientoId,medioPagoId]` on the table `ConfiguracionCuentaContable` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "AsientoContableInterfaz" DROP CONSTRAINT "AsientoContableInterfaz_tipoReferenciaId_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionCuentaContable" DROP CONSTRAINT "ConfiguracionCuentaContable_tipoReferenciaId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_tipoReferenciaId_fkey";

-- DropIndex
DROP INDEX "ConfiguracionCuentaContable_empresaId_tipoMovimientoId_tipo_key";

-- DropIndex
DROP INDEX "ConfiguracionCuentaContable_tipoMovimientoId_tipoReferencia_idx";

-- AlterTable
ALTER TABLE "AsientoContableInterfaz" DROP COLUMN "tipoReferenciaId",
ADD COLUMN     "medioPagoId" BIGINT;

-- AlterTable
ALTER TABLE "ConfiguracionCuentaContable" DROP COLUMN "tipoReferenciaId",
ADD COLUMN     "medioPagoId" BIGINT;

-- AlterTable
ALTER TABLE "MovimientoCaja" DROP COLUMN "tipoReferenciaId",
ADD COLUMN     "medioPagoId" BIGINT;

-- DropTable
DROP TABLE "TipoReferenciaMovimientoCaja";

-- CreateIndex
CREATE INDEX "ConfiguracionCuentaContable_tipoMovimientoId_medioPagoId_idx" ON "ConfiguracionCuentaContable"("tipoMovimientoId", "medioPagoId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionCuentaContable_empresaId_tipoMovimientoId_medi_key" ON "ConfiguracionCuentaContable"("empresaId", "tipoMovimientoId", "medioPagoId");

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;
