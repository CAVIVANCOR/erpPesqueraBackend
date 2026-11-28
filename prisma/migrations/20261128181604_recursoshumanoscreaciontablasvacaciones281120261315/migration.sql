-- AlterTable
ALTER TABLE "PlanillaTrabajador" ADD COLUMN     "diasMes" INTEGER,
ADD COLUMN     "diasNoLaborados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "diasSubsidiados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "horasJornada" DECIMAL(7,2);

-- CreateTable
CREATE TABLE "TipoSuspensionLaboral" (
    "id" BIGSERIAL NOT NULL,
    "codigoPlame" VARCHAR(5) NOT NULL,
    "descripcion" VARCHAR(150) NOT NULL,
    "esDescansoVacacional" BOOLEAN NOT NULL DEFAULT false,
    "esSubsidio" BOOLEAN NOT NULL DEFAULT false,
    "conGoceRemuneracion" BOOLEAN NOT NULL DEFAULT false,
    "pagaMovilidad" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "TipoSuspensionLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoVacacional" (
    "id" BIGSERIAL NOT NULL,
    "personalId" BIGINT NOT NULL,
    "numeroPeriodo" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "diasDerecho" INTEGER NOT NULL,
    "diasVendidos" INTEGER NOT NULL DEFAULT 0,
    "fechaLimiteGoce" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PeriodoVacacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspensionLaboral" (
    "id" BIGSERIAL NOT NULL,
    "personalId" BIGINT NOT NULL,
    "tipoSuspensionLaboralId" BIGINT NOT NULL,
    "periodoVacacionalId" BIGINT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "dias" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PROGRAMADA',
    "motivoAnulacion" TEXT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "SuspensionLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanillaTrabajadorSuspension" (
    "id" BIGSERIAL NOT NULL,
    "planillaTrabajadorId" BIGINT NOT NULL,
    "tipoSuspensionLaboralId" BIGINT NOT NULL,
    "suspensionLaboralId" BIGINT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "dias" INTEGER NOT NULL,

    CONSTRAINT "PlanillaTrabajadorSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoSuspensionLaboral_codigoPlame_key" ON "TipoSuspensionLaboral"("codigoPlame");

-- CreateIndex
CREATE INDEX "PeriodoVacacional_personalId_fechaInicio_idx" ON "PeriodoVacacional"("personalId", "fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoVacacional_personalId_numeroPeriodo_key" ON "PeriodoVacacional"("personalId", "numeroPeriodo");

-- CreateIndex
CREATE INDEX "SuspensionLaboral_personalId_fechaInicio_idx" ON "SuspensionLaboral"("personalId", "fechaInicio");

-- CreateIndex
CREATE INDEX "SuspensionLaboral_periodoVacacionalId_idx" ON "SuspensionLaboral"("periodoVacacionalId");

-- CreateIndex
CREATE INDEX "SuspensionLaboral_tipoSuspensionLaboralId_idx" ON "SuspensionLaboral"("tipoSuspensionLaboralId");

-- CreateIndex
CREATE INDEX "SuspensionLaboral_estado_idx" ON "SuspensionLaboral"("estado");

-- CreateIndex
CREATE INDEX "PlanillaTrabajadorSuspension_planillaTrabajadorId_idx" ON "PlanillaTrabajadorSuspension"("planillaTrabajadorId");

-- AddForeignKey
ALTER TABLE "PeriodoVacacional" ADD CONSTRAINT "PeriodoVacacional_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspensionLaboral" ADD CONSTRAINT "SuspensionLaboral_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspensionLaboral" ADD CONSTRAINT "SuspensionLaboral_tipoSuspensionLaboralId_fkey" FOREIGN KEY ("tipoSuspensionLaboralId") REFERENCES "TipoSuspensionLaboral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspensionLaboral" ADD CONSTRAINT "SuspensionLaboral_periodoVacacionalId_fkey" FOREIGN KEY ("periodoVacacionalId") REFERENCES "PeriodoVacacional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajadorSuspension" ADD CONSTRAINT "PlanillaTrabajadorSuspension_planillaTrabajadorId_fkey" FOREIGN KEY ("planillaTrabajadorId") REFERENCES "PlanillaTrabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajadorSuspension" ADD CONSTRAINT "PlanillaTrabajadorSuspension_tipoSuspensionLaboralId_fkey" FOREIGN KEY ("tipoSuspensionLaboralId") REFERENCES "TipoSuspensionLaboral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajadorSuspension" ADD CONSTRAINT "PlanillaTrabajadorSuspension_suspensionLaboralId_fkey" FOREIGN KEY ("suspensionLaboralId") REFERENCES "SuspensionLaboral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
