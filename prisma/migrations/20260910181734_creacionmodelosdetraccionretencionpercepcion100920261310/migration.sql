/*
  Warnings:

  - You are about to drop the column `clienteId` on the `Detraccion` table. All the data in the column will be lost.
  - You are about to drop the column `cuentaSunatId` on the `Detraccion` table. All the data in the column will be lost.
  - You are about to drop the column `estadoId` on the `Detraccion` table. All the data in the column will be lost.
  - You are about to drop the column `fechaDeposito` on the `Detraccion` table. All the data in the column will be lost.
  - You are about to drop the column `importeDetraido` on the `Detraccion` table. All the data in the column will be lost.
  - You are about to drop the column `numeroConstancia` on the `Detraccion` table. All the data in the column will be lost.
  - You are about to drop the column `refOperacionEspecializadaMovCaja` on the `Detraccion` table. All the data in the column will be lost.
  - You are about to drop the column `actualizadoEn` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `cuentaPorPagarId` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `estadoId` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `fechaCobro` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `importePercibido` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `numCorreDoc` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `numSerieDoc` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `numeroDocProveedor` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `proveedorId` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `razonSocialProveedor` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `serieDocId` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `tipoDocProveedorId` on the `Percepcion` table. All the data in the column will be lost.
  - You are about to drop the column `actualizadoEn` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `cuentaPorPagarId` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `estadoId` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `fechaPago` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `importeNeto` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `importeRetenido` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `movimientoCajaId` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `numCorreDoc` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `numSerieDoc` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `numeroDocProveedor` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `proveedorId` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `razonSocialProveedor` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `serieDocId` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the column `tipoDocProveedorId` on the `Retencion` table. All the data in the column will be lost.
  - You are about to drop the `DetalleDetraccion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetallePercepcion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetalleRetencion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AsientoContableToDetraccion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[preFacturaId]` on the table `Detraccion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ordenCompraId]` on the table `Detraccion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[preFacturaId]` on the table `Percepcion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ordenCompraId]` on the table `Percepcion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[preFacturaId]` on the table `Retencion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ordenCompraId]` on the table `Retencion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entidadComercialId` to the `Detraccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoPagoId` to the `Detraccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importeRequerido` to the `Detraccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoPendiente` to the `Detraccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entidadComercialId` to the `Percepcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoPagoId` to the `Percepcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importeRequerido` to the `Percepcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoPendiente` to the `Percepcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entidadComercialId` to the `Retencion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoPagoId` to the `Retencion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importeRequerido` to the `Retencion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoPendiente` to the `Retencion` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DetalleDetraccion" DROP CONSTRAINT "DetalleDetraccion_detraccionId_fkey";

-- DropForeignKey
ALTER TABLE "DetalleDetraccion" DROP CONSTRAINT "DetalleDetraccion_preFacturaOrigenId_fkey";

-- DropForeignKey
ALTER TABLE "DetallePercepcion" DROP CONSTRAINT "DetallePercepcion_percepcionId_fkey";

-- DropForeignKey
ALTER TABLE "DetallePercepcion" DROP CONSTRAINT "DetallePercepcion_tipoDocumentoId_fkey";

-- DropForeignKey
ALTER TABLE "DetalleRetencion" DROP CONSTRAINT "DetalleRetencion_retencionId_fkey";

-- DropForeignKey
ALTER TABLE "DetalleRetencion" DROP CONSTRAINT "DetalleRetencion_tipoDocumentoId_fkey";

-- DropForeignKey
ALTER TABLE "Detraccion" DROP CONSTRAINT "Detraccion_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Detraccion" DROP CONSTRAINT "Detraccion_cuentaSunatId_fkey";

-- DropForeignKey
ALTER TABLE "Detraccion" DROP CONSTRAINT "Detraccion_estadoId_fkey";

-- DropForeignKey
ALTER TABLE "Percepcion" DROP CONSTRAINT "Percepcion_cuentaPorPagarId_fkey";

-- DropForeignKey
ALTER TABLE "Percepcion" DROP CONSTRAINT "Percepcion_estadoId_fkey";

-- DropForeignKey
ALTER TABLE "Percepcion" DROP CONSTRAINT "Percepcion_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "Percepcion" DROP CONSTRAINT "Percepcion_serieDocId_fkey";

-- DropForeignKey
ALTER TABLE "Percepcion" DROP CONSTRAINT "Percepcion_tipoDocProveedorId_fkey";

-- DropForeignKey
ALTER TABLE "Percepcion" DROP CONSTRAINT "Percepcion_tipoDocumentoId_fkey";

-- DropForeignKey
ALTER TABLE "Percepcion" DROP CONSTRAINT "Percepcion_tipoPercepcionId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_cuentaPorPagarId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_estadoId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_movimientoCajaId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_serieDocId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_tipoDocProveedorId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_tipoDocumentoId_fkey";

-- DropForeignKey
ALTER TABLE "Retencion" DROP CONSTRAINT "Retencion_tipoRetencionId_fkey";

-- DropForeignKey
ALTER TABLE "_AsientoContableToDetraccion" DROP CONSTRAINT "_AsientoContableToDetraccion_A_fkey";

-- DropForeignKey
ALTER TABLE "_AsientoContableToDetraccion" DROP CONSTRAINT "_AsientoContableToDetraccion_B_fkey";

-- DropIndex
DROP INDEX "Detraccion_clienteId_idx";

-- DropIndex
DROP INDEX "Detraccion_empresaId_fechaDeposito_idx";

-- DropIndex
DROP INDEX "Detraccion_estadoId_idx";

-- DropIndex
DROP INDEX "Detraccion_numeroConstancia_idx";

-- DropIndex
DROP INDEX "Detraccion_refOperacionEspecializadaMovCaja_idx";

-- DropIndex
DROP INDEX "Percepcion_empresaId_fechaEmision_idx";

-- DropIndex
DROP INDEX "Percepcion_estadoId_idx";

-- DropIndex
DROP INDEX "Percepcion_proveedorId_idx";

-- DropIndex
DROP INDEX "Retencion_empresaId_fechaEmision_idx";

-- DropIndex
DROP INDEX "Retencion_estadoId_idx";

-- DropIndex
DROP INDEX "Retencion_proveedorId_idx";

-- AlterTable
ALTER TABLE "AsientoContable" ADD COLUMN     "detraccionId" BIGINT,
ADD COLUMN     "percepcionId" BIGINT,
ADD COLUMN     "retencionId" BIGINT;

-- AlterTable
ALTER TABLE "Detraccion" DROP COLUMN "clienteId",
DROP COLUMN "cuentaSunatId",
DROP COLUMN "estadoId",
DROP COLUMN "fechaDeposito",
DROP COLUMN "importeDetraido",
DROP COLUMN "numeroConstancia",
DROP COLUMN "refOperacionEspecializadaMovCaja",
ADD COLUMN     "cuentaBNSunatPropiaId" BIGINT,
ADD COLUMN     "cuentaBNSunatProveedorId" BIGINT,
ADD COLUMN     "entidadComercialId" BIGINT NOT NULL,
ADD COLUMN     "estadoPagoId" BIGINT NOT NULL,
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "importePagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "importeRequerido" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "numeroDocumento" VARCHAR(40),
ADD COLUMN     "ordenCompraId" BIGINT,
ADD COLUMN     "origenOperacionComprasVentas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preFacturaId" BIGINT,
ADD COLUMN     "saldoPendiente" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "tipoDocumentoId" BIGINT;

-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "cuentaPorCobrarId" BIGINT,
ADD COLUMN     "cuentaPorPagarId" BIGINT,
ADD COLUMN     "detraccionId" BIGINT,
ADD COLUMN     "fechaOperacionPagoBanco" TIMESTAMP(3),
ADD COLUMN     "fechaOperacionPagoBancoImpuesto" TIMESTAMP(3),
ADD COLUMN     "numeroOperacionPagoBanco" VARCHAR(50),
ADD COLUMN     "numeroOperacionPagoBancoImpuesto" VARCHAR(50),
ADD COLUMN     "percepcionId" BIGINT,
ADD COLUMN     "retencionId" BIGINT;

-- AlterTable
ALTER TABLE "Percepcion" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
DROP COLUMN "cuentaPorPagarId",
DROP COLUMN "estadoId",
DROP COLUMN "fechaCobro",
DROP COLUMN "importePercibido",
DROP COLUMN "numCorreDoc",
DROP COLUMN "numSerieDoc",
DROP COLUMN "numeroDocProveedor",
DROP COLUMN "proveedorId",
DROP COLUMN "razonSocialProveedor",
DROP COLUMN "serieDocId",
DROP COLUMN "tipoDocProveedorId",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "entidadComercialId" BIGINT NOT NULL,
ADD COLUMN     "estadoPagoId" BIGINT NOT NULL,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "importeRequerido" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "origenOperacionComprasVentas" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "preFacturaId" BIGINT,
ADD COLUMN     "saldoPendiente" DECIMAL(18,2) NOT NULL,
ALTER COLUMN "tipoDocumentoId" DROP NOT NULL,
ALTER COLUMN "fechaEmision" DROP NOT NULL,
ALTER COLUMN "tipoPercepcionId" DROP NOT NULL,
ALTER COLUMN "importePagado" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Retencion" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
DROP COLUMN "cuentaPorPagarId",
DROP COLUMN "estadoId",
DROP COLUMN "fechaPago",
DROP COLUMN "importeNeto",
DROP COLUMN "importeRetenido",
DROP COLUMN "movimientoCajaId",
DROP COLUMN "numCorreDoc",
DROP COLUMN "numSerieDoc",
DROP COLUMN "numeroDocProveedor",
DROP COLUMN "proveedorId",
DROP COLUMN "razonSocialProveedor",
DROP COLUMN "serieDocId",
DROP COLUMN "tipoDocProveedorId",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "aplicadaCredito" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "entidadComercialId" BIGINT NOT NULL,
ADD COLUMN     "estadoPagoId" BIGINT NOT NULL,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaAplicacion" TIMESTAMP(3),
ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "importePagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "importeRequerido" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "ordenCompraId" BIGINT,
ADD COLUMN     "origenOperacionComprasVentas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "periodoAplicacion" VARCHAR(6),
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "preFacturaId" BIGINT,
ADD COLUMN     "saldoPendiente" DECIMAL(18,2) NOT NULL,
ALTER COLUMN "tipoDocumentoId" DROP NOT NULL,
ALTER COLUMN "fechaEmision" DROP NOT NULL,
ALTER COLUMN "tipoRetencionId" DROP NOT NULL;

-- DropTable
DROP TABLE "DetalleDetraccion";

-- DropTable
DROP TABLE "DetallePercepcion";

-- DropTable
DROP TABLE "DetalleRetencion";

-- DropTable
DROP TABLE "_AsientoContableToDetraccion";

-- CreateIndex
CREATE INDEX "AsientoContable_detraccionId_idx" ON "AsientoContable"("detraccionId");

-- CreateIndex
CREATE INDEX "AsientoContable_retencionId_idx" ON "AsientoContable"("retencionId");

-- CreateIndex
CREATE INDEX "AsientoContable_percepcionId_idx" ON "AsientoContable"("percepcionId");

-- CreateIndex
CREATE UNIQUE INDEX "Detraccion_preFacturaId_key" ON "Detraccion"("preFacturaId");

-- CreateIndex
CREATE UNIQUE INDEX "Detraccion_ordenCompraId_key" ON "Detraccion"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Detraccion_empresaId_idx" ON "Detraccion"("empresaId");

-- CreateIndex
CREATE INDEX "Detraccion_preFacturaId_idx" ON "Detraccion"("preFacturaId");

-- CreateIndex
CREATE INDEX "Detraccion_ordenCompraId_idx" ON "Detraccion"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Detraccion_entidadComercialId_idx" ON "Detraccion"("entidadComercialId");

-- CreateIndex
CREATE INDEX "Detraccion_estadoPagoId_idx" ON "Detraccion"("estadoPagoId");

-- CreateIndex
CREATE INDEX "Detraccion_origenOperacionComprasVentas_idx" ON "Detraccion"("origenOperacionComprasVentas");

-- CreateIndex
CREATE INDEX "Detraccion_fechaContable_idx" ON "Detraccion"("fechaContable");

-- CreateIndex
CREATE INDEX "Detraccion_numeroDocumento_idx" ON "Detraccion"("numeroDocumento");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cuentaPorCobrarId_idx" ON "MovimientoCaja"("cuentaPorCobrarId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cuentaPorPagarId_idx" ON "MovimientoCaja"("cuentaPorPagarId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_detraccionId_idx" ON "MovimientoCaja"("detraccionId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_retencionId_idx" ON "MovimientoCaja"("retencionId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_percepcionId_idx" ON "MovimientoCaja"("percepcionId");

-- CreateIndex
CREATE UNIQUE INDEX "Percepcion_preFacturaId_key" ON "Percepcion"("preFacturaId");

-- CreateIndex
CREATE UNIQUE INDEX "Percepcion_ordenCompraId_key" ON "Percepcion"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Percepcion_empresaId_idx" ON "Percepcion"("empresaId");

-- CreateIndex
CREATE INDEX "Percepcion_preFacturaId_idx" ON "Percepcion"("preFacturaId");

-- CreateIndex
CREATE INDEX "Percepcion_ordenCompraId_idx" ON "Percepcion"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Percepcion_entidadComercialId_idx" ON "Percepcion"("entidadComercialId");

-- CreateIndex
CREATE INDEX "Percepcion_estadoPagoId_idx" ON "Percepcion"("estadoPagoId");

-- CreateIndex
CREATE INDEX "Percepcion_origenOperacionComprasVentas_idx" ON "Percepcion"("origenOperacionComprasVentas");

-- CreateIndex
CREATE INDEX "Percepcion_fechaContable_idx" ON "Percepcion"("fechaContable");

-- CreateIndex
CREATE UNIQUE INDEX "Retencion_preFacturaId_key" ON "Retencion"("preFacturaId");

-- CreateIndex
CREATE UNIQUE INDEX "Retencion_ordenCompraId_key" ON "Retencion"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Retencion_empresaId_idx" ON "Retencion"("empresaId");

-- CreateIndex
CREATE INDEX "Retencion_preFacturaId_idx" ON "Retencion"("preFacturaId");

-- CreateIndex
CREATE INDEX "Retencion_ordenCompraId_idx" ON "Retencion"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Retencion_entidadComercialId_idx" ON "Retencion"("entidadComercialId");

-- CreateIndex
CREATE INDEX "Retencion_estadoPagoId_idx" ON "Retencion"("estadoPagoId");

-- CreateIndex
CREATE INDEX "Retencion_origenOperacionComprasVentas_idx" ON "Retencion"("origenOperacionComprasVentas");

-- CreateIndex
CREATE INDEX "Retencion_aplicadaCredito_idx" ON "Retencion"("aplicadaCredito");

-- CreateIndex
CREATE INDEX "Retencion_fechaContable_idx" ON "Retencion"("fechaContable");

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_detraccionId_fkey" FOREIGN KEY ("detraccionId") REFERENCES "Detraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_retencionId_fkey" FOREIGN KEY ("retencionId") REFERENCES "Retencion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_percepcionId_fkey" FOREIGN KEY ("percepcionId") REFERENCES "Percepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_detraccionId_fkey" FOREIGN KEY ("detraccionId") REFERENCES "Detraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_retencionId_fkey" FOREIGN KEY ("retencionId") REFERENCES "Retencion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_percepcionId_fkey" FOREIGN KEY ("percepcionId") REFERENCES "Percepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_estadoPagoId_fkey" FOREIGN KEY ("estadoPagoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_cuentaBNSunatPropiaId_fkey" FOREIGN KEY ("cuentaBNSunatPropiaId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_cuentaBNSunatProveedorId_fkey" FOREIGN KEY ("cuentaBNSunatProveedorId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_tipoRetencionId_fkey" FOREIGN KEY ("tipoRetencionId") REFERENCES "TipoRetencionPercepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_estadoPagoId_fkey" FOREIGN KEY ("estadoPagoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_tipoPercepcionId_fkey" FOREIGN KEY ("tipoPercepcionId") REFERENCES "TipoRetencionPercepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_estadoPagoId_fkey" FOREIGN KEY ("estadoPagoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
