/*
  Warnings:

  - A unique constraint covering the columns `[codigoSistema]` on the table `CategoriaTipoMovEntregaRendir` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[codigoSistema]` on the table `TipoMovEntregaRendir` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CategoriaTipoMovEntregaRendir" ADD COLUMN     "codigoSistema" VARCHAR(100);

-- AlterTable
ALTER TABLE "TipoMovEntregaRendir" ADD COLUMN     "codigoSistema" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaTipoMovEntregaRendir_codigoSistema_key" ON "CategoriaTipoMovEntregaRendir"("codigoSistema");

-- CreateIndex
CREATE UNIQUE INDEX "TipoMovEntregaRendir_codigoSistema_key" ON "TipoMovEntregaRendir"("codigoSistema");
