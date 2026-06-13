/*
  Warnings:

  - You are about to drop the column `saldo` on the `DeudaConPersonal` table. All the data in the column will be lost.
  - Added the required column `fechaVencimiento` to the `DeudaConPersonal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoPendiente` to the `DeudaConPersonal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `PagoDeudaPersonal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `TipoDeudaPersonal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeudaConPersonal" DROP COLUMN "saldo",
ADD COLUMN     "esGerencial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "moduloOrigenId" BIGINT,
ADD COLUMN     "origenId" BIGINT,
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "saldoPendiente" DECIMAL(18,2) NOT NULL;

-- AlterTable
ALTER TABLE "PagoDeudaPersonal" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "movimientoCajaId" BIGINT;

-- AlterTable
ALTER TABLE "TipoDeudaPersonal" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" BIGINT;

-- CreateTable
CREATE TABLE "TipoDeudaTributaria" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "entidadRecaudadoraId" BIGINT,
    "periodicidad" "FrecuenciaPago" NOT NULL,
    "cuentaContableId" BIGINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "TipoDeudaTributaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeudaTributaria" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoDeudaId" BIGINT NOT NULL,
    "moduloOrigenId" BIGINT,
    "origenId" BIGINT,
    "periodo" VARCHAR(20) NOT NULL,
    "fechaGeneracion" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "numeroDeclaracion" VARCHAR(40),
    "montoOriginal" DECIMAL(18,2) NOT NULL,
    "montoPagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldoPendiente" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "esSaldoInicial" BOOLEAN NOT NULL DEFAULT false,
    "fechaContable" TIMESTAMP(3),
    "periodoContableId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DeudaTributaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoDeudaTributaria" (
    "id" BIGSERIAL NOT NULL,
    "deudaTributariaId" BIGINT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "montoPago" DECIMAL(18,2) NOT NULL,
    "medioPagoId" BIGINT,
    "numeroOperacion" VARCHAR(40),
    "numeroConstancia" VARCHAR(40),
    "movimientoCajaId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PagoDeudaTributaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AsientoContableToDeudaTributaria" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToDeudaTributaria_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsientoContableToPagoDeudaTributaria" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_AsientoContableToPagoDeudaTributaria_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "TipoDeudaTributaria_entidadRecaudadoraId_idx" ON "TipoDeudaTributaria"("entidadRecaudadoraId");

-- CreateIndex
CREATE INDEX "TipoDeudaTributaria_cuentaContableId_idx" ON "TipoDeudaTributaria"("cuentaContableId");

-- CreateIndex
CREATE INDEX "TipoDeudaTributaria_periodicidad_idx" ON "TipoDeudaTributaria"("periodicidad");

-- CreateIndex
CREATE INDEX "DeudaTributaria_empresaId_fechaVencimiento_idx" ON "DeudaTributaria"("empresaId", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "DeudaTributaria_empresaId_periodo_estadoId_idx" ON "DeudaTributaria"("empresaId", "periodo", "estadoId");

-- CreateIndex
CREATE INDEX "DeudaTributaria_tipoDeudaId_periodo_idx" ON "DeudaTributaria"("tipoDeudaId", "periodo");

-- CreateIndex
CREATE INDEX "DeudaTributaria_fechaVencimiento_estadoId_idx" ON "DeudaTributaria"("fechaVencimiento", "estadoId");

-- CreateIndex
CREATE INDEX "DeudaTributaria_estadoId_idx" ON "DeudaTributaria"("estadoId");

-- CreateIndex
CREATE INDEX "DeudaTributaria_saldoPendiente_idx" ON "DeudaTributaria"("saldoPendiente");

-- CreateIndex
CREATE INDEX "DeudaTributaria_esSaldoInicial_idx" ON "DeudaTributaria"("esSaldoInicial");

-- CreateIndex
CREATE INDEX "DeudaTributaria_periodoContableId_idx" ON "DeudaTributaria"("periodoContableId");

-- CreateIndex
CREATE INDEX "DeudaTributaria_moduloOrigenId_origenId_idx" ON "DeudaTributaria"("moduloOrigenId", "origenId");

-- CreateIndex
CREATE INDEX "PagoDeudaTributaria_deudaTributariaId_idx" ON "PagoDeudaTributaria"("deudaTributariaId");

-- CreateIndex
CREATE INDEX "PagoDeudaTributaria_movimientoCajaId_idx" ON "PagoDeudaTributaria"("movimientoCajaId");

-- CreateIndex
CREATE INDEX "PagoDeudaTributaria_fechaPago_idx" ON "PagoDeudaTributaria"("fechaPago");

-- CreateIndex
CREATE INDEX "PagoDeudaTributaria_medioPagoId_idx" ON "PagoDeudaTributaria"("medioPagoId");

-- CreateIndex
CREATE INDEX "_AsientoContableToDeudaTributaria_B_index" ON "_AsientoContableToDeudaTributaria"("B");

-- CreateIndex
CREATE INDEX "_AsientoContableToPagoDeudaTributaria_B_index" ON "_AsientoContableToPagoDeudaTributaria"("B");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_empresaId_fechaVencimiento_idx" ON "DeudaConPersonal"("empresaId", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_personalId_estadoId_idx" ON "DeudaConPersonal"("personalId", "estadoId");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_fechaVencimiento_estadoId_idx" ON "DeudaConPersonal"("fechaVencimiento", "estadoId");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_estadoId_idx" ON "DeudaConPersonal"("estadoId");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_saldoPendiente_idx" ON "DeudaConPersonal"("saldoPendiente");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_periodoContableId_idx" ON "DeudaConPersonal"("periodoContableId");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_esGerencial_idx" ON "DeudaConPersonal"("esGerencial");

-- CreateIndex
CREATE INDEX "DeudaConPersonal_moduloOrigenId_origenId_idx" ON "DeudaConPersonal"("moduloOrigenId", "origenId");

-- CreateIndex
CREATE INDEX "PagoDeudaPersonal_movimientoCajaId_idx" ON "PagoDeudaPersonal"("movimientoCajaId");

-- CreateIndex
CREATE INDEX "PagoDeudaPersonal_fechaPago_idx" ON "PagoDeudaPersonal"("fechaPago");

-- AddForeignKey
ALTER TABLE "DeudaConPersonal" ADD CONSTRAINT "DeudaConPersonal_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaPersonal" ADD CONSTRAINT "PagoDeudaPersonal_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoDeudaTributaria" ADD CONSTRAINT "TipoDeudaTributaria_entidadRecaudadoraId_fkey" FOREIGN KEY ("entidadRecaudadoraId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoDeudaTributaria" ADD CONSTRAINT "TipoDeudaTributaria_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaTributaria" ADD CONSTRAINT "DeudaTributaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaTributaria" ADD CONSTRAINT "DeudaTributaria_tipoDeudaId_fkey" FOREIGN KEY ("tipoDeudaId") REFERENCES "TipoDeudaTributaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaTributaria" ADD CONSTRAINT "DeudaTributaria_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaTributaria" ADD CONSTRAINT "DeudaTributaria_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaTributaria" ADD CONSTRAINT "DeudaTributaria_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaTributaria" ADD CONSTRAINT "PagoDeudaTributaria_deudaTributariaId_fkey" FOREIGN KEY ("deudaTributariaId") REFERENCES "DeudaTributaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaTributaria" ADD CONSTRAINT "PagoDeudaTributaria_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeudaTributaria" ADD CONSTRAINT "PagoDeudaTributaria_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDeudaTributaria" ADD CONSTRAINT "_AsientoContableToDeudaTributaria_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToDeudaTributaria" ADD CONSTRAINT "_AsientoContableToDeudaTributaria_B_fkey" FOREIGN KEY ("B") REFERENCES "DeudaTributaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoDeudaTributaria" ADD CONSTRAINT "_AsientoContableToPagoDeudaTributaria_A_fkey" FOREIGN KEY ("A") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsientoContableToPagoDeudaTributaria" ADD CONSTRAINT "_AsientoContableToPagoDeudaTributaria_B_fkey" FOREIGN KEY ("B") REFERENCES "PagoDeudaTributaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
