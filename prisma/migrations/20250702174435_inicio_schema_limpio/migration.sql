/*
  Warnings:

  - You are about to drop the column `activo` on the `TemporadaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TemporadaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `TemporadaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TemporadaPesca` table. All the data in the column will be lost.
  - Added the required column `empresaId` to the `TemporadaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `especieId` to the `TemporadaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado` to the `TemporadaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaActualizacion` to the `TemporadaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TemporadaPesca" DROP COLUMN "activo",
DROP COLUMN "createdAt",
DROP COLUMN "descripcion",
DROP COLUMN "updatedAt",
ADD COLUMN     "autorizacionZarpePdf" TEXT,
ADD COLUMN     "cuotaAlquiladaTon" DOUBLE PRECISION,
ADD COLUMN     "cuotaPropiaTon" DOUBLE PRECISION,
ADD COLUMN     "embarcacionId" BIGINT,
ADD COLUMN     "empresaId" BIGINT NOT NULL,
ADD COLUMN     "especieId" BIGINT NOT NULL,
ADD COLUMN     "estado" TEXT NOT NULL,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "resolucion" TEXT,
ADD COLUMN     "resolucionPdfUrl" TEXT;

-- CreateTable
CREATE TABLE "Empresa" (
    "id" BIGSERIAL NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "ruc" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "representante" TEXT,
    "estado" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,
    "logo" TEXT,
    "porcentajeIgv" DOUBLE PRECISION,
    "rutaArchivosAdjuntos" TEXT,
    "rutaReportesGenerados" TEXT,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Especie" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Especie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embarcacion" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "tipoEmbarcacion" TEXT NOT NULL,
    "capacidadBodegaTon" DOUBLE PRECISION,
    "esloraM" DOUBLE PRECISION,
    "mangaM" DOUBLE PRECISION,
    "puntalM" DOUBLE PRECISION,
    "motorMarca" TEXT,
    "motorPotenciaHp" DOUBLE PRECISION,
    "anioFabricacion" INTEGER,
    "bolicheRed" TEXT,
    "proveedorGpsId" BIGINT,
    "tabletMarca" TEXT,
    "tabletModelo" TEXT,
    "estado" TEXT NOT NULL,
    "observaciones" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Embarcacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Embarcacion_matricula_key" ON "Embarcacion"("matricula");

-- AddForeignKey
ALTER TABLE "Embarcacion" ADD CONSTRAINT "Embarcacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "Especie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
