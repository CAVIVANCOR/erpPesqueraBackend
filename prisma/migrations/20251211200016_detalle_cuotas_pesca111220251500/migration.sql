-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "limiteMaximoCapturaTn" DECIMAL(12,3);

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "limiteMaximoCapturaTn" DECIMAL(12,3);

-- CreateTable
CREATE TABLE "DetCuotaPesca" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentajeCuota" DECIMAL(5,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idPersonaActualiza" BIGINT NOT NULL,
    "cuotaPropia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DetCuotaPesca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetCuotaPesca_empresaId_idx" ON "DetCuotaPesca"("empresaId");

-- CreateIndex
CREATE INDEX "DetCuotaPesca_idPersonaActualiza_idx" ON "DetCuotaPesca"("idPersonaActualiza");

-- AddForeignKey
ALTER TABLE "DetCuotaPesca" ADD CONSTRAINT "DetCuotaPesca_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetCuotaPesca" ADD CONSTRAINT "DetCuotaPesca_idPersonaActualiza_fkey" FOREIGN KEY ("idPersonaActualiza") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
