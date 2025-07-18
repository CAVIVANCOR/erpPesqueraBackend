-- CreateTable
CREATE TABLE "ReporteGenerado" (
    "id" BIGSERIAL NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaRelativa" TEXT NOT NULL,
    "fechaGeneracion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" BIGINT NOT NULL,
    "subModuloId" BIGINT,
    "usuarioGeneroId" BIGINT,

    CONSTRAINT "ReporteGenerado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReporteGenerado_empresaId_idx" ON "ReporteGenerado"("empresaId");

-- CreateIndex
CREATE INDEX "ReporteGenerado_subModuloId_idx" ON "ReporteGenerado"("subModuloId");
