-- AlterTable
ALTER TABLE "TipoDeudaTributaria" ADD COLUMN     "tipoLibroId" BIGINT;

-- CreateIndex
CREATE INDEX "TipoDeudaTributaria_tipoLibroId_idx" ON "TipoDeudaTributaria"("tipoLibroId");

-- AddForeignKey
ALTER TABLE "TipoDeudaTributaria" ADD CONSTRAINT "TipoDeudaTributaria_tipoLibroId_fkey" FOREIGN KEY ("tipoLibroId") REFERENCES "TipoLibroContableSunat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
