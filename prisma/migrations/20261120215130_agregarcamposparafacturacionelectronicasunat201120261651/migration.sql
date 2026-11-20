-- AlterTable
ALTER TABLE "ComprobanteElectronico" ADD COLUMN     "nombreArchivo" VARCHAR(60);

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "facturacionElectronicaBoletaModo" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "facturacionElectronicaEntorno" VARCHAR(12) NOT NULL DEFAULT 'DEMO',
ADD COLUMN     "facturacionElectronicaUsuario" TEXT;

-- AlterTable
ALTER TABLE "SerieDoc" ADD COLUMN     "esElectronica" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ResumenSunat" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipo" VARCHAR(2) NOT NULL,
    "fechaReferencia" DATE NOT NULL,
    "correlativoDia" INTEGER NOT NULL,
    "nombreArchivo" VARCHAR(60) NOT NULL,
    "ticket" VARCHAR(60),
    "estado" VARCHAR(20) NOT NULL,
    "codigoRespuesta" VARCHAR(10),
    "mensajeRespuesta" TEXT,
    "rutaLocalXML" VARCHAR(500),
    "rutaLocalCDR" VARCHAR(500),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRespuesta" TIMESTAMP(3),
    "creadoPor" BIGINT,

    CONSTRAINT "ResumenSunat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleResumenSunat" (
    "id" BIGSERIAL NOT NULL,
    "resumenSunatId" BIGINT NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "comprobanteElectronicoId" BIGINT NOT NULL,
    "estadoItem" INTEGER NOT NULL,
    "motivo" VARCHAR(250),

    CONSTRAINT "DetalleResumenSunat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumenSunat_empresaId_tipo_fechaReferencia_idx" ON "ResumenSunat"("empresaId", "tipo", "fechaReferencia");

-- CreateIndex
CREATE INDEX "ResumenSunat_estado_idx" ON "ResumenSunat"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "ResumenSunat_empresaId_nombreArchivo_key" ON "ResumenSunat"("empresaId", "nombreArchivo");

-- CreateIndex
CREATE INDEX "DetalleResumenSunat_resumenSunatId_idx" ON "DetalleResumenSunat"("resumenSunatId");

-- CreateIndex
CREATE INDEX "DetalleResumenSunat_comprobanteElectronicoId_idx" ON "DetalleResumenSunat"("comprobanteElectronicoId");

-- AddForeignKey
ALTER TABLE "ResumenSunat" ADD CONSTRAINT "ResumenSunat_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleResumenSunat" ADD CONSTRAINT "DetalleResumenSunat_resumenSunatId_fkey" FOREIGN KEY ("resumenSunatId") REFERENCES "ResumenSunat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleResumenSunat" ADD CONSTRAINT "DetalleResumenSunat_comprobanteElectronicoId_fkey" FOREIGN KEY ("comprobanteElectronicoId") REFERENCES "ComprobanteElectronico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
