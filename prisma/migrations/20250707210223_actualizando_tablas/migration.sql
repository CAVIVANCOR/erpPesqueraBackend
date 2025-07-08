/*
  Warnings:

  - You are about to drop the `DocRequeridaVentas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "DocRequeridaVentas";

-- CreateTable
CREATE TABLE "DocRequeridaComprasVentas" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "tipoProductoId" BIGINT NOT NULL,
    "tipoEstadoProductoId" BIGINT NOT NULL,
    "destinoProductoId" BIGINT NOT NULL,
    "formaTransaccionId" BIGINT NOT NULL,
    "paraCompras" BOOLEAN NOT NULL DEFAULT false,
    "paraVentas" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DocRequeridaComprasVentas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocRequeridaComprasVentas_nombre_key" ON "DocRequeridaComprasVentas"("nombre");

-- AddForeignKey
ALTER TABLE "detDocsReqCotizaVentas" ADD CONSTRAINT "detDocsReqCotizaVentas_docRequeridaVentasId_fkey" FOREIGN KEY ("docRequeridaVentasId") REFERENCES "DocRequeridaComprasVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
