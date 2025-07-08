-- CreateTable
CREATE TABLE "FaenaPesca" (
    "id" BIGSERIAL NOT NULL,
    "temporadaId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaenaPesca_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "TemporadaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
