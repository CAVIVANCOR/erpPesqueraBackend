-- AlterTable
ALTER TABLE "DetInsumosTareaOT" ADD COLUMN     "proveedorId" BIGINT;

-- AlterTable
ALTER TABLE "DetTareasOT" ADD COLUMN     "fechaValidaTerminoTarea" TIMESTAMP(3),
ADD COLUMN     "validaTerminoTareaId" BIGINT;

-- CreateTable
CREATE TABLE "RequerimientoCompra" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "ordenTrabajoId" BIGINT,
    "proveedorId" BIGINT,
    "formaPagoId" BIGINT,
    "centroCostoId" BIGINT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAprobacion" TIMESTAMP(3),
    "estadoId" BIGINT NOT NULL,
    "solicitanteId" BIGINT,
    "aprobadoPorId" BIGINT,
    "observaciones" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequerimientoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleReqCompra" (
    "id" BIGSERIAL NOT NULL,
    "requerimientoCompraId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "cantidadSolicitada" DECIMAL(65,30) NOT NULL,
    "costoUnitario" DECIMAL(65,30),
    "centroCostoId" BIGINT,
    "observaciones" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleReqCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequerimientoCompra_codigo_key" ON "RequerimientoCompra"("codigo");

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReqCompra" ADD CONSTRAINT "DetalleReqCompra_requerimientoCompraId_fkey" FOREIGN KEY ("requerimientoCompraId") REFERENCES "RequerimientoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReqCompra" ADD CONSTRAINT "DetalleReqCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
