-- CreateTable
CREATE TABLE "PrestamoRelacionado" (
    "id" BIGSERIAL NOT NULL,
    "empresaPrestamistaId" BIGINT NOT NULL,
    "empresaPrestatariaId" BIGINT NOT NULL,
    "numeroPrestamo" VARCHAR(50) NOT NULL,
    "esGerencial" BOOLEAN NOT NULL DEFAULT false,
    "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false,
    "montoPagadoAnterior" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "numeroOperacion" VARCHAR(40),
    "cuentaCorrientePrestamistaId" BIGINT,
    "cuentaCorrientePrestatariaId" BIGINT,
    "movimientoCajaDesembolsoPrestamistaId" BIGINT,
    "movimientoCajaDesembolsoPrestatariaId" BIGINT,
    "refOperacionEspecializadaMovCaja" BIGINT,
    "medioPagoPrestamistaId" BIGINT,
    "medioPagoPrestatariaId" BIGINT,
    "monedaEntregaPrestamistaId" BIGINT,
    "montoEntregadoPrestamista" DECIMAL(18,2),
    "monedaRecepcionPrestatariaId" BIGINT,
    "montoRecibidoPrestataria" DECIMAL(18,2),
    "fechaContable" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "periodoContableId" BIGINT,
    "fechaDesembolso" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "monedaId" BIGINT NOT NULL,
    "montoDesembolsado" DECIMAL(18,2) NOT NULL,
    "tipoCambioAplicado" DECIMAL(10,4),
    "saldoCapital" DECIMAL(18,2) NOT NULL,
    "capitalDevuelto" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "estadoId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PrestamoRelacionado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoPrestamoRelacionado" (
    "id" BIGSERIAL NOT NULL,
    "prestamoRelacionadoId" BIGINT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "numeroOperacion" VARCHAR(40),
    "montoAplicado" DECIMAL(18,2) NOT NULL,
    "monedaPrestamoId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "monedaPagoPrestatariaId" BIGINT NOT NULL,
    "montoPagadoPrestataria" DECIMAL(18,2) NOT NULL,
    "medioPagoPrestatariaId" BIGINT,
    "movimientoCajaPrestatariaId" BIGINT,
    "monedaCobroPrestamistaId" BIGINT NOT NULL,
    "montoCobradoPrestamista" DECIMAL(18,2) NOT NULL,
    "medioPagoPrestamistaId" BIGINT,
    "movimientoCajaPrestamistaId" BIGINT,
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

    CONSTRAINT "PagoPrestamoRelacionado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_empresaPrestamistaId_empresaPrestataria_idx" ON "PrestamoRelacionado"("empresaPrestamistaId", "empresaPrestatariaId", "estadoId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_empresaPrestatariaId_idx" ON "PrestamoRelacionado"("empresaPrestatariaId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_estadoId_idx" ON "PrestamoRelacionado"("estadoId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_esSaldoInicial_idx" ON "PrestamoRelacionado"("esSaldoInicial");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_fechaVencimiento_idx" ON "PrestamoRelacionado"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_movimientoCajaDesembolsoPrestamistaId_idx" ON "PrestamoRelacionado"("movimientoCajaDesembolsoPrestamistaId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_movimientoCajaDesembolsoPrestatariaId_idx" ON "PrestamoRelacionado"("movimientoCajaDesembolsoPrestatariaId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_medioPagoPrestamistaId_idx" ON "PrestamoRelacionado"("medioPagoPrestamistaId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_medioPagoPrestatariaId_idx" ON "PrestamoRelacionado"("medioPagoPrestatariaId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_periodoContableId_idx" ON "PrestamoRelacionado"("periodoContableId");

-- CreateIndex
CREATE INDEX "PrestamoRelacionado_refOperacionEspecializadaMovCaja_idx" ON "PrestamoRelacionado"("refOperacionEspecializadaMovCaja");

-- CreateIndex
CREATE UNIQUE INDEX "PrestamoRelacionado_empresaPrestamistaId_numeroPrestamo_key" ON "PrestamoRelacionado"("empresaPrestamistaId", "numeroPrestamo");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_prestamoRelacionadoId_idx" ON "PagoPrestamoRelacionado"("prestamoRelacionadoId");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_medioPagoPrestatariaId_idx" ON "PagoPrestamoRelacionado"("medioPagoPrestatariaId");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_medioPagoPrestamistaId_idx" ON "PagoPrestamoRelacionado"("medioPagoPrestamistaId");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_movimientoCajaPrestatariaId_idx" ON "PagoPrestamoRelacionado"("movimientoCajaPrestatariaId");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_movimientoCajaPrestamistaId_idx" ON "PagoPrestamoRelacionado"("movimientoCajaPrestamistaId");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_refOperacionEspecializadaMovCaja_idx" ON "PagoPrestamoRelacionado"("refOperacionEspecializadaMovCaja");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_fechaPago_idx" ON "PagoPrestamoRelacionado"("fechaPago");

-- CreateIndex
CREATE INDEX "PagoPrestamoRelacionado_periodoContableId_idx" ON "PagoPrestamoRelacionado"("periodoContableId");

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_empresaPrestamistaId_fkey" FOREIGN KEY ("empresaPrestamistaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_empresaPrestatariaId_fkey" FOREIGN KEY ("empresaPrestatariaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_cuentaCorrientePrestamistaId_fkey" FOREIGN KEY ("cuentaCorrientePrestamistaId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_cuentaCorrientePrestatariaId_fkey" FOREIGN KEY ("cuentaCorrientePrestatariaId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_movimientoCajaDesembolsoPrestamistaId_fkey" FOREIGN KEY ("movimientoCajaDesembolsoPrestamistaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_movimientoCajaDesembolsoPrestatariaId_fkey" FOREIGN KEY ("movimientoCajaDesembolsoPrestatariaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_medioPagoPrestamistaId_fkey" FOREIGN KEY ("medioPagoPrestamistaId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_medioPagoPrestatariaId_fkey" FOREIGN KEY ("medioPagoPrestatariaId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_monedaEntregaPrestamistaId_fkey" FOREIGN KEY ("monedaEntregaPrestamistaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_monedaRecepcionPrestatariaId_fkey" FOREIGN KEY ("monedaRecepcionPrestatariaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoRelacionado" ADD CONSTRAINT "PrestamoRelacionado_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_prestamoRelacionadoId_fkey" FOREIGN KEY ("prestamoRelacionadoId") REFERENCES "PrestamoRelacionado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_monedaPrestamoId_fkey" FOREIGN KEY ("monedaPrestamoId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_monedaPagoPrestatariaId_fkey" FOREIGN KEY ("monedaPagoPrestatariaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_monedaCobroPrestamistaId_fkey" FOREIGN KEY ("monedaCobroPrestamistaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_medioPagoPrestatariaId_fkey" FOREIGN KEY ("medioPagoPrestatariaId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_medioPagoPrestamistaId_fkey" FOREIGN KEY ("medioPagoPrestamistaId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_movimientoCajaPrestatariaId_fkey" FOREIGN KEY ("movimientoCajaPrestatariaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_movimientoCajaPrestamistaId_fkey" FOREIGN KEY ("movimientoCajaPrestamistaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPrestamoRelacionado" ADD CONSTRAINT "PagoPrestamoRelacionado_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
