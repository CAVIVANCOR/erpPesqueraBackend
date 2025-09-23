/*
  Warnings:

  - Added the required column `entidadComercialId` to the `MovimientoCaja` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."MovimientoCaja" ADD COLUMN     "entidadComercialId" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "public"."EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
