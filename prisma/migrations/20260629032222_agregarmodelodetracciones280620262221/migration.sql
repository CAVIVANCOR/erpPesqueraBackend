/*
  Warnings:

  - You are about to drop the column `fechaDetraccion` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `montoDetraccion` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `numeroConstanciaDetraccion` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `porcentajeDetraccion` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `tieneDetraccion` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PagoCuentaPorCobrar_tieneDetraccion_idx";

-- AlterTable
ALTER TABLE "PagoCuentaPorCobrar" DROP COLUMN "fechaDetraccion",
DROP COLUMN "montoDetraccion",
DROP COLUMN "numeroConstanciaDetraccion",
DROP COLUMN "porcentajeDetraccion",
DROP COLUMN "tieneDetraccion",
ADD COLUMN     "detraccionId" BIGINT;

-- CreateTable
CREATE TABLE "TipoDetraccion" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tasa" DECIMAL(5,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoDetraccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Detraccion" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "numeroConstancia" VARCHAR(50) NOT NULL,
    "fechaDeposito" TIMESTAMP(3) NOT NULL,
    "clienteId" BIGINT NOT NULL,
    "tipoDetraccionId" BIGINT,
    "tasaDetraccion" DECIMAL(5,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "importeTotal" DECIMAL(18,2) NOT NULL,
    "importeDetraido" DECIMAL(18,2) NOT NULL,
    "cuentaSunatId" BIGINT,
    "estadoId" BIGINT NOT NULL,
    "aplicado" BOOLEAN NOT NULL DEFAULT false,
    "fechaAplicacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodoContableId" BIGINT,
    "refOperacionEspecializadaMovCaja" BIGINT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "Detraccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleDetraccion" (
    "id" BIGSERIAL NOT NULL,
    "detraccionId" BIGINT NOT NULL,
    "preFacturaOrigenId" BIGINT NOT NULL,
    "importeTotal" DECIMAL(18,2) NOT NULL,
    "importeDetraido" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "DetalleDetraccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AsientoContableToDetraccion" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToDetraccion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoDetraccion_codigo_key" ON "TipoDetraccion"("codigo");

-- CreateIndex
CREATE INDEX "TipoDetraccion_activo_idx" ON "TipoDetraccion"("activo");

-- CreateIndex
CREATE INDEX "Detraccion_empresaId_fechaDeposito_idx" ON "Detraccion"("empresaId", "fechaDeposito");

-- CreateIndex
CREATE INDEX "Detraccion_clienteId_idx" ON "Detraccion"("clienteId");

-- CreateIndex
CREATE INDEX "Detraccion_estadoId_idx" ON "Detraccion"("estadoId");

-- CreateIndex
CREATE INDEX "Detraccion_aplicado_idx" ON "Detraccion"("aplicado");

-- CreateIndex
CREATE INDEX "Detraccion_periodoContableId_idx" ON "Detraccion"("periodoContableId");

-- CreateIndex
CREATE INDEX "Detraccion_numeroConstancia_idx" ON "Detraccion"("numeroConstancia");

-- CreateIndex
CREATE INDEX "Detraccion_refOperacionEspecializadaMovCaja_idx" ON "Detraccion"("refOperacionEspecializadaMovCaja");

-- CreateIndex
CREATE INDEX "DetalleDetraccion_detraccionId_idx" ON "DetalleDetraccion"("detraccionId");

-- CreateIndex
CREATE INDEX "DetalleDetraccion_preFacturaOrigenId_idx" ON "DetalleDetraccion"("preFacturaOrigenId");

-- CreateIndex
CREATE INDEX "_AsientoContableToDetraccion_B_index" ON "_AsientoContableToDetraccion"("B");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_detraccionId_idx" ON "PagoCuentaPorCobrar"("detraccionId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_refOperacionEspecializadaMovCaja_idx" ON "PagoCuentaPorCobrar"("refOperacionEspecializadaMovCaja");

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_detraccionId_fkey" FOREIGN KEY ("detraccionId") REFERENCES "Detraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_tipoDetraccionId_fkey" FOREIGN KEY ("tipoDetraccionId") REFERENCES "TipoDetraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_cuentaSunatId_fkey" FOREIGN KEY ("cuentaSunatId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detraccion" ADD CONSTRAINT "Detraccion_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDetraccion" ADD CONSTRAINT "DetalleDetraccion_detraccionId_fkey" FOREIGN KEY ("detraccionId") REFERENCES "Detraccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDetraccion" ADD CONSTRAINT "DetalleDetraccion_preFacturaOrigenId_fkey" FOREIGN KEY ("preFacturaOrigenId") REFERENCES "PreFactura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDetraccion" ADD CONSTRAINT "_AsientoContableToDetraccion_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDetraccion" ADD CONSTRAINT "_AsientoContableToDetraccion_B_fkey" FOREIGN KEY ("B") REFERENCES "Detraccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
