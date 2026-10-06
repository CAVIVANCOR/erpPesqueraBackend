-- AlterTable
ALTER TABLE "CuotaPrestamo" ADD COLUMN     "estadoCuotaId" BIGINT;

-- CreateIndex
CREATE INDEX "CuotaPrestamo_estadoCuotaId_idx" ON "CuotaPrestamo"("estadoCuotaId");

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_estadoCuotaId_fkey" FOREIGN KEY ("estadoCuotaId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
