-- AlterTable
ALTER TABLE "SubfamiliaProducto" ADD COLUMN     "centroCostoId" BIGINT;

-- AlterTable
ALTER TABLE "UnidadNegocio" ADD COLUMN     "centroCostoId" BIGINT;

-- CreateIndex
CREATE INDEX "UnidadNegocio_centroCostoId_idx" ON "UnidadNegocio"("centroCostoId");

-- AddForeignKey
ALTER TABLE "SubfamiliaProducto" ADD CONSTRAINT "SubfamiliaProducto_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadNegocio" ADD CONSTRAINT "UnidadNegocio_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
