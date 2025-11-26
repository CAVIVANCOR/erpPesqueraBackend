-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "contratoServicioId" BIGINT;

-- CreateTable
CREATE TABLE "ContratoServicio" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "sedeId" BIGINT NOT NULL,
    "activoId" BIGINT,
    "almacenId" BIGINT NOT NULL,
    "clienteId" BIGINT NOT NULL,
    "contactoClienteId" BIGINT,
    "responsableId" BIGINT NOT NULL,
    "aprobadorId" BIGINT,
    "tipoDocumentoId" BIGINT NOT NULL,
    "serieDocId" BIGINT NOT NULL,
    "numeroSerie" VARCHAR(10) NOT NULL,
    "numeroCorrelativo" INTEGER NOT NULL,
    "numeroCompleto" VARCHAR(20) NOT NULL,
    "fechaCelebracion" TIMESTAMP(3) NOT NULL,
    "fechaInicioContrato" TIMESTAMP(3) NOT NULL,
    "fechaFinContrato" TIMESTAMP(3),
    "fechaInicioCobro" TIMESTAMP(3) NOT NULL,
    "periodicidadCobro" INTEGER NOT NULL DEFAULT 1,
    "textoEsenciaContrato" TEXT NOT NULL,
    "urlContratoPdf" VARCHAR(500),
    "incluyeLuz" BOOLEAN NOT NULL DEFAULT false,
    "porcentajeRecargoLuz" DECIMAL(5,2),
    "costoPorKilovatio" DECIMAL(10,4),
    "monedaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4) NOT NULL,
    "estadoContratoId" BIGINT NOT NULL,
    "creadoPor" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetServicioContrato" (
    "id" BIGSERIAL NOT NULL,
    "contratoServicioId" BIGINT NOT NULL,
    "productoServicioId" BIGINT NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL,
    "valorVentaUnitario" DECIMAL(18,4) NOT NULL,
    "incluyeLuz" BOOLEAN NOT NULL DEFAULT false,
    "creadoPor" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetServicioContrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContratoServicio_empresaId_clienteId_idx" ON "ContratoServicio"("empresaId", "clienteId");

-- CreateIndex
CREATE INDEX "ContratoServicio_almacenId_idx" ON "ContratoServicio"("almacenId");

-- CreateIndex
CREATE INDEX "ContratoServicio_estadoContratoId_idx" ON "ContratoServicio"("estadoContratoId");

-- CreateIndex
CREATE INDEX "ContratoServicio_fechaInicioCobro_idx" ON "ContratoServicio"("fechaInicioCobro");

-- CreateIndex
CREATE INDEX "ContratoServicio_responsableId_idx" ON "ContratoServicio"("responsableId");

-- CreateIndex
CREATE INDEX "DetServicioContrato_contratoServicioId_idx" ON "DetServicioContrato"("contratoServicioId");

-- CreateIndex
CREATE INDEX "DetServicioContrato_productoServicioId_idx" ON "DetServicioContrato"("productoServicioId");

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_contratoServicioId_fkey" FOREIGN KEY ("contratoServicioId") REFERENCES "ContratoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "SedesEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_contactoClienteId_fkey" FOREIGN KEY ("contactoClienteId") REFERENCES "ContactoEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServicio" ADD CONSTRAINT "ContratoServicio_estadoContratoId_fkey" FOREIGN KEY ("estadoContratoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetServicioContrato" ADD CONSTRAINT "DetServicioContrato_contratoServicioId_fkey" FOREIGN KEY ("contratoServicioId") REFERENCES "ContratoServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetServicioContrato" ADD CONSTRAINT "DetServicioContrato_productoServicioId_fkey" FOREIGN KEY ("productoServicioId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
