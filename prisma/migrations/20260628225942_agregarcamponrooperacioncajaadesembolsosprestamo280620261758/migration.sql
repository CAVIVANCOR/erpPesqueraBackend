/*
  Warnings:

  - You are about to drop the column `creadoEn` on the `DesembolsoPrestamo` table. All the data in the column will be lost.
  - You are about to drop the column `numeroDesembolso` on the `DesembolsoPrestamo` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `DesembolsoPrestamo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DesembolsoPrestamo" DROP COLUMN "creadoEn",
DROP COLUMN "numeroDesembolso",
DROP COLUMN "observaciones",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;
