/*
  Warnings:

  - You are about to drop the column `estado` on the `DetalleDocEmbarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `codigo` on the `DocumentoPesca` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `DocumentoPesca` table. All the data in the column will be lost.
  - You are about to drop the column `estadoId` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `TipoActivo` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `TipoEmbarcacion` table. All the data in the column will be lost.
  - Added the required column `estadoActivoId` to the `Embarcacion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DocumentoPesca_codigo_key";

-- AlterTable
ALTER TABLE "DetalleDocEmbarcacion" DROP COLUMN "estado";

-- AlterTable
ALTER TABLE "DocumentoPesca" DROP COLUMN "codigo",
DROP COLUMN "estado",
ADD COLUMN     "cesado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Embarcacion" DROP COLUMN "estadoId",
ADD COLUMN     "estadoActivoId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Empresa" ALTER COLUMN "cesado" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Personal" ALTER COLUMN "cesado" SET DEFAULT false;

-- AlterTable
ALTER TABLE "TipoActivo" DROP COLUMN "estado",
ADD COLUMN     "cesado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TipoEmbarcacion" DROP COLUMN "estado",
ADD COLUMN     "cesado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SedesEmpresa" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SedesEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoMultiFuncion" (
    "id" BIGSERIAL NOT NULL,
    "tipoEntidadId" BIGINT,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoMultiFuncion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoEntidad" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripulanteFaena" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaId" BIGINT NOT NULL,
    "personalId" BIGINT,
    "cargoId" BIGINT,
    "nombres" TEXT,
    "apellidos" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripulanteFaena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiposDocIdentidad" (
    "id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TiposDocIdentidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargosPersonal" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargosPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentacionPersonal" (
    "id" BIGSERIAL NOT NULL,
    "personalId" BIGINT NOT NULL,
    "documentoPescaId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentacionPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TiposDocIdentidad_codigo_key" ON "TiposDocIdentidad"("codigo");

-- AddForeignKey
ALTER TABLE "SedesEmpresa" ADD CONSTRAINT "SedesEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoMultiFuncion" ADD CONSTRAINT "EstadoMultiFuncion_tipoEntidadId_fkey" FOREIGN KEY ("tipoEntidadId") REFERENCES "TipoEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripulanteFaena" ADD CONSTRAINT "TripulanteFaena_faenaPescaId_fkey" FOREIGN KEY ("faenaPescaId") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "CargosPersonal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TiposDocIdentidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionPersonal" ADD CONSTRAINT "DocumentacionPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionPersonal" ADD CONSTRAINT "DocumentacionPersonal_documentoPescaId_fkey" FOREIGN KEY ("documentoPescaId") REFERENCES "DocumentoPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
