-- CreateTable
CREATE TABLE "DetDatosAdicionalesOrdenCompra" (
    "id" BIGSERIAL NOT NULL,
    "ordenCompraId" BIGINT NOT NULL,
    "nombreDato" VARCHAR(200) NOT NULL,
    "esDocumento" BOOLEAN NOT NULL DEFAULT false,
    "imprimirEnOC" BOOLEAN NOT NULL DEFAULT false,
    "valorDato" TEXT,
    "urlDocumento" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DetDatosAdicionalesOrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetDatosAdicionalesOrdenCompra_ordenCompraId_idx" ON "DetDatosAdicionalesOrdenCompra"("ordenCompraId");

-- CreateIndex
CREATE INDEX "DetDatosAdicionalesOrdenCompra_esDocumento_idx" ON "DetDatosAdicionalesOrdenCompra"("esDocumento");

-- CreateIndex
CREATE INDEX "DetDatosAdicionalesOrdenCompra_imprimirEnOC_idx" ON "DetDatosAdicionalesOrdenCompra"("imprimirEnOC");

-- AddForeignKey
ALTER TABLE "DetDatosAdicionalesOrdenCompra" ADD CONSTRAINT "DetDatosAdicionalesOrdenCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
