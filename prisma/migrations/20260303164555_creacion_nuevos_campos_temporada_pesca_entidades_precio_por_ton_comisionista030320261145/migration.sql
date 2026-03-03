-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "entidadComercialComisionistaAlquiler" BIGINT,
ADD COLUMN     "entidadEmpresarialAlquiladaId" BIGINT,
ADD COLUMN     "precioPorTonComisionAlquilerDolares" DECIMAL(10,2) DEFAULT 0.00;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_entidadEmpresarialAlquiladaId_fkey" FOREIGN KEY ("entidadEmpresarialAlquiladaId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_entidadComercialComisionistaAlquiler_fkey" FOREIGN KEY ("entidadComercialComisionistaAlquiler") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
