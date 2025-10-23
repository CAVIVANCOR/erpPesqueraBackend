-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "entidadComercialId" BIGINT,
ADD COLUMN     "fechaOperacionMovCaja" TIMESTAMP(3),
ADD COLUMN     "fechaValidacionTesoreria" TIMESTAMP(3),
ADD COLUMN     "moduloOrigenMovCajaId" BIGINT,
ADD COLUMN     "monedaId" BIGINT,
ADD COLUMN     "operacionMovCajaId" BIGINT,
ADD COLUMN     "operacionSinFactura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urlComprobanteMovimiento" TEXT,
ADD COLUMN     "urlComprobanteOperacionMovCaja" TEXT,
ADD COLUMN     "validadoTesoreria" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD COLUMN     "entidadComercialId" BIGINT,
ADD COLUMN     "fechaOperacionMovCaja" TIMESTAMP(3),
ADD COLUMN     "fechaValidacionTesoreria" TIMESTAMP(3),
ADD COLUMN     "moduloOrigenMovCajaId" BIGINT,
ADD COLUMN     "monedaId" BIGINT,
ADD COLUMN     "operacionMovCajaId" BIGINT,
ADD COLUMN     "operacionSinFactura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urlComprobanteMovimiento" TEXT,
ADD COLUMN     "urlComprobanteOperacionMovCaja" TEXT,
ADD COLUMN     "validadoTesoreria" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
