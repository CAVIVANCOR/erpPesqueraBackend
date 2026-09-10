/*
  Warnings:

  - A unique constraint covering the columns `[codigo,tipo]` on the table `TipoRetencionPercepcion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TipoRetencionPercepcion_codigo_key";

-- CreateIndex
CREATE UNIQUE INDEX "TipoRetencionPercepcion_codigo_tipo_key" ON "TipoRetencionPercepcion"("codigo", "tipo");
