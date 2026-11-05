-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "inscritoRemype" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numeroRemype" VARCHAR(30),
ADD COLUMN     "procesaPlanilla" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regimenLaboralId" BIGINT,
ADD COLUMN     "relojcontrolActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relojcontrolApiKey" TEXT,
ADD COLUMN     "tieneEps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usaSis" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "acuerdoCompensacionHoras" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaSctr" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bancoId" BIGINT,
ADD COLUMN     "categoriaPlanillaId" BIGINT,
ADD COLUMN     "cci" VARCHAR(25),
ADD COLUMN     "comisionMixta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cuspp" VARCHAR(20),
ADD COLUMN     "entidadPensionId" BIGINT,
ADD COLUMN     "esObrero" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numeroCuenta" VARCHAR(30),
ADD COLUMN     "tieneAsignacionFamiliar" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RegimenLaboral" (
    "id" BIGSERIAL NOT NULL,
    "codigoSunat" VARCHAR(5) NOT NULL,
    "descripcion" VARCHAR(100) NOT NULL,
    "requiereRemype" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "RegimenLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametroLegal" (
    "id" BIGSERIAL NOT NULL,
    "regimenLaboralId" BIGINT,
    "clave" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(150) NOT NULL,
    "valor" DECIMAL(18,6) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "validadoPorContador" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "ParametroLegal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaPlanilla" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "CategoriaPlanilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntidadPension" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" VARCHAR(100) NOT NULL,
    "codigoAfpnet" VARCHAR(10),
    "esOnp" BOOLEAN NOT NULL DEFAULT false,
    "entidadComercialId" BIGINT,
    "cuentaPasivoEmpleadoId" BIGINT,
    "cuentaPasivoObreroId" BIGINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "EntidadPension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaEntidadPension" (
    "id" BIGSERIAL NOT NULL,
    "entidadPensionId" BIGINT NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "porcentajeAporte" DECIMAL(7,4) NOT NULL,
    "porcentajeSeguro" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "porcentajeComisionFlujo" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "porcentajeComisionMixta" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "remuneracionMaximaAsegurable" DECIMAL(18,2),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "TarifaEntidadPension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoPersonal" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "personalId" BIGINT NOT NULL,
    "esLocacionServicios" BOOLEAN NOT NULL DEFAULT false,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "remuneracionBasica" DECIMAL(18,2) NOT NULL,
    "esJornal" BOOLEAN NOT NULL DEFAULT false,
    "periodicidadDias" INTEGER,
    "pagaPorTemporada" BOOLEAN NOT NULL DEFAULT false,
    "liquidaBeneficiosEnBoleta" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "ContratoPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoPersonalLineaPago" (
    "id" BIGSERIAL NOT NULL,
    "contratoPersonalId" BIGINT NOT NULL,
    "orden" INTEGER NOT NULL,
    "esPlanilla" BOOLEAN NOT NULL DEFAULT true,
    "monto" DECIMAL(18,2),
    "porcentaje" DECIMAL(7,4),
    "esCalculada" BOOLEAN NOT NULL DEFAULT false,
    "esSaldo" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoPersonalLineaPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoPlanilla" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "descripcion" VARCHAR(150) NOT NULL,
    "esDescuento" BOOLEAN NOT NULL DEFAULT false,
    "esAporteEmpleador" BOOLEAN NOT NULL DEFAULT false,
    "esProvision" BOOLEAN NOT NULL DEFAULT false,
    "claveMotor" VARCHAR(60),
    "formula" TEXT,
    "esManual" BOOLEAN NOT NULL DEFAULT false,
    "condicionAplica" TEXT,
    "afectaAfpOnp" BOOLEAN NOT NULL DEFAULT false,
    "afectaEssalud" BOOLEAN NOT NULL DEFAULT false,
    "afectaQuintaCategoria" BOOLEAN NOT NULL DEFAULT false,
    "afectaSctr" BOOLEAN NOT NULL DEFAULT false,
    "cuentaParaGratificacion" BOOLEAN NOT NULL DEFAULT false,
    "cuentaParaCts" BOOLEAN NOT NULL DEFAULT false,
    "cuentaParaVacaciones" BOOLEAN NOT NULL DEFAULT false,
    "esRecurrente" BOOLEAN NOT NULL DEFAULT false,
    "origen" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "codigoPlame" VARCHAR(10),
    "tipoDeudaId" BIGINT,
    "pasivoEsDelTrabajador" BOOLEAN NOT NULL DEFAULT true,
    "visibleEnBoleta" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "esDelSistema" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "ConceptoPlanilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoPlanillaCuenta" (
    "id" BIGSERIAL NOT NULL,
    "conceptoPlanillaId" BIGINT NOT NULL,
    "categoriaPlanillaId" BIGINT NOT NULL,
    "cuentaGastoId" BIGINT,
    "cuentaPasivoId" BIGINT,

    CONSTRAINT "ConceptoPlanillaCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaFormatoExterno" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "descripcion" VARCHAR(150) NOT NULL,
    "definicion" JSONB NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PlantillaFormatoExterno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegimenLaboral_codigoSunat_key" ON "RegimenLaboral"("codigoSunat");

-- CreateIndex
CREATE INDEX "ParametroLegal_clave_vigenteDesde_idx" ON "ParametroLegal"("clave", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "ParametroLegal_regimenLaboralId_clave_vigenteDesde_key" ON "ParametroLegal"("regimenLaboralId", "clave", "vigenteDesde");

-- CreateIndex
CREATE INDEX "EntidadPension_activo_idx" ON "EntidadPension"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "TarifaEntidadPension_entidadPensionId_vigenteDesde_key" ON "TarifaEntidadPension"("entidadPensionId", "vigenteDesde");

-- CreateIndex
CREATE INDEX "ContratoPersonal_empresaId_personalId_activo_idx" ON "ContratoPersonal"("empresaId", "personalId", "activo");

-- CreateIndex
CREATE INDEX "ContratoPersonal_personalId_fechaInicio_idx" ON "ContratoPersonal"("personalId", "fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoPersonalLineaPago_contratoPersonalId_orden_key" ON "ContratoPersonalLineaPago"("contratoPersonalId", "orden");

-- CreateIndex
CREATE INDEX "ConceptoPlanilla_activo_vigenteDesde_idx" ON "ConceptoPlanilla"("activo", "vigenteDesde");

-- CreateIndex
CREATE INDEX "ConceptoPlanilla_tipoDeudaId_idx" ON "ConceptoPlanilla"("tipoDeudaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptoPlanilla_codigo_vigenteDesde_key" ON "ConceptoPlanilla"("codigo", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptoPlanillaCuenta_conceptoPlanillaId_categoriaPlanilla_key" ON "ConceptoPlanillaCuenta"("conceptoPlanillaId", "categoriaPlanillaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaFormatoExterno_codigo_vigenteDesde_key" ON "PlantillaFormatoExterno"("codigo", "vigenteDesde");

-- CreateIndex
CREATE INDEX "Empresa_regimenLaboralId_idx" ON "Empresa"("regimenLaboralId");

-- CreateIndex
CREATE INDEX "Personal_entidadPensionId_idx" ON "Personal"("entidadPensionId");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_regimenLaboralId_fkey" FOREIGN KEY ("regimenLaboralId") REFERENCES "RegimenLaboral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_categoriaPlanillaId_fkey" FOREIGN KEY ("categoriaPlanillaId") REFERENCES "CategoriaPlanilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_entidadPensionId_fkey" FOREIGN KEY ("entidadPensionId") REFERENCES "EntidadPension"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametroLegal" ADD CONSTRAINT "ParametroLegal_regimenLaboralId_fkey" FOREIGN KEY ("regimenLaboralId") REFERENCES "RegimenLaboral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadPension" ADD CONSTRAINT "EntidadPension_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadPension" ADD CONSTRAINT "EntidadPension_cuentaPasivoEmpleadoId_fkey" FOREIGN KEY ("cuentaPasivoEmpleadoId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadPension" ADD CONSTRAINT "EntidadPension_cuentaPasivoObreroId_fkey" FOREIGN KEY ("cuentaPasivoObreroId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaEntidadPension" ADD CONSTRAINT "TarifaEntidadPension_entidadPensionId_fkey" FOREIGN KEY ("entidadPensionId") REFERENCES "EntidadPension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoPersonal" ADD CONSTRAINT "ContratoPersonal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoPersonal" ADD CONSTRAINT "ContratoPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoPersonalLineaPago" ADD CONSTRAINT "ContratoPersonalLineaPago_contratoPersonalId_fkey" FOREIGN KEY ("contratoPersonalId") REFERENCES "ContratoPersonal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoPlanilla" ADD CONSTRAINT "ConceptoPlanilla_tipoDeudaId_fkey" FOREIGN KEY ("tipoDeudaId") REFERENCES "TipoDeudaPersonal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoPlanillaCuenta" ADD CONSTRAINT "ConceptoPlanillaCuenta_conceptoPlanillaId_fkey" FOREIGN KEY ("conceptoPlanillaId") REFERENCES "ConceptoPlanilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoPlanillaCuenta" ADD CONSTRAINT "ConceptoPlanillaCuenta_categoriaPlanillaId_fkey" FOREIGN KEY ("categoriaPlanillaId") REFERENCES "CategoriaPlanilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoPlanillaCuenta" ADD CONSTRAINT "ConceptoPlanillaCuenta_cuentaGastoId_fkey" FOREIGN KEY ("cuentaGastoId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoPlanillaCuenta" ADD CONSTRAINT "ConceptoPlanillaCuenta_cuentaPasivoId_fkey" FOREIGN KEY ("cuentaPasivoId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
