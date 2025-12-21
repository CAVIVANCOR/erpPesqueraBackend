-- CreateEnum
CREATE TYPE "EstadoReunion" AS ENUM ('PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RolParticipante" AS ENUM ('MODERADOR', 'PARTICIPANTE', 'INVITADO');

-- CreateTable
CREATE TABLE "Videoconferencia" (
    "id" BIGSERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "salaId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "estado" "EstadoReunion" NOT NULL DEFAULT 'PROGRAMADA',
    "grabarSesion" BOOLEAN NOT NULL DEFAULT false,
    "salaEspera" BOOLEAN NOT NULL DEFAULT true,
    "permitirPantalla" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,
    "organizadorId" BIGINT NOT NULL,

    CONSTRAINT "Videoconferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipanteReunion" (
    "id" BIGSERIAL NOT NULL,
    "rol" "RolParticipante" NOT NULL DEFAULT 'PARTICIPANTE',
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "asistio" BOOLEAN NOT NULL DEFAULT false,
    "horaIngreso" TIMESTAMP(3),
    "horaSalida" TIMESTAMP(3),
    "videoconferenciaId" BIGINT NOT NULL,
    "personalId" BIGINT NOT NULL,

    CONSTRAINT "ParticipanteReunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrabacionReunion" (
    "id" BIGSERIAL NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "duracionSegundos" INTEGER NOT NULL,
    "tamanoBytes" BIGINT NOT NULL,
    "fechaGrabacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoconferenciaId" BIGINT NOT NULL,

    CONSTRAINT "GrabacionReunion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Videoconferencia_salaId_key" ON "Videoconferencia"("salaId");

-- CreateIndex
CREATE INDEX "Videoconferencia_organizadorId_idx" ON "Videoconferencia"("organizadorId");

-- CreateIndex
CREATE INDEX "Videoconferencia_fechaInicio_idx" ON "Videoconferencia"("fechaInicio");

-- CreateIndex
CREATE INDEX "Videoconferencia_estado_idx" ON "Videoconferencia"("estado");

-- CreateIndex
CREATE INDEX "ParticipanteReunion_videoconferenciaId_idx" ON "ParticipanteReunion"("videoconferenciaId");

-- CreateIndex
CREATE INDEX "ParticipanteReunion_personalId_idx" ON "ParticipanteReunion"("personalId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipanteReunion_videoconferenciaId_personalId_key" ON "ParticipanteReunion"("videoconferenciaId", "personalId");

-- CreateIndex
CREATE INDEX "GrabacionReunion_videoconferenciaId_idx" ON "GrabacionReunion"("videoconferenciaId");

-- AddForeignKey
ALTER TABLE "Videoconferencia" ADD CONSTRAINT "Videoconferencia_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipanteReunion" ADD CONSTRAINT "ParticipanteReunion_videoconferenciaId_fkey" FOREIGN KEY ("videoconferenciaId") REFERENCES "Videoconferencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipanteReunion" ADD CONSTRAINT "ParticipanteReunion_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrabacionReunion" ADD CONSTRAINT "GrabacionReunion_videoconferenciaId_fkey" FOREIGN KEY ("videoconferenciaId") REFERENCES "Videoconferencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
