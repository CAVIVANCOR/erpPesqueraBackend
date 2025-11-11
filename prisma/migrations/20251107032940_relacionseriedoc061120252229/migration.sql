/*
  Warnings:

  - Made the column `serieDocId` on table `CotizacionVentas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `serieDocId` on table `PreFactura` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CotizacionVentas" ALTER COLUMN "serieDocId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PreFactura" ALTER COLUMN "serieDocId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
