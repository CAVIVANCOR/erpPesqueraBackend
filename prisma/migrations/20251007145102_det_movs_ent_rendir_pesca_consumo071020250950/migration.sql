-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "entidadComercialId" BIGINT,
ADD COLUMN     "fechaOperacionMovCaja" TIMESTAMP(3),
ADD COLUMN     "fechaValidacionTesoreria" TIMESTAMP(3),
ADD COLUMN     "moduloOrigenMovCajaId" BIGINT,
ADD COLUMN     "operacionMovCajaId" BIGINT,
ADD COLUMN     "operacionSinFactura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urlComprobanteMovimiento" TEXT,
ADD COLUMN     "validadoTesoreria" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
