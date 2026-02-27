-- AlterTable
ALTER TABLE "DetCuotaPesca" ADD COLUMN     "entidadEmpresarialId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "formaParteCalculoLiqAlquilerCuota" BOOLEAN DEFAULT false;

-- AddForeignKey
ALTER TABLE "DetCuotaPesca" ADD CONSTRAINT "DetCuotaPesca_entidadEmpresarialId_fkey" FOREIGN KEY ("entidadEmpresarialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
