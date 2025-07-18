-- CreateTable
CREATE TABLE "ArchivoAdjunto" (
    "id" BIGSERIAL NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaRelativa" TEXT NOT NULL,
    "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" BIGINT NOT NULL,
    "subModuloId" BIGINT NOT NULL,
    "usuarioSubioId" BIGINT,

    CONSTRAINT "ArchivoAdjunto_pkey" PRIMARY KEY ("id")
);
