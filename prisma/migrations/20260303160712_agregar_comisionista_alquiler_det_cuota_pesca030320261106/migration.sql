-- AlterTable
ALTER TABLE "DetCuotaPesca" ADD COLUMN     "entidadComercialComisionistaAlquiler" BIGINT,
ADD COLUMN     "precioPorTonComisionAlquiler" DECIMAL(10,2) DEFAULT 0;

-- AddForeignKey
ALTER TABLE "DetCuotaPesca" ADD CONSTRAINT "DetCuotaPesca_entidadComercialComisionistaAlquiler_fkey" FOREIGN KEY ("entidadComercialComisionistaAlquiler") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
