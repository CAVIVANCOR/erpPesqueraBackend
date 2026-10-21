-- CreateTable
CREATE TABLE "PrestamoEntidad" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "sentido" VARCHAR(10) NOT NULL,
    "esAccionista" BOOLEAN NOT NULL DEFAULT false,
    "numeroPrestamo" VARCHAR(50) NOT NULL,
    "esGerencial" BOOLEAN NOT NULL DEFAULT false,
    "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false,
    "montoPagadoAnterior" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "numeroOperacion" VARCHAR(40),
    "cuentaCorrienteId" BIGINT,
    "movimientoCajaDesembolsoId" BIGINT,
    "refOperacionEspecializadaMovCaja" BIGINT,
    "medioPagoId" BIGINT,
    "fechaContable" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "periodoContableId" BIGINT,
    "fechaDesembolso" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "monedaId" BIGINT NOT NULL,
    "montoDesembolsado" DECIMAL(18,2) NOT NULL,
    "tipoCambioAplicado" DECIMAL(10,4),
    "saldoCapital" DECIMAL(18,2) NOT NULL,
    "capitalPagado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "estadoId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PrestamoEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoPrestamoEntidad" (
    "id" BIGSERIAL NOT NULL,
    "prestamoEntidadId" BIGINT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "numeroOperacion" VARCHAR(40),
    "montoAplicado" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "medioPagoId" BIGINT,
    "movimientoCajaId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,
    "refOperacionEspecializadaMovCaja" BIGINT,
    "urlVoucherOperacionConsolidado" TEXT,
    "urlComprobanteOperacion" TEXT,
    "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodoContableId" BIGINT,

    CONSTRAINT "PagoPrestamoEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrestamoEntidad_empresaId_estadoId_idx" ON "PrestamoEntidad"("empresaId", "estadoId");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_entidadComercialId_idx" ON "PrestamoEntidad"("entidadComercialId");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_sentido_idx" ON "PrestamoEntidad"("sentido");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_esAccionista_idx" ON "PrestamoEntidad"("esAccionista");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_estadoId_idx" ON "PrestamoEntidad"("estadoId");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_esSaldoInicial_idx" ON "PrestamoEntidad"("esSaldoInicial");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_fechaVencimiento_idx" ON "PrestamoEntidad"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_cuentaCorrienteId_idx" ON "PrestamoEntidad"("cuentaCorrienteId");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_movimientoCajaDesembolsoId_idx" ON "PrestamoEntidad"("movimientoCajaDesembolsoId");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_medioPagoId_idx" ON "PrestamoEntidad"("medioPagoId");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_periodoContableId_idx" ON "PrestamoEntidad"("periodoContableId");

-- CreateIndex
CREATE INDEX "PrestamoEntidad_refOperacionEspecializadaMovCaja_idx" ON "PrestamoEntidad"("refOperacionEspecializadaMovCaja");

-- CreateIndex
CREATE UNIQUE INDEX "PrestamoEntidad_empresaId_numeroPrestamo_key" ON "PrestamoEntidad"("empresaId", "numeroPrestamo");

-- CreateIndex
CREATE INDEX "PagoPrestamoEntidad_prestamoEntidadId_idx" ON "PagoPrestamoEntidad"("prestamoEntidadId");

-- CreateIndex
CREATE INDEX "PagoPrestamoEntidad_medioPagoId_idx" ON "PagoPrestamoEntidad"("medioPagoId");

-- CreateIndex
CREATE INDEX "PagoPrestamoEntidad_movimientoCajaId_idx" ON "PagoPrestamoEntidad"("movimientoCajaId");

-- CreateIndex
CREATE INDEX "PagoPrestamoEntidad_refOperacionEspecializadaMovCaja_idx" ON "PagoPrestamoEntidad"("refOperacionEspecializadaMovCaja");

-- CreateIndex
CREATE INDEX "PagoPrestamoEntidad_fechaPago_idx" ON "PagoPrestamoEntidad"("fechaPago");

-- CreateIndex
CREATE INDEX "PagoPrestamoEntidad_periodoContableId_idx" ON "PagoPrestamoEntidad"("periodoContableId");

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_cuentaCorrienteId_fkey" FOREIGN KEY ("cuentaCorrienteId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_movimientoCajaDesembolsoId_fkey" FOREIGN KEY ("movimientoCajaDesembolsoId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoEntidad" ADD CONSTRAINT "PrestamoEntidad_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoEntidad" ADD CONSTRAINT "PagoPrestamoEntidad_prestamoEntidadId_fkey" FOREIGN KEY ("prestamoEntidadId") REFERENCES "PrestamoEntidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoEntidad" ADD CONSTRAINT "PagoPrestamoEntidad_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoEntidad" ADD CONSTRAINT "PagoPrestamoEntidad_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoEntidad" ADD CONSTRAINT "PagoPrestamoEntidad_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoEntidad" ADD CONSTRAINT "PagoPrestamoEntidad_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
