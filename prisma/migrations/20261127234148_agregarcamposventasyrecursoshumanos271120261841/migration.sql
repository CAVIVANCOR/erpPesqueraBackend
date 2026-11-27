-- AlterTable
ALTER TABLE "ContratoPersonal" ADD COLUMN     "movilidadFija" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "DetalleComprobante" ADD COLUMN     "mostrarDescripcionArmada" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "DetallePreFactura" ADD COLUMN     "mostrarDescripcionArmada" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "tipoComisionPensionId" BIGINT;

-- AlterTable
ALTER TABLE "TipoContrato" ADD COLUMN     "esGerencial" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TipoComisionPension" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "sinComision" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoComisionPension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaEntidadPensionComision" (
    "id" BIGSERIAL NOT NULL,
    "tarifaEntidadPensionId" BIGINT NOT NULL,
    "tipoComisionPensionId" BIGINT NOT NULL,
    "porcentaje" DECIMAL(7,4) NOT NULL DEFAULT 0,

    CONSTRAINT "TarifaEntidadPensionComision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoComisionPension_codigo_key" ON "TipoComisionPension"("codigo");

-- CreateIndex
CREATE INDEX "TarifaEntidadPensionComision_tipoComisionPensionId_idx" ON "TarifaEntidadPensionComision"("tipoComisionPensionId");

-- CreateIndex
CREATE UNIQUE INDEX "TarifaEntidadPensionComision_tarifaEntidadPensionId_tipoCom_key" ON "TarifaEntidadPensionComision"("tarifaEntidadPensionId", "tipoComisionPensionId");

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_tipoComisionPensionId_fkey" FOREIGN KEY ("tipoComisionPensionId") REFERENCES "TipoComisionPension"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaEntidadPensionComision" ADD CONSTRAINT "TarifaEntidadPensionComision_tarifaEntidadPensionId_fkey" FOREIGN KEY ("tarifaEntidadPensionId") REFERENCES "TarifaEntidadPension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaEntidadPensionComision" ADD CONSTRAINT "TarifaEntidadPensionComision_tipoComisionPensionId_fkey" FOREIGN KEY ("tipoComisionPensionId") REFERENCES "TipoComisionPension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
