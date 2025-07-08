-- AlterTable
ALTER TABLE "OTMantenimiento" ADD COLUMN     "urlFotosAntesDeOTPdf" TEXT,
ADD COLUMN     "urlFotosDespuesDeOTPdf" TEXT;

-- CreateTable
CREATE TABLE "DetTareasOT" (
    "id" BIGSERIAL NOT NULL,
    "otMantenimientoId" BIGINT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsableId" BIGINT,
    "fechaProgramada" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "realizado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "urlFotosAntesPdf" TEXT,
    "adjuntoCotizacionUno" BOOLEAN NOT NULL DEFAULT false,
    "urlCotizacionUnoPdf" TEXT,
    "adjuntoCotizacionDos" BOOLEAN NOT NULL DEFAULT false,
    "urlCotizacionDosPdf" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetTareasOT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetInsumosTareaOT" (
    "id" BIGSERIAL NOT NULL,
    "tareaId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30),
    "costoUnitario" DECIMAL(65,30),
    "observaciones" TEXT,
    "aprobacionComprasId" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetInsumosTareaOT_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetTareasOT" ADD CONSTRAINT "DetTareasOT_otMantenimientoId_fkey" FOREIGN KEY ("otMantenimientoId") REFERENCES "OTMantenimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "DetTareasOT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetInsumosTareaOT" ADD CONSTRAINT "DetInsumosTareaOT_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
