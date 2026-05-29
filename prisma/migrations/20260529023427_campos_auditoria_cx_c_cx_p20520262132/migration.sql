/*
  Warnings:

  - You are about to drop the column `actualizadoEn` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `CuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `actualizadoEn` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `CuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `actualizadoEn` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `registradoPor` on the `PagoCuentaPorCobrar` table. All the data in the column will be lost.
  - You are about to drop the column `actualizadoEn` on the `PagoCuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `PagoCuentaPorPagar` table. All the data in the column will be lost.
  - You are about to drop the column `registradoPor` on the `PagoCuentaPorPagar` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PagoCuentaPorCobrar" DROP CONSTRAINT "PagoCuentaPorCobrar_registradoPor_fkey";

-- DropForeignKey
ALTER TABLE "PagoCuentaPorPagar" DROP CONSTRAINT "PagoCuentaPorPagar_registradoPor_fkey";

-- AlterTable
ALTER TABLE "CuentaPorCobrar" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CuentaPorPagar" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PagoCuentaPorCobrar" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
DROP COLUMN "registradoPor",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PagoCuentaPorPagar" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
DROP COLUMN "registradoPor",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
