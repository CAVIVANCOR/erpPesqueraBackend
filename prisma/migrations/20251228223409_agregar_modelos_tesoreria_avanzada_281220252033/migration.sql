-- CreateEnum
CREATE TYPE "FrecuenciaPago" AS ENUM ('MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "TipoPrestamo" AS ENUM ('CAPITAL_TRABAJO', 'ACTIVO_FIJO', 'HIPOTECARIO', 'VEHICULAR', 'EQUIPAMIENTO', 'EXPANSION', 'REFINANCIAMIENTO');

-- CreateEnum
CREATE TYPE "TipoAmortizacion" AS ENUM ('FRANCES', 'ALEMAN', 'AMERICANO');

-- CreateEnum
CREATE TYPE "TipoGarantia" AS ENUM ('HIPOTECARIA', 'PRENDARIA', 'FIANZA', 'SIN_GARANTIA');

-- CreateEnum
CREATE TYPE "EstadoPagoCuota" AS ENUM ('PENDIENTE', 'PAGADO', 'VENCIDO', 'PARCIAL');

-- CreateEnum
CREATE TYPE "TipoLineaCredito" AS ENUM ('REVOLVENTE', 'CARTA_CREDITO', 'GARANTIA_BANCARIA', 'SOBREGIRO');

-- CreateEnum
CREATE TYPE "EstadoUtilizacionLinea" AS ENUM ('VIGENTE', 'DEVUELTO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "TipoInversion" AS ENUM ('PLAZO_FIJO', 'FONDO_MUTUO', 'BONOS', 'ACCIONES', 'CTS');

-- CreateEnum
CREATE TYPE "TipoMovimientoInversion" AS ENUM ('INVERSION', 'RENDIMIENTO', 'RETIRO', 'AJUSTE', 'LIQUIDACION');

-- CreateTable
CREATE TABLE "PrestamoBancario" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "bancoId" BIGINT NOT NULL,
    "cuentaCorrienteId" BIGINT,
    "numeroPrestamo" VARCHAR(50) NOT NULL,
    "numeroContrato" VARCHAR(50),
    "fechaContrato" TIMESTAMP(3) NOT NULL,
    "fechaDesembolso" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "montoAprobado" DECIMAL(18,2) NOT NULL,
    "montoDesembolsado" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tasaInteresAnual" DECIMAL(7,4) NOT NULL,
    "tasaInteresEfectiva" DECIMAL(7,4),
    "tasaMoratoria" DECIMAL(7,4),
    "comisionInicial" DECIMAL(18,2),
    "comisionMantenimiento" DECIMAL(18,2),
    "seguroDesgravamen" DECIMAL(18,2),
    "plazoMeses" INTEGER NOT NULL,
    "numeroCuotas" INTEGER NOT NULL,
    "frecuenciaPago" "FrecuenciaPago" NOT NULL,
    "diaPago" INTEGER,
    "periodoGracia" INTEGER,
    "tipoPrestamo" "TipoPrestamo" NOT NULL,
    "tipoAmortizacion" "TipoAmortizacion" NOT NULL,
    "destinoFondos" TEXT,
    "tipoGarantia" "TipoGarantia",
    "descripcionGarantia" TEXT,
    "valorGarantia" DECIMAL(18,2),
    "saldoCapital" DECIMAL(18,2) NOT NULL,
    "saldoInteres" DECIMAL(18,2) NOT NULL,
    "capitalPagado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "interesPagado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "estadoId" BIGINT NOT NULL,
    "esRefinanciamiento" BOOLEAN NOT NULL DEFAULT false,
    "prestamoRefinanciadoId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PrestamoBancario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuotaPrestamo" (
    "id" BIGSERIAL NOT NULL,
    "prestamoBancarioId" BIGINT NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "montoCapital" DECIMAL(18,2) NOT NULL,
    "montoInteres" DECIMAL(18,2) NOT NULL,
    "montoComision" DECIMAL(18,2),
    "montoSeguro" DECIMAL(18,2),
    "montoTotal" DECIMAL(18,2) NOT NULL,
    "saldoCapitalAntes" DECIMAL(18,2) NOT NULL,
    "saldoCapitalDespues" DECIMAL(18,2) NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "montoPagado" DECIMAL(18,2),
    "montoMora" DECIMAL(18,2),
    "movimientoCajaId" BIGINT,
    "asientoContableId" BIGINT,
    "estadoPago" "EstadoPagoCuota" NOT NULL,
    "diasMora" INTEGER,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuotaPrestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesembolsoPrestamo" (
    "id" BIGSERIAL NOT NULL,
    "prestamoBancarioId" BIGINT NOT NULL,
    "numeroDesembolso" INTEGER NOT NULL,
    "fechaDesembolso" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "movimientoCajaId" BIGINT NOT NULL,
    "asientoContableId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,

    CONSTRAINT "DesembolsoPrestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarantiaPrestamo" (
    "id" BIGSERIAL NOT NULL,
    "prestamoBancarioId" BIGINT NOT NULL,
    "tipoGarantia" "TipoGarantia" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "valorTasacion" DECIMAL(18,2) NOT NULL,
    "direccionInmueble" VARCHAR(500),
    "partidaRegistral" VARCHAR(100),
    "descripcionBien" TEXT,
    "numeroSerie" VARCHAR(100),
    "nombreFiador" VARCHAR(200),
    "documentoFiador" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaLiberacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarantiaPrestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaCredito" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "bancoId" BIGINT NOT NULL,
    "numeroLinea" VARCHAR(50) NOT NULL,
    "tipoLinea" "TipoLineaCredito" NOT NULL,
    "montoAprobado" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tasaInteres" DECIMAL(7,4) NOT NULL,
    "comisionMantenimiento" DECIMAL(18,2),
    "comisionUtilizacion" DECIMAL(7,4),
    "fechaAprobacion" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "montoUtilizado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "montoDisponible" DECIMAL(18,2) NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "LineaCredito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilizacionLineaCredito" (
    "id" BIGSERIAL NOT NULL,
    "lineaCreditoId" BIGINT NOT NULL,
    "numeroUtilizacion" INTEGER NOT NULL,
    "fechaUtilizacion" TIMESTAMP(3) NOT NULL,
    "montoUtilizado" DECIMAL(18,2) NOT NULL,
    "fechaDevolucion" TIMESTAMP(3),
    "montoDevuelto" DECIMAL(18,2),
    "interesesPagados" DECIMAL(18,2),
    "movimientoCajaUtilizacionId" BIGINT,
    "movimientoCajaDevolucionId" BIGINT,
    "asientoContableId" BIGINT,
    "estadoUtilizacion" "EstadoUtilizacionLinea" NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtilizacionLineaCredito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InversionFinanciera" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "bancoId" BIGINT,
    "numeroInversion" VARCHAR(50) NOT NULL,
    "tipoInversion" "TipoInversion" NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "fechaInversion" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "montoInvertido" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tasaRendimiento" DECIMAL(7,4),
    "valorActual" DECIMAL(18,2) NOT NULL,
    "rendimientoAcumulado" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "estadoId" BIGINT NOT NULL,
    "fechaLiquidacion" TIMESTAMP(3),
    "montoLiquidado" DECIMAL(18,2),
    "movimientoCajaId" BIGINT,
    "asientoContableId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "InversionFinanciera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInversion" (
    "id" BIGSERIAL NOT NULL,
    "inversionFinancieraId" BIGINT NOT NULL,
    "tipoMovimiento" "TipoMovimientoInversion" NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "movimientoCajaId" BIGINT,
    "asientoContableId" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,

    CONSTRAINT "MovimientoInversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrestamoBancario_empresaId_idx" ON "PrestamoBancario"("empresaId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_bancoId_idx" ON "PrestamoBancario"("bancoId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_estadoId_idx" ON "PrestamoBancario"("estadoId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_fechaVencimiento_idx" ON "PrestamoBancario"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "PrestamoBancario_empresaId_estadoId_idx" ON "PrestamoBancario"("empresaId", "estadoId");

-- CreateIndex
CREATE INDEX "PrestamoBancario_cuentaCorrienteId_idx" ON "PrestamoBancario"("cuentaCorrienteId");

-- CreateIndex
CREATE UNIQUE INDEX "PrestamoBancario_empresaId_numeroPrestamo_key" ON "PrestamoBancario"("empresaId", "numeroPrestamo");

-- CreateIndex
CREATE INDEX "CuotaPrestamo_prestamoBancarioId_idx" ON "CuotaPrestamo"("prestamoBancarioId");

-- CreateIndex
CREATE INDEX "CuotaPrestamo_fechaVencimiento_idx" ON "CuotaPrestamo"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "CuotaPrestamo_estadoPago_idx" ON "CuotaPrestamo"("estadoPago");

-- CreateIndex
CREATE INDEX "CuotaPrestamo_fechaPago_idx" ON "CuotaPrestamo"("fechaPago");

-- CreateIndex
CREATE UNIQUE INDEX "CuotaPrestamo_prestamoBancarioId_numeroCuota_key" ON "CuotaPrestamo"("prestamoBancarioId", "numeroCuota");

-- CreateIndex
CREATE INDEX "DesembolsoPrestamo_prestamoBancarioId_idx" ON "DesembolsoPrestamo"("prestamoBancarioId");

-- CreateIndex
CREATE INDEX "DesembolsoPrestamo_fechaDesembolso_idx" ON "DesembolsoPrestamo"("fechaDesembolso");

-- CreateIndex
CREATE INDEX "DesembolsoPrestamo_movimientoCajaId_idx" ON "DesembolsoPrestamo"("movimientoCajaId");

-- CreateIndex
CREATE INDEX "GarantiaPrestamo_prestamoBancarioId_idx" ON "GarantiaPrestamo"("prestamoBancarioId");

-- CreateIndex
CREATE INDEX "GarantiaPrestamo_tipoGarantia_idx" ON "GarantiaPrestamo"("tipoGarantia");

-- CreateIndex
CREATE INDEX "GarantiaPrestamo_activo_idx" ON "GarantiaPrestamo"("activo");

-- CreateIndex
CREATE INDEX "LineaCredito_empresaId_idx" ON "LineaCredito"("empresaId");

-- CreateIndex
CREATE INDEX "LineaCredito_bancoId_idx" ON "LineaCredito"("bancoId");

-- CreateIndex
CREATE INDEX "LineaCredito_estadoId_idx" ON "LineaCredito"("estadoId");

-- CreateIndex
CREATE INDEX "LineaCredito_fechaVencimiento_idx" ON "LineaCredito"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "LineaCredito_empresaId_estadoId_idx" ON "LineaCredito"("empresaId", "estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "LineaCredito_empresaId_numeroLinea_key" ON "LineaCredito"("empresaId", "numeroLinea");

-- CreateIndex
CREATE INDEX "UtilizacionLineaCredito_lineaCreditoId_idx" ON "UtilizacionLineaCredito"("lineaCreditoId");

-- CreateIndex
CREATE INDEX "UtilizacionLineaCredito_fechaUtilizacion_idx" ON "UtilizacionLineaCredito"("fechaUtilizacion");

-- CreateIndex
CREATE INDEX "UtilizacionLineaCredito_estadoUtilizacion_idx" ON "UtilizacionLineaCredito"("estadoUtilizacion");

-- CreateIndex
CREATE INDEX "InversionFinanciera_empresaId_idx" ON "InversionFinanciera"("empresaId");

-- CreateIndex
CREATE INDEX "InversionFinanciera_bancoId_idx" ON "InversionFinanciera"("bancoId");

-- CreateIndex
CREATE INDEX "InversionFinanciera_estadoId_idx" ON "InversionFinanciera"("estadoId");

-- CreateIndex
CREATE INDEX "InversionFinanciera_tipoInversion_idx" ON "InversionFinanciera"("tipoInversion");

-- CreateIndex
CREATE INDEX "InversionFinanciera_fechaVencimiento_idx" ON "InversionFinanciera"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "InversionFinanciera_empresaId_estadoId_idx" ON "InversionFinanciera"("empresaId", "estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "InversionFinanciera_empresaId_numeroInversion_key" ON "InversionFinanciera"("empresaId", "numeroInversion");

-- CreateIndex
CREATE INDEX "MovimientoInversion_inversionFinancieraId_idx" ON "MovimientoInversion"("inversionFinancieraId");

-- CreateIndex
CREATE INDEX "MovimientoInversion_fechaMovimiento_idx" ON "MovimientoInversion"("fechaMovimiento");

-- CreateIndex
CREATE INDEX "MovimientoInversion_tipoMovimiento_idx" ON "MovimientoInversion"("tipoMovimiento");

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_cuentaCorrienteId_fkey" FOREIGN KEY ("cuentaCorrienteId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoBancario" ADD CONSTRAINT "PrestamoBancario_prestamoRefinanciadoId_fkey" FOREIGN KEY ("prestamoRefinanciadoId") REFERENCES "PrestamoBancario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_prestamoBancarioId_fkey" FOREIGN KEY ("prestamoBancarioId") REFERENCES "PrestamoBancario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPrestamo" ADD CONSTRAINT "CuotaPrestamo_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesembolsoPrestamo" ADD CONSTRAINT "DesembolsoPrestamo_prestamoBancarioId_fkey" FOREIGN KEY ("prestamoBancarioId") REFERENCES "PrestamoBancario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesembolsoPrestamo" ADD CONSTRAINT "DesembolsoPrestamo_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesembolsoPrestamo" ADD CONSTRAINT "DesembolsoPrestamo_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesembolsoPrestamo" ADD CONSTRAINT "DesembolsoPrestamo_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiaPrestamo" ADD CONSTRAINT "GarantiaPrestamo_prestamoBancarioId_fkey" FOREIGN KEY ("prestamoBancarioId") REFERENCES "PrestamoBancario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCredito" ADD CONSTRAINT "LineaCredito_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCredito" ADD CONSTRAINT "LineaCredito_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCredito" ADD CONSTRAINT "LineaCredito_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCredito" ADD CONSTRAINT "LineaCredito_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCredito" ADD CONSTRAINT "LineaCredito_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCredito" ADD CONSTRAINT "LineaCredito_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizacionLineaCredito" ADD CONSTRAINT "UtilizacionLineaCredito_lineaCreditoId_fkey" FOREIGN KEY ("lineaCreditoId") REFERENCES "LineaCredito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizacionLineaCredito" ADD CONSTRAINT "UtilizacionLineaCredito_movimientoCajaUtilizacionId_fkey" FOREIGN KEY ("movimientoCajaUtilizacionId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizacionLineaCredito" ADD CONSTRAINT "UtilizacionLineaCredito_movimientoCajaDevolucionId_fkey" FOREIGN KEY ("movimientoCajaDevolucionId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilizacionLineaCredito" ADD CONSTRAINT "UtilizacionLineaCredito_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InversionFinanciera" ADD CONSTRAINT "InversionFinanciera_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInversion" ADD CONSTRAINT "MovimientoInversion_inversionFinancieraId_fkey" FOREIGN KEY ("inversionFinancieraId") REFERENCES "InversionFinanciera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInversion" ADD CONSTRAINT "MovimientoInversion_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInversion" ADD CONSTRAINT "MovimientoInversion_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInversion" ADD CONSTRAINT "MovimientoInversion_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
