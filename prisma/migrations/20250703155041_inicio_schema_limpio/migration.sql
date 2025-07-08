/*
  Warnings:

  - Added the required column `centroCostoId` to the `DetMovsEntregaRendir` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "centroCostoId" BIGINT NOT NULL;

-- CreateTable
CREATE TABLE "CentroCosto" (
    "CentroID" BIGSERIAL NOT NULL,
    "Codigo" VARCHAR(20) NOT NULL,
    "Nombre" VARCHAR(255) NOT NULL,
    "Descripcion" TEXT,
    "CategoriaID" BIGINT NOT NULL,
    "ParentCentroID" VARCHAR(20),

    CONSTRAINT "CentroCosto_pkey" PRIMARY KEY ("CentroID")
);

-- CreateTable
CREATE TABLE "CategoriaCCosto" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategoriaCCosto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaCentroCosto" (
    "ID" BIGSERIAL NOT NULL,
    "EmpresaID" BIGINT NOT NULL,
    "CentroCostoID" BIGINT NOT NULL,
    "ResponsableID" BIGINT NOT NULL,
    "ProveedorExternoID" BIGINT,
    "Activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmpresaCentroCosto_pkey" PRIMARY KEY ("ID")
);

-- AddForeignKey
ALTER TABLE "CentroCosto" ADD CONSTRAINT "CentroCosto_CategoriaID_fkey" FOREIGN KEY ("CategoriaID") REFERENCES "CategoriaCCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaCentroCosto" ADD CONSTRAINT "EmpresaCentroCosto_EmpresaID_fkey" FOREIGN KEY ("EmpresaID") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaCentroCosto" ADD CONSTRAINT "EmpresaCentroCosto_CentroCostoID_fkey" FOREIGN KEY ("CentroCostoID") REFERENCES "CentroCosto"("CentroID") ON DELETE RESTRICT ON UPDATE CASCADE;
