-- AlterTable
ALTER TABLE "AsientoContable" ADD COLUMN     "esGerencial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipoLibroId" BIGINT;

-- CreateTable
CREATE TABLE "TipoLibroContableSunat" (
    "id" BIGSERIAL NOT NULL,
    "codigoSunat" VARCHAR(2) NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoLibroContableSunat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoLibroContableSunat_codigoSunat_key" ON "TipoLibroContableSunat"("codigoSunat");

-- CreateIndex
CREATE INDEX "TipoLibroContableSunat_codigoSunat_idx" ON "TipoLibroContableSunat"("codigoSunat");

-- CreateIndex
CREATE INDEX "TipoLibroContableSunat_activo_idx" ON "TipoLibroContableSunat"("activo");

-- CreateIndex
CREATE INDEX "AsientoContable_tipoLibroId_idx" ON "AsientoContable"("tipoLibroId");

-- CreateIndex
CREATE INDEX "AsientoContable_esGerencial_idx" ON "AsientoContable"("esGerencial");

-- CreateIndex
CREATE INDEX "AsientoContable_esSaldoInicial_idx" ON "AsientoContable"("esSaldoInicial");

-- CreateIndex
CREATE INDEX "AsientoContable_empresaId_tipoLibroId_estadoId_idx" ON "AsientoContable"("empresaId", "tipoLibroId", "estadoId");

-- CreateIndex
CREATE INDEX "AsientoContable_periodoContableId_tipoLibroId_esSaldoInicia_idx" ON "AsientoContable"("periodoContableId", "tipoLibroId", "esSaldoInicial");

-- CreateIndex
CREATE INDEX "AsientoContable_periodoContableId_fechaAsiento_idx" ON "AsientoContable"("periodoContableId", "fechaAsiento");

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_tipoLibroId_fkey" FOREIGN KEY ("tipoLibroId") REFERENCES "TipoLibroContableSunat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
