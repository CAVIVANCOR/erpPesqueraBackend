-- AlterTable
ALTER TABLE "PagoDeudaPersonal" ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "urlComprobanteOperacion" TEXT,
ADD COLUMN     "urlVoucherOperacionConsolidado" TEXT;

-- AlterTable
ALTER TABLE "PagoDeudaTributaria" ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "urlComprobanteOperacion" TEXT,
ADD COLUMN     "urlVoucherOperacionConsolidado" TEXT;

-- CreateIndex
CREATE INDEX "PagoDeudaPersonal_periodoContableId_idx" ON "PagoDeudaPersonal"("periodoContableId");

-- CreateIndex
CREATE INDEX "PagoDeudaTributaria_periodoContableId_idx" ON "PagoDeudaTributaria"("periodoContableId");

-- AddForeignKey
ALTER TABLE "PagoDeudaPersonal" ADD CONSTRAINT "PagoDeudaPersonal_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaTributaria" ADD CONSTRAINT "PagoDeudaTributaria_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
