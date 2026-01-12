/*
  Warnings:

  - You are about to alter the column `valorVentaDefault` on the `CostoExportacionPorIncoterm` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE "CostoExportacionPorIncoterm" ADD COLUMN     "variaSegunRuta" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "valorVentaDefault" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "contactoProveedorId" BIGINT,
ADD COLUMN     "direccionRecepcionAlmacenId" BIGINT;

-- CreateTable
CREATE TABLE "TarifaCostoExportacionRuta" (
    "id" BIGSERIAL NOT NULL,
    "costoIncotermId" BIGINT NOT NULL,
    "paisOrigenId" BIGINT,
    "puertoOrigenId" BIGINT,
    "paisDestinoId" BIGINT,
    "puertoDestinoId" BIGINT,
    "proveedorId" BIGINT,
    "monedaId" BIGINT NOT NULL,
    "valorVenta" DECIMAL(18,2) NOT NULL,
    "fechaVigenciaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVigenciaHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "TarifaCostoExportacionRuta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TarifaCostoExportacionRuta_costoIncotermId_idx" ON "TarifaCostoExportacionRuta"("costoIncotermId");

-- CreateIndex
CREATE INDEX "TarifaCostoExportacionRuta_puertoOrigenId_puertoDestinoId_idx" ON "TarifaCostoExportacionRuta"("puertoOrigenId", "puertoDestinoId");

-- CreateIndex
CREATE INDEX "TarifaCostoExportacionRuta_paisOrigenId_paisDestinoId_idx" ON "TarifaCostoExportacionRuta"("paisOrigenId", "paisDestinoId");

-- CreateIndex
CREATE INDEX "TarifaCostoExportacionRuta_fechaVigenciaDesde_fechaVigencia_idx" ON "TarifaCostoExportacionRuta"("fechaVigenciaDesde", "fechaVigenciaHasta");

-- AddForeignKey
ALTER TABLE "TarifaCostoExportacionRuta" ADD CONSTRAINT "TarifaCostoExportacionRuta_costoIncotermId_fkey" FOREIGN KEY ("costoIncotermId") REFERENCES "CostoExportacionPorIncoterm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaCostoExportacionRuta" ADD CONSTRAINT "TarifaCostoExportacionRuta_paisOrigenId_fkey" FOREIGN KEY ("paisOrigenId") REFERENCES "Pais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaCostoExportacionRuta" ADD CONSTRAINT "TarifaCostoExportacionRuta_puertoOrigenId_fkey" FOREIGN KEY ("puertoOrigenId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaCostoExportacionRuta" ADD CONSTRAINT "TarifaCostoExportacionRuta_paisDestinoId_fkey" FOREIGN KEY ("paisDestinoId") REFERENCES "Pais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaCostoExportacionRuta" ADD CONSTRAINT "TarifaCostoExportacionRuta_puertoDestinoId_fkey" FOREIGN KEY ("puertoDestinoId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaCostoExportacionRuta" ADD CONSTRAINT "TarifaCostoExportacionRuta_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaCostoExportacionRuta" ADD CONSTRAINT "TarifaCostoExportacionRuta_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
