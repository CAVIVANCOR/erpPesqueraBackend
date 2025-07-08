-- CreateTable
CREATE TABLE "DetalleDocTripulantes" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaId" BIGINT NOT NULL,
    "tripulanteId" BIGINT,
    "documentoId" BIGINT,
    "numeroDocumento" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "archivoUrl" TEXT,
    "observaciones" TEXT,
    "verificado" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleDocTripulantes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetalleDocTripulantes" ADD CONSTRAINT "DetalleDocTripulantes_faenaPescaId_fkey" FOREIGN KEY ("faenaPescaId") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
