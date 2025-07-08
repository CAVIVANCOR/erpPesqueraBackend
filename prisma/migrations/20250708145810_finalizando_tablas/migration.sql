/*
  Warnings:

  - You are about to drop the column `departamento` on the `Ubigeo` table. All the data in the column will be lost.
  - You are about to drop the column `distrito` on the `Ubigeo` table. All the data in the column will be lost.
  - You are about to drop the column `provincia` on the `Ubigeo` table. All the data in the column will be lost.
  - Added the required column `dirEntregaId` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dirFiscalId` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departamentoId` to the `Ubigeo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `distritoId` to the `Ubigeo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paisId` to the `Ubigeo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinciaId` to the `Ubigeo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "dirEntregaId" BIGINT NOT NULL,
ADD COLUMN     "dirFiscalId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Ubigeo" DROP COLUMN "departamento",
DROP COLUMN "distrito",
DROP COLUMN "provincia",
ADD COLUMN     "departamentoId" BIGINT NOT NULL,
ADD COLUMN     "distritoId" BIGINT NOT NULL,
ADD COLUMN     "paisId" BIGINT NOT NULL,
ADD COLUMN     "provinciaId" BIGINT NOT NULL;

-- CreateTable
CREATE TABLE "Pais" (
    "id" BIGSERIAL NOT NULL,
    "codSUNAT" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "gentilicio" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Pais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" BIGSERIAL NOT NULL,
    "codSUNAT" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "paisId" BIGINT NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provincia" (
    "id" BIGSERIAL NOT NULL,
    "codSUNAT" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "departamentoId" BIGINT NOT NULL,

    CONSTRAINT "Provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distrito" (
    "id" BIGSERIAL NOT NULL,
    "codSUNAT" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "provinciaId" BIGINT NOT NULL,

    CONSTRAINT "Distrito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pais_codSUNAT_key" ON "Pais"("codSUNAT");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_codSUNAT_key" ON "Departamento"("codSUNAT");

-- CreateIndex
CREATE UNIQUE INDEX "Provincia_codSUNAT_key" ON "Provincia"("codSUNAT");

-- CreateIndex
CREATE UNIQUE INDEX "Distrito_codSUNAT_key" ON "Distrito"("codSUNAT");

-- AddForeignKey
ALTER TABLE "Ubigeo" ADD CONSTRAINT "Ubigeo_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ubigeo" ADD CONSTRAINT "Ubigeo_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ubigeo" ADD CONSTRAINT "Ubigeo_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "Provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ubigeo" ADD CONSTRAINT "Ubigeo_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provincia" ADD CONSTRAINT "Provincia_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distrito" ADD CONSTRAINT "Distrito_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "Provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
