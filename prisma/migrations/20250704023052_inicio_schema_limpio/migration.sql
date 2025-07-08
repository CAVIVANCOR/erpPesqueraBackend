/*
  Warnings:

  - The primary key for the `CentroCosto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `CentroID` on the `CentroCosto` table. All the data in the column will be lost.
  - The primary key for the `EmpresaCentroCosto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ID` on the `EmpresaCentroCosto` table. All the data in the column will be lost.
  - The primary key for the `LiquidacionFaenaPesca` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_liquidacion_faena` on the `LiquidacionFaenaPesca` table. All the data in the column will be lost.
  - The primary key for the `MovLiquidacionFaenaPesca` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_liquidacion_faena` on the `MovLiquidacionFaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `id_mov_liquidacion` on the `MovLiquidacionFaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `refDetMovsEntregaRendir_id` on the `MovLiquidacionFaenaPesca` table. All the data in the column will be lost.
  - Added the required column `liquidacionFaenaId` to the `MovLiquidacionFaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refDetMovsEntregaRendirId` to the `MovLiquidacionFaenaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmpresaCentroCosto" DROP CONSTRAINT "EmpresaCentroCosto_CentroCostoID_fkey";

-- DropForeignKey
ALTER TABLE "MovLiquidacionFaenaPesca" DROP CONSTRAINT "MovLiquidacionFaenaPesca_id_liquidacion_faena_fkey";

-- AlterTable
ALTER TABLE "CentroCosto" DROP CONSTRAINT "CentroCosto_pkey",
DROP COLUMN "CentroID",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "CentroCosto_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "EmpresaCentroCosto" DROP CONSTRAINT "EmpresaCentroCosto_pkey",
DROP COLUMN "ID",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "EmpresaCentroCosto_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "LiquidacionFaenaPesca" DROP CONSTRAINT "LiquidacionFaenaPesca_pkey",
DROP COLUMN "id_liquidacion_faena",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "LiquidacionFaenaPesca_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MovLiquidacionFaenaPesca" DROP CONSTRAINT "MovLiquidacionFaenaPesca_pkey",
DROP COLUMN "id_liquidacion_faena",
DROP COLUMN "id_mov_liquidacion",
DROP COLUMN "refDetMovsEntregaRendir_id",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD COLUMN     "liquidacionFaenaId" BIGINT NOT NULL,
ADD COLUMN     "refDetMovsEntregaRendirId" BIGINT NOT NULL,
ADD CONSTRAINT "MovLiquidacionFaenaPesca_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "PuertoPesca" (
    "id" BIGSERIAL NOT NULL,
    "zona" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "provincia" TEXT,
    "departamento" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuertoPesca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametroAprobador" (
    "id" BIGSERIAL NOT NULL,
    "personalRespId" BIGINT NOT NULL,
    "moduloSistemaId" BIGINT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "embarcacionId" BIGINT,
    "sedeId" BIGINT,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "cesado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ParametroAprobador_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmpresaCentroCosto" ADD CONSTRAINT "EmpresaCentroCosto_CentroCostoID_fkey" FOREIGN KEY ("CentroCostoID") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiquidacionFaenaPesca" ADD CONSTRAINT "MovLiquidacionFaenaPesca_liquidacionFaenaId_fkey" FOREIGN KEY ("liquidacionFaenaId") REFERENCES "LiquidacionFaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
