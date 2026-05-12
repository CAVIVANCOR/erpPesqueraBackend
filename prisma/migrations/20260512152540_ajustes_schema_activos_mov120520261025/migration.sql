-- AlterTable
ALTER TABLE "Activo" ADD COLUMN     "costoOriginal" DECIMAL(18,2),
ADD COLUMN     "depreciacionAcumulada" DECIMAL(18,2),
ADD COLUMN     "fechaAdquisicion" TIMESTAMP(3),
ADD COLUMN     "monedaId" BIGINT,
ADD COLUMN     "vidaUtilAnios" INTEGER;

-- CreateTable
CREATE TABLE "TipoMovimientoActivoFijo" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoMovimientoActivoFijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoActivoFijo" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "activoId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "fechaContable" TIMESTAMP(3),
    "monto" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "depreciacionMensual" DECIMAL(18,2),
    "depreciacionAcumulada" DECIMAL(18,2),
    "valorNeto" DECIMAL(18,2),
    "observaciones" TEXT,
    "asientoContableId" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "MovimientoActivoFijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoDeudaPersonal" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoDeudaPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeudaConPersonal" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "personalId" BIGINT NOT NULL,
    "tipoDeudaId" BIGINT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "fechaContable" TIMESTAMP(3),
    "numeroDocumento" VARCHAR(40),
    "montoOriginal" DECIMAL(18,2) NOT NULL,
    "montoPagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "asientoContableId" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DeudaConPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoDeudaPersonal" (
    "id" BIGSERIAL NOT NULL,
    "deudaConPersonalId" BIGINT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "montoPago" DECIMAL(18,2) NOT NULL,
    "medioPagoId" BIGINT,
    "numeroOperacion" VARCHAR(40),
    "observaciones" TEXT,
    "asientoContableId" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,

    CONSTRAINT "PagoDeudaPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimientoActivoFijo_empresaId_activoId_fechaMovimiento_idx" ON "MovimientoActivoFijo"("empresaId", "activoId", "fechaMovimiento");

-- CreateIndex
CREATE INDEX "MovimientoActivoFijo_asientoContableId_idx" ON "MovimientoActivoFijo"("asientoContableId");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_empresaId_personalId_estadoId_idx" ON "DeudaConPersonal"("empresaId", "personalId", "estadoId");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_asientoContableId_idx" ON "DeudaConPersonal"("asientoContableId");

-- CreateIndex
CREATE INDEX "PagoDeudaPersonal_deudaConPersonalId_idx" ON "PagoDeudaPersonal"("deudaConPersonalId");

-- CreateIndex
CREATE INDEX "PagoDeudaPersonal_asientoContableId_idx" ON "PagoDeudaPersonal"("asientoContableId");

-- CreateIndex
CREATE INDEX "PagoDeudaPersonal_medioPagoId_idx" ON "PagoDeudaPersonal"("medioPagoId");

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoActivoFijo" ADD CONSTRAINT "MovimientoActivoFijo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoActivoFijo" ADD CONSTRAINT "MovimientoActivoFijo_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoActivoFijo" ADD CONSTRAINT "MovimientoActivoFijo_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovimientoActivoFijo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoActivoFijo" ADD CONSTRAINT "MovimientoActivoFijo_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoActivoFijo" ADD CONSTRAINT "MovimientoActivoFijo_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaConPersonal" ADD CONSTRAINT "DeudaConPersonal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaConPersonal" ADD CONSTRAINT "DeudaConPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaConPersonal" ADD CONSTRAINT "DeudaConPersonal_tipoDeudaId_fkey" FOREIGN KEY ("tipoDeudaId") REFERENCES "TipoDeudaPersonal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaConPersonal" ADD CONSTRAINT "DeudaConPersonal_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaConPersonal" ADD CONSTRAINT "DeudaConPersonal_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaConPersonal" ADD CONSTRAINT "DeudaConPersonal_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaPersonal" ADD CONSTRAINT "PagoDeudaPersonal_deudaConPersonalId_fkey" FOREIGN KEY ("deudaConPersonalId") REFERENCES "DeudaConPersonal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaPersonal" ADD CONSTRAINT "PagoDeudaPersonal_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaPersonal" ADD CONSTRAINT "PagoDeudaPersonal_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
