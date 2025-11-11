-- AlterTable
ALTER TABLE "CotizacionVentas" ALTER COLUMN "esExportacion" SET DEFAULT false;

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "tipoContenedorId" BIGINT;

-- CreateTable
CREATE TABLE "TipoContenedor" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "TipoContenedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoContenedor_codigo_key" ON "TipoContenedor"("codigo");

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_tipoContenedorId_fkey" FOREIGN KEY ("tipoContenedorId") REFERENCES "TipoContenedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_tipoContenedorId_fkey" FOREIGN KEY ("tipoContenedorId") REFERENCES "TipoContenedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
