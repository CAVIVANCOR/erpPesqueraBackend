/*
  Warnings:

  - You are about to drop the column `afectoIGV` on the `TipoAfectacionIGV` table. All the data in the column will be lost.
  - You are about to drop the column `codigoSunat` on the `TipoAfectacionIGV` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[codigo]` on the table `TipoAfectacionIGV` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categoria` to the `TipoAfectacionIGV` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigo` to the `TipoAfectacionIGV` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoriaAfectacionIGV" AS ENUM ('GRAVADO', 'EXONERADO', 'INAFECTO', 'EXPORTACION', 'GRATUITO');

-- DropIndex
DROP INDEX "TipoAfectacionIGV_codigoSunat_idx";

-- DropIndex
DROP INDEX "TipoAfectacionIGV_codigoSunat_key";

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "aplicaDetraccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaPercepcion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaRetencion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoDetraccion" DECIMAL(18,2),
ADD COLUMN     "montoPercepcion" DECIMAL(18,2),
ADD COLUMN     "montoRetencion" DECIMAL(18,2),
ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "porcentajePercepcion" DECIMAL(5,2),
ADD COLUMN     "porcentajeRetencion" DECIMAL(5,2),
ADD COLUMN     "tipoAfectacionIGVId" BIGINT,
ADD COLUMN     "tipoDetraccionId" BIGINT;

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "aplicaDetraccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaPercepcion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaRetencion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoDetraccion" DECIMAL(18,2),
ADD COLUMN     "montoPercepcion" DECIMAL(18,2),
ADD COLUMN     "montoRetencion" DECIMAL(18,2),
ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "porcentajePercepcion" DECIMAL(5,2),
ADD COLUMN     "porcentajeRetencion" DECIMAL(5,2),
ADD COLUMN     "tipoAfectacionIGVId" BIGINT,
ADD COLUMN     "tipoDetraccionId" BIGINT;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "tipoAfectacionIGVId" BIGINT;

-- AlterTable
ALTER TABLE "TipoAfectacionIGV" DROP COLUMN "afectoIGV",
DROP COLUMN "codigoSunat",
ADD COLUMN     "calculaIGV" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categoria" "CategoriaAfectacionIGV" NOT NULL,
ADD COLUMN     "codigo" VARCHAR(2) NOT NULL,
ADD COLUMN     "descripcion" VARCHAR(300),
ADD COLUMN     "permiteCreditoFiscal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(150);

-- CreateIndex
CREATE INDEX "OrdenCompra_tipoAfectacionIGVId_idx" ON "OrdenCompra"("tipoAfectacionIGVId");

-- CreateIndex
CREATE INDEX "PreFactura_tipoAfectacionIGVId_idx" ON "PreFactura"("tipoAfectacionIGVId");

-- CreateIndex
CREATE INDEX "Producto_tipoAfectacionIGVId_idx" ON "Producto"("tipoAfectacionIGVId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAfectacionIGV_codigo_key" ON "TipoAfectacionIGV"("codigo");

-- CreateIndex
CREATE INDEX "TipoAfectacionIGV_codigo_idx" ON "TipoAfectacionIGV"("codigo");

-- CreateIndex
CREATE INDEX "TipoAfectacionIGV_categoria_idx" ON "TipoAfectacionIGV"("categoria");

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_tipoAfectacionIGVId_fkey" FOREIGN KEY ("tipoAfectacionIGVId") REFERENCES "TipoAfectacionIGV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tipoAfectacionIGVId_fkey" FOREIGN KEY ("tipoAfectacionIGVId") REFERENCES "TipoAfectacionIGV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_tipoAfectacionIGVId_fkey" FOREIGN KEY ("tipoAfectacionIGVId") REFERENCES "TipoAfectacionIGV"("id") ON DELETE SET NULL ON UPDATE CASCADE;
