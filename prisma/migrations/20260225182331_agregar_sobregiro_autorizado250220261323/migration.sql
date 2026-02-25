-- CreateTable
CREATE TABLE "SobregiroAutorizado" (
    "id" BIGSERIAL NOT NULL,
    "sublineaCreditoId" BIGINT NOT NULL,
    "montoAutorizado" DECIMAL(18,2) NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAprobacion" TIMESTAMP(3),
    "autorizadoPorBanco" TEXT,
    "numeroAutorizacionBanco" TEXT,
    "motivoSolicitud" TEXT,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SobregiroAutorizado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SobregiroAutorizado_sublineaCreditoId_idx" ON "SobregiroAutorizado"("sublineaCreditoId");

-- CreateIndex
CREATE INDEX "SobregiroAutorizado_activo_idx" ON "SobregiroAutorizado"("activo");

-- AddForeignKey
ALTER TABLE "SobregiroAutorizado" ADD CONSTRAINT "SobregiroAutorizado_sublineaCreditoId_fkey" FOREIGN KEY ("sublineaCreditoId") REFERENCES "SublineaCredito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
