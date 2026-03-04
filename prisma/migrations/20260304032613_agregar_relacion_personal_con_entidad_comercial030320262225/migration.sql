-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "enlaceEntidadComercialId" BIGINT;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_enlaceEntidadComercialId_fkey" FOREIGN KEY ("enlaceEntidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
