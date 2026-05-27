/*
  Warnings:

  - You are about to drop the column `asientoContableId` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `fechaDetraccion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `fechaPercepcion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `fechaRetencion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `montoDetraccion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `montoPercepcion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `montoRetencion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroComprobantePercepcion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroComprobanteRetencion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroConstanciaDetraccion` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `fechaDetraccion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `fechaFacturaProveedor` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `fechaPercepcion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `fechaRetencion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `montoDetraccion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `montoPercepcion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `montoRetencion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroComprobantePercepcion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroComprobanteRetencion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroConstanciaDetraccion` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroFacturaProveedor` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `CuotaPrestamo` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `DesembolsoPrestamo` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `DeudaConPersonal` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `InversionFinanciera` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `MovimientoActivoFijo` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `MovimientoInversion` table. All the data in the column will be lost.
  - You are about to drop the column `monedaId` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `montoPago` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `monedaId` on the `PagoCuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `montoPago` on the `PagoCuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `PagoDeudaPersonal` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `PrestamoBancario` table. All the data in the column will be lost.
  - You are about to drop the column `asientoContableId` on the `SaldoCuentaCorriente` table. All the data in the column will be lost.
  - Made the column `esGerencial` on table `CuentaPorPagar` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `actualizadoEn` to the `PagoCuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `PagoCuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monedaDeudaId` to the `PagoCuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monedaPagoId` to the `PagoCuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montoAplicadoDeuda` to the `PagoCuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montoPagado` to the `PagoCuentaPorCobrar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `PagoCuentaPorPagar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `PagoCuentaPorPagar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monedaDeudaId` to the `PagoCuentaPorPagar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monedaPagoId` to the `PagoCuentaPorPagar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montoAplicadoDeuda` to the `PagoCuentaPorPagar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montoPagado` to the `PagoCuentaPorPagar` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CuentaPorCobrar" DROP CONSTRAINT "CuentaPorCobrar_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "CuentaPorPagar" DROP CONSTRAINT "CuentaPorPagar_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "CuotaPrestamo" DROP CONSTRAINT "CuotaPrestamo_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "DesembolsoPrestamo" DROP CONSTRAINT "DesembolsoPrestamo_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "DeudaConPersonal" DROP CONSTRAINT "DeudaConPersonal_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "InversionFinanciera" DROP CONSTRAINT "InversionFinanciera_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoActivoFijo" DROP CONSTRAINT "MovimientoActivoFijo_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoInversion" DROP CONSTRAINT "MovimientoInversion_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "PagoCuentaPorCobrar" DROP CONSTRAINT "PagoCuentaPorCobrar_monedaId_fkey";

-- DropForeignKey
ALTER TABLE "PagoCuentaPorPagar" DROP CONSTRAINT "PagoCuentaPorPagar_monedaId_fkey";

-- DropForeignKey
ALTER TABLE "PagoDeudaPersonal" DROP CONSTRAINT "PagoDeudaPersonal_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "PrestamoBancario" DROP CONSTRAINT "PrestamoBancario_asientoContableId_fkey";

-- DropForeignKey
ALTER TABLE "SaldoCuentaCorriente" DROP CONSTRAINT "SaldoCuentaCorriente_asientoContableId_fkey";

-- DropIndex
DROP INDEX "CuentaPorCobrar_asientoContableId_idx";

-- DropIndex
DROP INDEX "CuentaPorPagar_asientoContableId_idx";

-- DropIndex
DROP INDEX "DeudaConPersonal_asientoContableId_idx";

-- DropIndex
DROP INDEX "MovimientoActivoFijo_asientoContableId_key";

-- DropIndex
DROP INDEX "PagoCuentaPorPagar_prestamoBancarioId_idx";

-- DropIndex
DROP INDEX "PagoDeudaPersonal_asientoContableId_idx";

-- DropIndex
DROP INDEX "PrestamoBancario_asientoContableId_idx";

-- AlterTable
ALTER TABLE "CuentaPorCobrar" DROP COLUMN "asientoContableId",
DROP COLUMN "fechaDetraccion",
DROP COLUMN "fechaPercepcion",
DROP COLUMN "fechaRetencion",
DROP COLUMN "montoDetraccion",
DROP COLUMN "montoPercepcion",
DROP COLUMN "montoRetencion",
DROP COLUMN "numeroComprobantePercepcion",
DROP COLUMN "numeroComprobanteRetencion",
DROP COLUMN "numeroConstanciaDetraccion",
ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "montoDetraccionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoPercepcionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoRetencionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "porcentajeRetencion" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "CuentaPorPagar" DROP COLUMN "asientoContableId",
DROP COLUMN "fechaDetraccion",
DROP COLUMN "fechaFacturaProveedor",
DROP COLUMN "fechaPercepcion",
DROP COLUMN "fechaRetencion",
DROP COLUMN "montoDetraccion",
DROP COLUMN "montoPercepcion",
DROP COLUMN "montoRetencion",
DROP COLUMN "numeroComprobantePercepcion",
DROP COLUMN "numeroComprobanteRetencion",
DROP COLUMN "numeroConstanciaDetraccion",
DROP COLUMN "numeroFacturaProveedor",
ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "montoDetraccionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoPercepcionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoRetencionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "porcentajeRetencion" DECIMAL(5,2),
ALTER COLUMN "esGerencial" SET NOT NULL;

-- AlterTable
ALTER TABLE "CuotaPrestamo" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "DesembolsoPrestamo" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "DeudaConPersonal" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "InversionFinanciera" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "MovimientoActivoFijo" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "MovimientoInversion" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "PagoCuentaPorCobrar" DROP COLUMN "monedaId",
DROP COLUMN "montoPago",
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "empresaId" BIGINT NOT NULL,
ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaDetraccion" TIMESTAMP(3),
ADD COLUMN     "fechaPercepcion" TIMESTAMP(3),
ADD COLUMN     "fechaRetencion" TIMESTAMP(3),
ADD COLUMN     "monedaDeudaId" BIGINT NOT NULL,
ADD COLUMN     "monedaPagoId" BIGINT NOT NULL,
ADD COLUMN     "montoAplicadoDeuda" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "montoDetraccion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoPagado" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "montoPercepcion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoRetencion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "numeroComprobantePercepcion" VARCHAR(50),
ADD COLUMN     "numeroComprobanteRetencion" VARCHAR(50),
ADD COLUMN     "numeroConstanciaDetraccion" VARCHAR(50),
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "porcentajePercepcion" DECIMAL(5,2),
ADD COLUMN     "porcentajeRetencion" DECIMAL(5,2),
ADD COLUMN     "tieneDetraccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tienePercepcion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tieneRetencion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PagoCuentaPorPagar" DROP COLUMN "monedaId",
DROP COLUMN "montoPago",
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "empresaId" BIGINT NOT NULL,
ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaDetraccion" TIMESTAMP(3),
ADD COLUMN     "fechaPercepcion" TIMESTAMP(3),
ADD COLUMN     "fechaRetencion" TIMESTAMP(3),
ADD COLUMN     "monedaDeudaId" BIGINT NOT NULL,
ADD COLUMN     "monedaPagoId" BIGINT NOT NULL,
ADD COLUMN     "montoAplicadoDeuda" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "montoDetraccion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoPagado" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "montoPercepcion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoRetencion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "numeroComprobantePercepcion" VARCHAR(50),
ADD COLUMN     "numeroComprobanteRetencion" VARCHAR(50),
ADD COLUMN     "numeroConstanciaDetraccion" VARCHAR(50),
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "porcentajePercepcion" DECIMAL(5,2),
ADD COLUMN     "porcentajeRetencion" DECIMAL(5,2),
ADD COLUMN     "tieneDetraccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tienePercepcion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tieneRetencion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PagoDeudaPersonal" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "PrestamoBancario" DROP COLUMN "asientoContableId";

-- AlterTable
ALTER TABLE "SaldoCuentaCorriente" DROP COLUMN "asientoContableId";

-- CreateTable
CREATE TABLE "_AsientoContableToCuotaPrestamo" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToCuotaPrestamo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToDesembolsoPrestamo" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToDesembolsoPrestamo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToInversionFinanciera" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToInversionFinanciera_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToMovimientoInversion" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToMovimientoInversion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToPrestamoBancario" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToPrestamoBancario_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToCuentaPorCobrar" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToCuentaPorCobrar_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToCuentaPorPagar" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToCuentaPorPagar_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToSaldoCuentaCorriente" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToSaldoCuentaCorriente_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToMovimientoActivoFijo" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToMovimientoActivoFijo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToDeudaConPersonal" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToDeudaConPersonal_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToPagoDeudaPersonal" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToPagoDeudaPersonal_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToPreFactura" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToPreFactura_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToOrdenCompra" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToOrdenCompra_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToPagoCuentaPorCobrar" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToPagoCuentaPorCobrar_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToPagoCuentaPorPagar" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToPagoCuentaPorPagar_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToMovimientoCaja" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToMovimientoCaja_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToMovimientoAlmacen" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToMovimientoAlmacen_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AsientoContableToCuotaPrestamo_B_index" ON "_AsientoContableToCuotaPrestamo"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToDesembolsoPrestamo_B_index" ON "_AsientoContableToDesembolsoPrestamo"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToInversionFinanciera_B_index" ON "_AsientoContableToInversionFinanciera"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToMovimientoInversion_B_index" ON "_AsientoContableToMovimientoInversion"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToPrestamoBancario_B_index" ON "_AsientoContableToPrestamoBancario"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToCuentaPorCobrar_B_index" ON "_AsientoContableToCuentaPorCobrar"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToCuentaPorPagar_B_index" ON "_AsientoContableToCuentaPorPagar"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToSaldoCuentaCorriente_B_index" ON "_AsientoContableToSaldoCuentaCorriente"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToMovimientoActivoFijo_B_index" ON "_AsientoContableToMovimientoActivoFijo"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToDeudaConPersonal_B_index" ON "_AsientoContableToDeudaConPersonal"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToPagoDeudaPersonal_B_index" ON "_AsientoContableToPagoDeudaPersonal"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToPreFactura_B_index" ON "_AsientoContableToPreFactura"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToOrdenCompra_B_index" ON "_AsientoContableToOrdenCompra"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToPagoCuentaPorCobrar_B_index" ON "_AsientoContableToPagoCuentaPorCobrar"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToPagoCuentaPorPagar_B_index" ON "_AsientoContableToPagoCuentaPorPagar"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToMovimientoCaja_B_index" ON "_AsientoContableToMovimientoCaja"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToMovimientoAlmacen_B_index" ON "_AsientoContableToMovimientoAlmacen"("B");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_periodoContableId_idx" ON "CuentaPorCobrar"("periodoContableId");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_periodoContableId_idx" ON "CuentaPorPagar"("periodoContableId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_empresaId_idx" ON "PagoCuentaPorCobrar"("empresaId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_monedaPagoId_idx" ON "PagoCuentaPorCobrar"("monedaPagoId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_monedaDeudaId_idx" ON "PagoCuentaPorCobrar"("monedaDeudaId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_periodoContableId_idx" ON "PagoCuentaPorCobrar"("periodoContableId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_tieneDetraccion_idx" ON "PagoCuentaPorCobrar"("tieneDetraccion");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_tieneRetencion_idx" ON "PagoCuentaPorCobrar"("tieneRetencion");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_tienePercepcion_idx" ON "PagoCuentaPorCobrar"("tienePercepcion");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_empresaId_idx" ON "PagoCuentaPorPagar"("empresaId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_monedaPagoId_idx" ON "PagoCuentaPorPagar"("monedaPagoId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_monedaDeudaId_idx" ON "PagoCuentaPorPagar"("monedaDeudaId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_periodoContableId_idx" ON "PagoCuentaPorPagar"("periodoContableId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_tieneDetraccion_idx" ON "PagoCuentaPorPagar"("tieneDetraccion");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_tieneRetencion_idx" ON "PagoCuentaPorPagar"("tieneRetencion");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_tienePercepcion_idx" ON "PagoCuentaPorPagar"("tienePercepcion");

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_monedaPagoId_fkey" FOREIGN KEY ("monedaPagoId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_monedaDeudaId_fkey" FOREIGN KEY ("monedaDeudaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_monedaPagoId_fkey" FOREIGN KEY ("monedaPagoId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_monedaDeudaId_fkey" FOREIGN KEY ("monedaDeudaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToCuotaPrestamo" ADD CONSTRAINT "_AsientoContableToCuotaPrestamo_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToCuotaPrestamo" ADD CONSTRAINT "_AsientoContableToCuotaPrestamo_B_fkey" FOREIGN KEY ("B") REFERENCES "CuotaPrestamo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDesembolsoPrestamo" ADD CONSTRAINT "_AsientoContableToDesembolsoPrestamo_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDesembolsoPrestamo" ADD CONSTRAINT "_AsientoContableToDesembolsoPrestamo_B_fkey" FOREIGN KEY ("B") REFERENCES "DesembolsoPrestamo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToInversionFinanciera" ADD CONSTRAINT "_AsientoContableToInversionFinanciera_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToInversionFinanciera" ADD CONSTRAINT "_AsientoContableToInversionFinanciera_B_fkey" FOREIGN KEY ("B") REFERENCES "InversionFinanciera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoInversion" ADD CONSTRAINT "_AsientoContableToMovimientoInversion_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoInversion" ADD CONSTRAINT "_AsientoContableToMovimientoInversion_B_fkey" FOREIGN KEY ("B") REFERENCES "MovimientoInversion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPrestamoBancario" ADD CONSTRAINT "_AsientoContableToPrestamoBancario_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPrestamoBancario" ADD CONSTRAINT "_AsientoContableToPrestamoBancario_B_fkey" FOREIGN KEY ("B") REFERENCES "PrestamoBancario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToCuentaPorCobrar" ADD CONSTRAINT "_AsientoContableToCuentaPorCobrar_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToCuentaPorCobrar" ADD CONSTRAINT "_AsientoContableToCuentaPorCobrar_B_fkey" FOREIGN KEY ("B") REFERENCES "CuentaPorCobrar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToCuentaPorPagar" ADD CONSTRAINT "_AsientoContableToCuentaPorPagar_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToCuentaPorPagar" ADD CONSTRAINT "_AsientoContableToCuentaPorPagar_B_fkey" FOREIGN KEY ("B") REFERENCES "CuentaPorPagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToSaldoCuentaCorriente" ADD CONSTRAINT "_AsientoContableToSaldoCuentaCorriente_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToSaldoCuentaCorriente" ADD CONSTRAINT "_AsientoContableToSaldoCuentaCorriente_B_fkey" FOREIGN KEY ("B") REFERENCES "SaldoCuentaCorriente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoActivoFijo" ADD CONSTRAINT "_AsientoContableToMovimientoActivoFijo_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoActivoFijo" ADD CONSTRAINT "_AsientoContableToMovimientoActivoFijo_B_fkey" FOREIGN KEY ("B") REFERENCES "MovimientoActivoFijo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDeudaConPersonal" ADD CONSTRAINT "_AsientoContableToDeudaConPersonal_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDeudaConPersonal" ADD CONSTRAINT "_AsientoContableToDeudaConPersonal_B_fkey" FOREIGN KEY ("B") REFERENCES "DeudaConPersonal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoDeudaPersonal" ADD CONSTRAINT "_AsientoContableToPagoDeudaPersonal_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoDeudaPersonal" ADD CONSTRAINT "_AsientoContableToPagoDeudaPersonal_B_fkey" FOREIGN KEY ("B") REFERENCES "PagoDeudaPersonal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPreFactura" ADD CONSTRAINT "_AsientoContableToPreFactura_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPreFactura" ADD CONSTRAINT "_AsientoContableToPreFactura_B_fkey" FOREIGN KEY ("B") REFERENCES "PreFactura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToOrdenCompra" ADD CONSTRAINT "_AsientoContableToOrdenCompra_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToOrdenCompra" ADD CONSTRAINT "_AsientoContableToOrdenCompra_B_fkey" FOREIGN KEY ("B") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoCuentaPorCobrar" ADD CONSTRAINT "_AsientoContableToPagoCuentaPorCobrar_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoCuentaPorCobrar" ADD CONSTRAINT "_AsientoContableToPagoCuentaPorCobrar_B_fkey" FOREIGN KEY ("B") REFERENCES "PagoCuentaPorCobrar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoCuentaPorPagar" ADD CONSTRAINT "_AsientoContableToPagoCuentaPorPagar_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoCuentaPorPagar" ADD CONSTRAINT "_AsientoContableToPagoCuentaPorPagar_B_fkey" FOREIGN KEY ("B") REFERENCES "PagoCuentaPorPagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoCaja" ADD CONSTRAINT "_AsientoContableToMovimientoCaja_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoCaja" ADD CONSTRAINT "_AsientoContableToMovimientoCaja_B_fkey" FOREIGN KEY ("B") REFERENCES "MovimientoCaja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoAlmacen" ADD CONSTRAINT "_AsientoContableToMovimientoAlmacen_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToMovimientoAlmacen" ADD CONSTRAINT "_AsientoContableToMovimientoAlmacen_B_fkey" FOREIGN KEY ("B") REFERENCES "MovimientoAlmacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
