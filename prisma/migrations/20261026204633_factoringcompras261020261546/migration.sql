-- AlterTable
ALTER TABLE "CuotaPrestamo" ADD COLUMN     "cuentaPorCobrarId" BIGINT,
ADD COLUMN     "cuentaPorCobrarInteresId" BIGINT,
ADD COLUMN     "cuentaPorPagarId" BIGINT,
ADD COLUMN     "cuentaPorPagarInteresId" BIGINT;

-- AlterTable
ALTER TABLE "TipoPrestamo" ADD COLUMN     "esFactoringCompras" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CuotaPrestamo_cuentaPorCobrarId_idx" ON "CuotaPrestamo"("cuentaPorCobrarId");

-- CreateIndex
CREATE INDEX "CuotaPrestamo_cuentaPorCobrarInteresId_idx" ON "CuotaPrestamo"("cuentaPorCobrarInteresId");

-- CreateIndex
CREATE INDEX "CuotaPrestamo_cuentaPorPagarId_idx" ON "CuotaPrestamo"("cuentaPorPagarId");

-- CreateIndex
CREATE INDEX "CuotaPrestamo_cuentaPorPagarInteresId_idx" ON "CuotaPrestamo"("cuentaPorPagarInteresId");

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_cuentaPorCobrarInteresId_fkey" FOREIGN KEY ("cuentaPorCobrarInteresId") REFERENCES "CuentaPorCobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_cuentaPorPagarInteresId_fkey" FOREIGN KEY ("cuentaPorPagarInteresId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
