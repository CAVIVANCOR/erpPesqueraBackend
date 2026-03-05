-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ADD COLUMN     "precioPorTonComisionFidelizacion" DECIMAL(7,2) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "EntidadComercial" ADD COLUMN     "precioPorTonComisionFidelizacion" DECIMAL(7,2) DEFAULT 0.00;

-- CreateTable
CREATE TABLE "ComisionFidelizacion" (
    "id" BIGSERIAL NOT NULL,
    "temporadaPescaId" BIGINT NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "personalId" BIGINT NOT NULL,
    "precioPorTonComisionFidelizacion" DECIMAL(7,2) NOT NULL,
    "toneladasCapturadas" DECIMAL(10,3) NOT NULL,
    "montoPagarFidelizacionDolares" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ComisionFidelizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComisionFidelizacion_temporadaPescaId_idx" ON "ComisionFidelizacion"("temporadaPescaId");

-- CreateIndex
CREATE INDEX "ComisionFidelizacion_entidadComercialId_idx" ON "ComisionFidelizacion"("entidadComercialId");

-- CreateIndex
CREATE INDEX "ComisionFidelizacion_personalId_idx" ON "ComisionFidelizacion"("personalId");

-- AddForeignKey
ALTER TABLE "ComisionFidelizacion" ADD CONSTRAINT "ComisionFidelizacion_temporadaPescaId_fkey" FOREIGN KEY ("temporadaPescaId") REFERENCES "TemporadaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComisionFidelizacion" ADD CONSTRAINT "ComisionFidelizacion_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComisionFidelizacion" ADD CONSTRAINT "ComisionFidelizacion_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
