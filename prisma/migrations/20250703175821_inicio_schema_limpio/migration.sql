-- CreateTable
CREATE TABLE "AccionesPreviasFaena" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AccionesPreviasFaena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetAccionesPreviasFaena" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaId" BIGINT NOT NULL,
    "accionPreviaId" BIGINT NOT NULL,
    "responsableId" BIGINT,
    "verificadorId" BIGINT,
    "fechaVerificacion" TIMESTAMP(3),
    "cumplida" BOOLEAN NOT NULL DEFAULT false,
    "fechaCumplida" TIMESTAMP(3),
    "archivoUrl" TEXT,
    "observaciones" TEXT,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetAccionesPreviasFaena_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetAccionesPreviasFaena" ADD CONSTRAINT "DetAccionesPreviasFaena_faenaPescaId_fkey" FOREIGN KEY ("faenaPescaId") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetAccionesPreviasFaena" ADD CONSTRAINT "DetAccionesPreviasFaena_accionPreviaId_fkey" FOREIGN KEY ("accionPreviaId") REFERENCES "AccionesPreviasFaena"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
