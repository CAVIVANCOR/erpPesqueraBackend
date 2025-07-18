-- CreateTable
CREATE TABLE "TipoContrato" (
    "id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoContrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoContrato_codigo_key" ON "TipoContrato"("codigo");

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_tipoContratoId_fkey" FOREIGN KEY ("tipoContratoId") REFERENCES "TipoContrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
