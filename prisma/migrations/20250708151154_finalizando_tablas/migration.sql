/*
  Warnings:

  - You are about to drop the column `direccionDestinoClienteId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - Added the required column `dirEntregaId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dirFiscalId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CotizacionVentas" DROP COLUMN "direccionDestinoClienteId",
ADD COLUMN     "dirEntregaId" BIGINT NOT NULL,
ADD COLUMN     "dirFiscalId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "ubigeoId" BIGINT;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_ubigeoId_fkey" FOREIGN KEY ("ubigeoId") REFERENCES "Ubigeo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
