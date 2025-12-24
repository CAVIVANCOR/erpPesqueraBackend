-- AlterTable
ALTER TABLE "AsientoContableInterfaz" ADD COLUMN     "creadoEn" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "enviadoPorId" BIGINT,
ADD COLUMN     "mensajeError" TEXT;

-- AlterTable
ALTER TABLE "CuentaCorriente" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPorId" BIGINT,
ADD COLUMN     "creadoEn" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPorId" BIGINT,
ADD COLUMN     "fechaApertura" TIMESTAMP(3),
ADD COLUMN     "fechaCierre" TIMESTAMP(3),
ADD COLUMN     "saldoMinimo" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "aprobadoPorId" BIGINT,
ADD COLUMN     "asientosGenerados" BOOLEAN DEFAULT false,
ADD COLUMN     "esReversion" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaAprobacion" TIMESTAMP(3),
ADD COLUMN     "fechaRechazo" TIMESTAMP(3),
ADD COLUMN     "generarAsientoContable" BOOLEAN DEFAULT true,
ADD COLUMN     "incluirEnReporteFiscal" BOOLEAN DEFAULT true,
ADD COLUMN     "motivoRechazo" TEXT,
ADD COLUMN     "motivoReversion" TEXT,
ADD COLUMN     "motivoSinFactura" TEXT,
ADD COLUMN     "movimientoRevertidoId" BIGINT,
ADD COLUMN     "rechazadoPorId" BIGINT;

-- CreateTable
CREATE TABLE "SaldoCuentaCorriente" (
    "id" BIGSERIAL NOT NULL,
    "cuentaCorrienteId" BIGINT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saldoAnterior" DECIMAL(18,2) NOT NULL,
    "ingresos" DECIMAL(18,2) NOT NULL,
    "egresos" DECIMAL(18,2) NOT NULL,
    "saldoActual" DECIMAL(18,2) NOT NULL,
    "movimientoCajaId" BIGINT,
    "saldoContable" DECIMAL(18,2),
    "diferencia" DECIMAL(18,2),
    "conciliado" BOOLEAN DEFAULT false,
    "fechaConciliacion" TIMESTAMP(3),
    "centroCostoId" BIGINT,
    "creadoEn" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaldoCuentaCorriente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionCuentaContable" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "tipoReferenciaId" BIGINT,
    "cuentaContableDebe" VARCHAR(20) NOT NULL,
    "cuentaContableHaber" VARCHAR(20) NOT NULL,
    "descripcionPlantilla" VARCHAR(200),
    "activo" BOOLEAN DEFAULT true,
    "creadoEn" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3),
    "creadoPorId" BIGINT,
    "actualizadoPorId" BIGINT,

    CONSTRAINT "ConfiguracionCuentaContable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaldoCuentaCorriente_cuentaCorrienteId_fecha_idx" ON "SaldoCuentaCorriente"("cuentaCorrienteId", "fecha");

-- CreateIndex
CREATE INDEX "SaldoCuentaCorriente_empresaId_idx" ON "SaldoCuentaCorriente"("empresaId");

-- CreateIndex
CREATE INDEX "SaldoCuentaCorriente_fecha_idx" ON "SaldoCuentaCorriente"("fecha");

-- CreateIndex
CREATE INDEX "SaldoCuentaCorriente_conciliado_idx" ON "SaldoCuentaCorriente"("conciliado");

-- CreateIndex
CREATE INDEX "SaldoCuentaCorriente_centroCostoId_idx" ON "SaldoCuentaCorriente"("centroCostoId");

-- CreateIndex
CREATE INDEX "ConfiguracionCuentaContable_empresaId_idx" ON "ConfiguracionCuentaContable"("empresaId");

-- CreateIndex
CREATE INDEX "ConfiguracionCuentaContable_tipoMovimientoId_tipoReferencia_idx" ON "ConfiguracionCuentaContable"("tipoMovimientoId", "tipoReferenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionCuentaContable_empresaId_tipoMovimientoId_tipo_key" ON "ConfiguracionCuentaContable"("empresaId", "tipoMovimientoId", "tipoReferenciaId");

-- CreateIndex
CREATE INDEX "AsientoContableInterfaz_estado_idx" ON "AsientoContableInterfaz"("estado");

-- CreateIndex
CREATE INDEX "AsientoContableInterfaz_fechaContable_idx" ON "AsientoContableInterfaz"("fechaContable");

-- CreateIndex
CREATE INDEX "AsientoContableInterfaz_enviadoPorId_idx" ON "AsientoContableInterfaz"("enviadoPorId");

-- CreateIndex
CREATE INDEX "CuentaCorriente_empresaId_idx" ON "CuentaCorriente"("empresaId");

-- CreateIndex
CREATE INDEX "CuentaCorriente_activa_idx" ON "CuentaCorriente"("activa");

-- CreateIndex
CREATE INDEX "CuentaCorriente_fechaCierre_idx" ON "CuentaCorriente"("fechaCierre");

-- CreateIndex
CREATE INDEX "MovimientoCaja_esReversion_idx" ON "MovimientoCaja"("esReversion");

-- CreateIndex
CREATE INDEX "MovimientoCaja_movimientoRevertidoId_idx" ON "MovimientoCaja"("movimientoRevertidoId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_asientosGenerados_idx" ON "MovimientoCaja"("asientosGenerados");

-- CreateIndex
CREATE INDEX "MovimientoCaja_incluirEnReporteFiscal_idx" ON "MovimientoCaja"("incluirEnReporteFiscal");

-- CreateIndex
CREATE INDEX "MovimientoCaja_aprobadoPorId_idx" ON "MovimientoCaja"("aprobadoPorId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_rechazadoPorId_idx" ON "MovimientoCaja"("rechazadoPorId");

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoCuentaCorriente" ADD CONSTRAINT "SaldoCuentaCorriente_cuentaCorrienteId_fkey" FOREIGN KEY ("cuentaCorrienteId") REFERENCES "CuentaCorriente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoCuentaCorriente" ADD CONSTRAINT "SaldoCuentaCorriente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoCuentaCorriente" ADD CONSTRAINT "SaldoCuentaCorriente_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoCuentaCorriente" ADD CONSTRAINT "SaldoCuentaCorriente_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_tipoReferenciaId_fkey" FOREIGN KEY ("tipoReferenciaId") REFERENCES "TipoReferenciaMovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_rechazadoPorId_fkey" FOREIGN KEY ("rechazadoPorId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_movimientoRevertidoId_fkey" FOREIGN KEY ("movimientoRevertidoId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
