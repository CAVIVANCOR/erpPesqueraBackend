/*
  Warnings:

  - You are about to drop the column `numeroComprobante` on the `DetMovsEntregaRendirPCompras` table. All the data in the column will be lost.
  - You are about to drop the column `numeroComprobante` on the `DetMovsEntregaRendirPVentas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "numeroCorrelativoComprobante" TEXT,
ADD COLUMN     "numeroSerieComprobante" TEXT,
ADD COLUMN     "tipoDocumentoId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "numeroCorrelativoComprobante" TEXT,
ADD COLUMN     "numeroSerieComprobante" TEXT,
ADD COLUMN     "tipoDocumentoId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" DROP COLUMN "numeroComprobante",
ADD COLUMN     "numeroCorrelativoComprobante" TEXT,
ADD COLUMN     "numeroSerieComprobante" TEXT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" DROP COLUMN "numeroComprobante",
ADD COLUMN     "numeroCorrelativoComprobante" TEXT,
ADD COLUMN     "numeroSerieComprobante" TEXT;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
