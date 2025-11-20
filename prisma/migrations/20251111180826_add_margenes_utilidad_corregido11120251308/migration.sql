-- AlterTable
ALTER TABLE "DetCotizacionVentas" ADD COLUMN     "margenMinimoPermitido" DECIMAL(5,2),
ADD COLUMN     "margenUtilidadObjetivo" DECIMAL(5,2),
ADD COLUMN     "margenUtilidadReal" DECIMAL(5,2),
ADD COLUMN     "precioEntidadId" BIGINT,
ADD COLUMN     "precioEntidadOriginal" DECIMAL(18,6),
ADD COLUMN     "precioFueEditado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "margenMinimoPermitido" DECIMAL(5,2) DEFAULT 20.00,
ADD COLUMN     "margenUtilidadObjetivo" DECIMAL(5,2) DEFAULT 50.00;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "margenMinimoPermitido" DECIMAL(5,2),
ADD COLUMN     "margenUtilidadObjetivo" DECIMAL(5,2);

-- CreateIndex
CREATE INDEX "DetCotizacionVentas_productoId_idx" ON "DetCotizacionVentas"("productoId");

-- CreateIndex
CREATE INDEX "DetCotizacionVentas_precioEntidadId_idx" ON "DetCotizacionVentas"("precioEntidadId");

-- CreateIndex
CREATE INDEX "PrecioEntidad_entidadComercialId_idx" ON "PrecioEntidad"("entidadComercialId");

-- CreateIndex
CREATE INDEX "PrecioEntidad_productoId_idx" ON "PrecioEntidad"("productoId");

-- CreateIndex
CREATE INDEX "PrecioEntidad_entidadComercialId_productoId_activo_idx" ON "PrecioEntidad"("entidadComercialId", "productoId", "activo");

-- CreateIndex
CREATE INDEX "PrecioEntidad_vigenteDesde_vigenteHasta_idx" ON "PrecioEntidad"("vigenteDesde", "vigenteHasta");

-- AddForeignKey
ALTER TABLE "DetCotizacionVentas" ADD CONSTRAINT "DetCotizacionVentas_precioEntidadId_fkey" FOREIGN KEY ("precioEntidadId") REFERENCES "PrecioEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioEntidad" ADD CONSTRAINT "PrecioEntidad_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
