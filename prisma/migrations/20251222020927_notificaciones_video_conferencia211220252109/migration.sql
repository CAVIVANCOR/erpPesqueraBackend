-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('VIDEOCONFERENCIA_INVITACION', 'VIDEOCONFERENCIA_RECORDATORIO_24H', 'VIDEOCONFERENCIA_RECORDATORIO_1H', 'VIDEOCONFERENCIA_INICIADA', 'VIDEOCONFERENCIA_CANCELADA', 'SISTEMA_GENERAL', 'APROBACION_PENDIENTE', 'DOCUMENTO_APROBADO', 'DOCUMENTO_RECHAZADO');

-- CreateTable
CREATE TABLE "notificacion" (
    "id" BIGSERIAL NOT NULL,
    "usuarioId" BIGINT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fechaLeida" TIMESTAMP(3),
    "referenciaId" BIGINT,
    "referenciaTabla" VARCHAR(50),
    "urlDestino" VARCHAR(500),
    "metadata" JSONB,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaExpiracion" TIMESTAMP(3),

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacion_usuarioId_leida_idx" ON "notificacion"("usuarioId", "leida");

-- CreateIndex
CREATE INDEX "notificacion_fechaCreacion_idx" ON "notificacion"("fechaCreacion");

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
