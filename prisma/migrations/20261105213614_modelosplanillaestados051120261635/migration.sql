-- CreateTable
CREATE TABLE "Planilla" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "descripcion" VARCHAR(150) NOT NULL,
    "periodicidadDias" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "estadoId" BIGINT NOT NULL,
    "totalIngresos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalDescuentos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAportesEmpleador" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalNeto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "generadaEn" TIMESTAMP(3),
    "generadaPor" BIGINT,
    "aprobadaJefePersonalPor" BIGINT,
    "aprobadaJefePersonalEn" TIMESTAMP(3),
    "aprobadaGerentePor" BIGINT,
    "aprobadaGerenteEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "Planilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanillaTrabajador" (
    "id" BIGSERIAL NOT NULL,
    "planillaId" BIGINT NOT NULL,
    "personalId" BIGINT NOT NULL,
    "contratoPersonalId" BIGINT NOT NULL,
    "esObrero" BOOLEAN NOT NULL DEFAULT false,
    "esPescador" BOOLEAN NOT NULL DEFAULT false,
    "diasTrabajados" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "remuneracionBasica" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalIngresos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDescuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAportesEmpleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNeto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PlanillaTrabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanillaTrabajadorConcepto" (
    "id" BIGSERIAL NOT NULL,
    "planillaTrabajadorId" BIGINT NOT NULL,
    "conceptoPlanillaId" BIGINT NOT NULL,
    "descripcion" VARCHAR(150) NOT NULL,
    "naturaleza" VARCHAR(10) NOT NULL,
    "base" DECIMAL(12,2),
    "cantidad" DECIMAL(10,2),
    "monto" DECIMAL(12,2) NOT NULL,
    "montoCalculado" DECIMAL(12,2),
    "corregidoManual" BOOLEAN NOT NULL DEFAULT false,
    "motivoCorreccion" VARCHAR(300),
    "corregidoPor" BIGINT,
    "corregidoEn" TIMESTAMP(3),
    "deudaConPersonalId" BIGINT,

    CONSTRAINT "PlanillaTrabajadorConcepto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Planilla_empresaId_fechaInicio_idx" ON "Planilla"("empresaId", "fechaInicio");

-- CreateIndex
CREATE INDEX "Planilla_estadoId_idx" ON "Planilla"("estadoId");

-- CreateIndex
CREATE INDEX "PlanillaTrabajador_personalId_idx" ON "PlanillaTrabajador"("personalId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanillaTrabajador_planillaId_contratoPersonalId_key" ON "PlanillaTrabajador"("planillaId", "contratoPersonalId");

-- CreateIndex
CREATE INDEX "PlanillaTrabajadorConcepto_planillaTrabajadorId_idx" ON "PlanillaTrabajadorConcepto"("planillaTrabajadorId");

-- CreateIndex
CREATE INDEX "PlanillaTrabajadorConcepto_conceptoPlanillaId_idx" ON "PlanillaTrabajadorConcepto"("conceptoPlanillaId");

-- AddForeignKey
ALTER TABLE "Planilla" ADD CONSTRAINT "Planilla_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planilla" ADD CONSTRAINT "Planilla_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planilla" ADD CONSTRAINT "Planilla_aprobadaJefePersonalPor_fkey" FOREIGN KEY ("aprobadaJefePersonalPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planilla" ADD CONSTRAINT "Planilla_aprobadaGerentePor_fkey" FOREIGN KEY ("aprobadaGerentePor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajador" ADD CONSTRAINT "PlanillaTrabajador_planillaId_fkey" FOREIGN KEY ("planillaId") REFERENCES "Planilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajador" ADD CONSTRAINT "PlanillaTrabajador_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajador" ADD CONSTRAINT "PlanillaTrabajador_contratoPersonalId_fkey" FOREIGN KEY ("contratoPersonalId") REFERENCES "ContratoPersonal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajadorConcepto" ADD CONSTRAINT "PlanillaTrabajadorConcepto_planillaTrabajadorId_fkey" FOREIGN KEY ("planillaTrabajadorId") REFERENCES "PlanillaTrabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajadorConcepto" ADD CONSTRAINT "PlanillaTrabajadorConcepto_conceptoPlanillaId_fkey" FOREIGN KEY ("conceptoPlanillaId") REFERENCES "ConceptoPlanilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaTrabajadorConcepto" ADD CONSTRAINT "PlanillaTrabajadorConcepto_deudaConPersonalId_fkey" FOREIGN KEY ("deudaConPersonalId") REFERENCES "DeudaConPersonal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
