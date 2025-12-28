/*
  Warnings:

  - Added the required column `montoTotal` to the `CuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoPendiente` to the `CuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montoTotal` to the `CuentaPorPagar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoPendiente` to the `CuentaPorPagar` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CuentaPorCobrar" DROP CONSTRAINT "CuentaPorCobrar_preFacturaId_fkey";

-- DropForeignKey
ALTER TABLE "CuentaPorPagar" DROP CONSTRAINT "CuentaPorPagar_ordenCompraId_fkey";

-- AlterTable
ALTER TABLE "CuentaPorCobrar" ADD COLUMN     "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoPagado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "montoTotal" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "saldoPendiente" DECIMAL(18,2) NOT NULL,
ALTER COLUMN "preFacturaId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CuentaPorPagar" ADD COLUMN     "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoPagado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "montoTotal" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "saldoPendiente" DECIMAL(18,2) NOT NULL,
ALTER COLUMN "ordenCompraId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "precioxKgCalculoComisionPatron" DECIMAL(10,2) DEFAULT 0.00;

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_esSaldoInicial_idx" ON "CuentaPorCobrar"("esSaldoInicial");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_saldoPendiente_idx" ON "CuentaPorCobrar"("saldoPendiente");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_esSaldoInicial_idx" ON "CuentaPorPagar"("esSaldoInicial");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_saldoPendiente_idx" ON "CuentaPorPagar"("saldoPendiente");

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
