/*
  Warnings:

  - You are about to drop the column `bolicheRed` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `tipoEmbarcacion` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to alter the column `motorPotenciaHp` on the `Embarcacion` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `estado` on the `Empresa` table. All the data in the column will be lost.
  - You are about to drop the column `representante` on the `Empresa` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `FaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `fechaFin` on the `FaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `fechaInicio` on the `FaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `FaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `embarcacionId` on the `TemporadaPesca` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[activoId]` on the table `Embarcacion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `activoId` to the `Embarcacion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoId` to the `Embarcacion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoEmbarcacionId` to the `Embarcacion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cesado` to the `Empresa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaRetorno` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaSalida` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertoDescargaId` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertoRetornoId` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertoSalidaId` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TemporadaPesca" DROP CONSTRAINT "TemporadaPesca_embarcacionId_fkey";

-- AlterTable
ALTER TABLE "Embarcacion" DROP COLUMN "bolicheRed",
DROP COLUMN "empresaId",
DROP COLUMN "estado",
DROP COLUMN "nombre",
DROP COLUMN "observaciones",
DROP COLUMN "tipoEmbarcacion",
ADD COLUMN     "activoId" BIGINT NOT NULL,
ADD COLUMN     "estadoId" BIGINT NOT NULL,
ADD COLUMN     "tipoEmbarcacionId" BIGINT NOT NULL,
ALTER COLUMN "motorPotenciaHp" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Empresa" DROP COLUMN "estado",
DROP COLUMN "representante",
ADD COLUMN     "cesado" BOOLEAN NOT NULL,
ADD COLUMN     "representantelegalId" BIGINT;

-- AlterTable
ALTER TABLE "FaenaPesca" DROP COLUMN "activo",
DROP COLUMN "fechaFin",
DROP COLUMN "fechaInicio",
DROP COLUMN "nombre",
ADD COLUMN     "bolicheRedId" BIGINT,
ADD COLUMN     "embarcacionId" BIGINT,
ADD COLUMN     "fechaRetorno" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaSalida" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "puertoDescargaId" BIGINT NOT NULL,
ADD COLUMN     "puertoRetornoId" BIGINT NOT NULL,
ADD COLUMN     "puertoSalidaId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "TemporadaPesca" DROP COLUMN "embarcacionId";

-- CreateTable
CREATE TABLE "Activo" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoActivo" (
    "id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoEmbarcacion" (
    "id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoEmbarcacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoPesca" (
    "id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "obligatorio" BOOLEAN NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoPesca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentacionEmbarcacion" (
    "id" BIGSERIAL NOT NULL,
    "embarcacionId" BIGINT NOT NULL,
    "documentoPescaId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentacionEmbarcacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleDocEmbarcacion" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaId" BIGINT NOT NULL,
    "documentoPescaId" BIGINT NOT NULL,
    "numeroDocumento" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "archivoUrl" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleDocEmbarcacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BolicheRed" (
    "id" BIGSERIAL NOT NULL,
    "activoId" BIGINT NOT NULL,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BolicheRed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoActivo_codigo_key" ON "TipoActivo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TipoEmbarcacion_codigo_key" ON "TipoEmbarcacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoPesca_codigo_key" ON "DocumentoPesca"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "BolicheRed_activoId_key" ON "BolicheRed"("activoId");

-- CreateIndex
CREATE UNIQUE INDEX "Embarcacion_activoId_key" ON "Embarcacion"("activoId");

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoActivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embarcacion" ADD CONSTRAINT "Embarcacion_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embarcacion" ADD CONSTRAINT "Embarcacion_tipoEmbarcacionId_fkey" FOREIGN KEY ("tipoEmbarcacionId") REFERENCES "TipoEmbarcacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionEmbarcacion" ADD CONSTRAINT "DocumentacionEmbarcacion_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionEmbarcacion" ADD CONSTRAINT "DocumentacionEmbarcacion_documentoPescaId_fkey" FOREIGN KEY ("documentoPescaId") REFERENCES "DocumentoPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDocEmbarcacion" ADD CONSTRAINT "DetalleDocEmbarcacion_faenaPescaId_fkey" FOREIGN KEY ("faenaPescaId") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDocEmbarcacion" ADD CONSTRAINT "DetalleDocEmbarcacion_documentoPescaId_fkey" FOREIGN KEY ("documentoPescaId") REFERENCES "DocumentoPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BolicheRed" ADD CONSTRAINT "BolicheRed_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_bolicheRedId_fkey" FOREIGN KEY ("bolicheRedId") REFERENCES "BolicheRed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
