-- AlterTable
ALTER TABLE "public"."DetMovsEntregaRendir" ADD COLUMN     "entidadComercialId" BIGINT;

-- AddForeignKey
ALTER TABLE "public"."DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "public"."EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
