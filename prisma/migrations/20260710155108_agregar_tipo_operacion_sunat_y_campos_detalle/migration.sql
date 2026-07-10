/*
  Warnings:

  - You are about to alter the column `montoMinimoRetencion` on the `Empresa` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to drop the column `tipoAfectacionIGVId` on the `OrdenCompra` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrdenCompra" DROP CONSTRAINT "OrdenCompra_tipoAfectacionIGVId_fkey";

-- DropIndex
DROP INDEX "OrdenCompra_tipoAfectacionIGVId_idx";

-- AlterTable
ALTER TABLE "DetalleOrdenCompra" ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "tipoAfectacionIGVId" BIGINT,
ADD COLUMN     "tipoDetraccionId" BIGINT;

-- AlterTable
ALTER TABLE "DetallePreFactura" ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "tipoAfectacionIGVId" BIGINT,
ADD COLUMN     "tipoDetraccionId" BIGINT;

-- AlterTable
ALTER TABLE "Empresa" ALTER COLUMN "montoMinimoRetencion" SET DEFAULT 700.00,
ALTER COLUMN "montoMinimoRetencion" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "nubefactToken" SET DATA TYPE TEXT,
ALTER COLUMN "nubefactUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "OrdenCompra" DROP COLUMN "tipoAfectacionIGVId",
ADD COLUMN     "tipoOperacionSunatId" BIGINT;

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "tipoOperacionSunatId" BIGINT;

-- CreateTable
CREATE TABLE "TipoOperacionSunat" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(4) NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,

    CONSTRAINT "TipoOperacionSunat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoOperacionSunat_codigo_key" ON "TipoOperacionSunat"("codigo");

-- CreateIndex
CREATE INDEX "TipoOperacionSunat_codigo_idx" ON "TipoOperacionSunat"("codigo");

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_tipoAfectacionIGVId_idx" ON "DetalleOrdenCompra"("tipoAfectacionIGVId");

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_tipoDetraccionId_idx" ON "DetalleOrdenCompra"("tipoDetraccionId");

-- CreateIndex
CREATE INDEX "DetallePreFactura_productoId_idx" ON "DetallePreFactura"("productoId");

-- CreateIndex
CREATE INDEX "DetallePreFactura_tipoAfectacionIGVId_idx" ON "DetallePreFactura"("tipoAfectacionIGVId");

-- CreateIndex
CREATE INDEX "DetallePreFactura_tipoDetraccionId_idx" ON "DetallePreFactura"("tipoDetraccionId");

-- CreateIndex
CREATE INDEX "OrdenCompra_tipoOperacionSunatId_idx" ON "OrdenCompra"("tipoOperacionSunatId");

-- CreateIndex
CREATE INDEX "PreFactura_tipoOperacionSunatId_idx" ON "PreFactura"("tipoOperacionSunatId");

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_tipoOperacionSunatId_fkey" FOREIGN KEY ("tipoOperacionSunatId") REFERENCES "TipoOperacionSunat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePreFactura" ADD CONSTRAINT "DetallePreFactura_tipoAfectacionIGVId_fkey" FOREIGN KEY ("tipoAfectacionIGVId") REFERENCES "TipoAfectacionIGV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePreFactura" ADD CONSTRAINT "DetallePreFactura_tipoDetraccionId_fkey" FOREIGN KEY ("tipoDetraccionId") REFERENCES "TipoDetraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_tipoOperacionSunatId_fkey" FOREIGN KEY ("tipoOperacionSunatId") REFERENCES "TipoOperacionSunat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_tipoAfectacionIGVId_fkey" FOREIGN KEY ("tipoAfectacionIGVId") REFERENCES "TipoAfectacionIGV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_tipoDetraccionId_fkey" FOREIGN KEY ("tipoDetraccionId") REFERENCES "TipoDetraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
