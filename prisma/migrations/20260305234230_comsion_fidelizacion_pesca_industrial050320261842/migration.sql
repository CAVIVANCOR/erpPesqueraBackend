-- CreateTable
CREATE TABLE "DetComisionFidelizacionEntidad" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialFidelizacionId" BIGINT NOT NULL,
    "personalId" BIGINT NOT NULL,
    "precioPorTonelada" DECIMAL(7,2) NOT NULL,
    "cesado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DetComisionFidelizacionEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetComisionFidelizacionEntidad_entidadComercialFidelizacion_idx" ON "DetComisionFidelizacionEntidad"("entidadComercialFidelizacionId");

-- CreateIndex
CREATE INDEX "DetComisionFidelizacionEntidad_personalId_idx" ON "DetComisionFidelizacionEntidad"("personalId");

-- AddForeignKey
ALTER TABLE "DetComisionFidelizacionEntidad" ADD CONSTRAINT "DetComisionFidelizacionEntidad_entidadComercialFidelizacio_fkey" FOREIGN KEY ("entidadComercialFidelizacionId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetComisionFidelizacionEntidad" ADD CONSTRAINT "DetComisionFidelizacionEntidad_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
