/*
  Warnings:

  - You are about to drop the column `tipoEntidadId` on the `EstadoMultiFuncion` table. All the data in the column will be lost.
  - You are about to drop the column `cesado` on the `TipoEntidad` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TipoEntidad` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TipoEntidad` table. All the data in the column will be lost.
  - Added the required column `temporadaPescaId` to the `Cala` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temporadaPescaId` to the `CalaProduce` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temporadaPescaId` to the `DescargaFaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temporada_pesca_id` to the `LiquidacionFaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `TipoEntidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codSunat` to the `TiposDocIdentidad` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EstadoMultiFuncion" DROP CONSTRAINT "EstadoMultiFuncion_tipoEntidadId_fkey";

-- AlterTable
ALTER TABLE "Cala" ADD COLUMN     "temporadaPescaId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "CalaProduce" ADD COLUMN     "temporadaPescaId" BIGINT NOT NULL,
ADD COLUMN     "urlInformeCalaProduce" TEXT;

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ADD COLUMN     "temporadaPescaId" BIGINT NOT NULL,
ADD COLUMN     "urlInformeDescargaProduce" TEXT;

-- AlterTable
ALTER TABLE "EstadoMultiFuncion" DROP COLUMN "tipoEntidadId",
ADD COLUMN     "tipoEntidadEstadoId" BIGINT;

-- AlterTable
ALTER TABLE "FaenaPesca" ADD COLUMN     "urlInformeFaena" TEXT;

-- AlterTable
ALTER TABLE "LiquidacionFaenaPesca" ADD COLUMN     "temporada_pesca_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "TipoEntidad" DROP COLUMN "cesado",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "esCliente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esProveedor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nombre" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "TiposDocIdentidad" ADD COLUMN     "codSunat" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TipoEntidadEstado" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoEntidadEstado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntidadComercial" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "tipoEntidadId" BIGINT NOT NULL,
    "formaPagoId" BIGINT NOT NULL,
    "vendedorId" BIGINT NOT NULL,
    "agenciaEnvioId" BIGINT NOT NULL,
    "agrupacionEntidadId" BIGINT,
    "numeroDocumento" VARCHAR(20) NOT NULL,
    "razonSocial" VARCHAR(255) NOT NULL,
    "nombreComercial" VARCHAR(255),
    "esCliente" BOOLEAN NOT NULL DEFAULT false,
    "esProveedor" BOOLEAN NOT NULL DEFAULT false,
    "esCorporativo" BOOLEAN NOT NULL DEFAULT false,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "codigoErpFinanciero" VARCHAR(50),
    "custodiaStock" BOOLEAN NOT NULL DEFAULT false,
    "controlLote" BOOLEAN NOT NULL DEFAULT false,
    "controlFechaVenc" BOOLEAN NOT NULL DEFAULT false,
    "controlFechaProd" BOOLEAN NOT NULL DEFAULT false,
    "controlFechaIngreso" BOOLEAN NOT NULL DEFAULT false,
    "controlSerie" BOOLEAN NOT NULL DEFAULT false,
    "controlEnvase" BOOLEAN NOT NULL DEFAULT false,
    "sujetoRetencion" BOOLEAN NOT NULL DEFAULT false,
    "sujetoPercepcion" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "EntidadComercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactoEntidad" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "nombres" TEXT NOT NULL,
    "cargoId" BIGINT,
    "telefono" TEXT,
    "correoCorportivo" TEXT,
    "correoPersonal" TEXT,
    "compras" BOOLEAN NOT NULL DEFAULT false,
    "ventas" BOOLEAN NOT NULL DEFAULT false,
    "finanzas" BOOLEAN NOT NULL DEFAULT false,
    "logistica" BOOLEAN NOT NULL DEFAULT false,
    "representanteLegal" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContactoEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaPago" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "esCliente" BOOLEAN NOT NULL DEFAULT false,
    "esProveedor" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FormaPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgrupacionEntidad" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "esCliente" BOOLEAN NOT NULL DEFAULT false,
    "esProveedor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AgrupacionEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DireccionEntidad" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "direccion" TEXT NOT NULL,
    "direccionArmada" TEXT,
    "ubigeoId" BIGINT NOT NULL,
    "fiscal" BOOLEAN NOT NULL DEFAULT false,
    "almacenPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "referencia" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DireccionEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ubigeo" (
    "id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ubigeo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioEntidad" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PrecioEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moneda" (
    "id" BIGSERIAL NOT NULL,
    "codigoSunat" TEXT NOT NULL,
    "nombreLargo" TEXT,
    "simbolo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Moneda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiculoEntidad" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "placa" VARCHAR(20) NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "color" TEXT,
    "anio" INTEGER,
    "tipoVehiculoId" BIGINT NOT NULL,
    "capacidadTon" DOUBLE PRECISION,
    "numeroSerie" TEXT,
    "numeroMotor" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activoId" BIGINT,
    "observaciones" TEXT,

    CONSTRAINT "VehiculoEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoVehiculo" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaCreditoEntidad" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "montoMaximo" DOUBLE PRECISION NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "diasCredito" INTEGER NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "condiciones" TEXT,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LineaCreditoEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ubigeo_codigo_key" ON "Ubigeo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Moneda_codigoSunat_key" ON "Moneda"("codigoSunat");

-- CreateIndex
CREATE UNIQUE INDEX "LineaCreditoEntidad_entidadComercialId_key" ON "LineaCreditoEntidad"("entidadComercialId");

-- AddForeignKey
ALTER TABLE "EstadoMultiFuncion" ADD CONSTRAINT "EstadoMultiFuncion_tipoEntidadEstadoId_fkey" FOREIGN KEY ("tipoEntidadEstadoId") REFERENCES "TipoEntidadEstado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadComercial" ADD CONSTRAINT "EntidadComercial_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TiposDocIdentidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadComercial" ADD CONSTRAINT "EntidadComercial_tipoEntidadId_fkey" FOREIGN KEY ("tipoEntidadId") REFERENCES "TipoEntidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadComercial" ADD CONSTRAINT "EntidadComercial_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadComercial" ADD CONSTRAINT "EntidadComercial_agrupacionEntidadId_fkey" FOREIGN KEY ("agrupacionEntidadId") REFERENCES "AgrupacionEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactoEntidad" ADD CONSTRAINT "ContactoEntidad_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DireccionEntidad" ADD CONSTRAINT "DireccionEntidad_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DireccionEntidad" ADD CONSTRAINT "DireccionEntidad_ubigeoId_fkey" FOREIGN KEY ("ubigeoId") REFERENCES "Ubigeo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioEntidad" ADD CONSTRAINT "PrecioEntidad_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioEntidad" ADD CONSTRAINT "PrecioEntidad_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiculoEntidad" ADD CONSTRAINT "VehiculoEntidad_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiculoEntidad" ADD CONSTRAINT "VehiculoEntidad_tipoVehiculoId_fkey" FOREIGN KEY ("tipoVehiculoId") REFERENCES "TipoVehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCreditoEntidad" ADD CONSTRAINT "LineaCreditoEntidad_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
