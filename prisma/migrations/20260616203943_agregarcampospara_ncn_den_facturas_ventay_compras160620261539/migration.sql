/*
  Warnings:

  - You are about to drop the column `motivoNotaId` on the `ComprobanteElectronico` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ComprobanteElectronico" DROP COLUMN "motivoNotaId",
ADD COLUMN     "motivoNotaCreditoDebitoId" BIGINT;

-- AlterTable
ALTER TABLE "MovimientoAlmacen" ADD COLUMN     "esGerencial" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "dcmtoAfectoNCNDId" BIGINT,
ADD COLUMN     "fechaDcmtoAfectoNCND" TIMESTAMP(3),
ADD COLUMN     "motivoNotaCreditoDebitoId" BIGINT,
ADD COLUMN     "numeroDcmtoAfectoNCND" VARCHAR(40);

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "dcmtoAfectoNCNDId" BIGINT,
ADD COLUMN     "fechaDcmtoAfectoNCND" TIMESTAMP(3),
ADD COLUMN     "motivoNotaCreditoDebitoId" BIGINT,
ADD COLUMN     "numeroDcmtoAfectoNCND" VARCHAR(40);

-- CreateTable
CREATE TABLE "MotivoNotaCreditoDebito" (
    "id" BIGSERIAL NOT NULL,
    "codigoSunat" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "esNCND" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MotivoNotaCreditoDebito_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_motivoNotaCreditoDebitoId_fkey" FOREIGN KEY ("motivoNotaCreditoDebitoId") REFERENCES "MotivoNotaCreditoDebito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_dcmtoAfectoNCNDId_fkey" FOREIGN KEY ("dcmtoAfectoNCNDId") REFERENCES "PreFactura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_motivoNotaCreditoDebitoId_fkey" FOREIGN KEY ("motivoNotaCreditoDebitoId") REFERENCES "MotivoNotaCreditoDebito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_dcmtoAfectoNCNDId_fkey" FOREIGN KEY ("dcmtoAfectoNCNDId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_motivoNotaCreditoDebitoId_fkey" FOREIGN KEY ("motivoNotaCreditoDebitoId") REFERENCES "MotivoNotaCreditoDebito"("id") ON DELETE SET NULL ON UPDATE CASCADE;
