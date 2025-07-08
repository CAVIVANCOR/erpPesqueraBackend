/*
  Warnings:

  - You are about to drop the column `almacenId` on the `DescargaFaenaConsumo` table. All the data in the column will be lost.
  - You are about to drop the column `cantidadTotal` on the `DescargaFaenaConsumo` table. All the data in the column will be lost.
  - You are about to drop the column `almacenId` on the `DescargaFaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `cantidadTotal` on the `DescargaFaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `tipoEntidadEstadoId` on the `EstadoMultiFuncion` table. All the data in the column will be lost.
  - You are about to drop the column `FaenaPescaId` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the `TipoEntidadEstado` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `movIngresoAlmacenId` to the `DescargaFaenaConsumo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `movIngresoAlmacenId` to the `DescargaFaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `movSalidaAlmacenId` to the `DescargaFaenaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EstadoMultiFuncion" DROP CONSTRAINT "EstadoMultiFuncion_tipoEntidadEstadoId_fkey";

-- AlterTable
ALTER TABLE "DescargaFaenaConsumo" DROP COLUMN "almacenId",
DROP COLUMN "cantidadTotal",
ADD COLUMN     "movIngresoAlmacenId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" DROP COLUMN "almacenId",
DROP COLUMN "cantidadTotal",
ADD COLUMN     "movIngresoAlmacenId" BIGINT NOT NULL,
ADD COLUMN     "movSalidaAlmacenId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "EstadoMultiFuncion" DROP COLUMN "tipoEntidadEstadoId",
ADD COLUMN     "tipoProvieneDeId" BIGINT;

-- AlterTable
ALTER TABLE "OTMantenimiento" DROP COLUMN "FaenaPescaId",
ADD COLUMN     "docOrigenProvieneId" BIGINT,
ADD COLUMN     "tipoProvieneDeId" BIGINT;

-- DropTable
DROP TABLE "TipoEntidadEstado";

-- CreateTable
CREATE TABLE "TipoProvieneDe" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoProvieneDe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_movIngresoAlmacenId_idx" ON "DescargaFaenaConsumo"("movIngresoAlmacenId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_movIngresoAlmacenId_idx" ON "DescargaFaenaPesca"("movIngresoAlmacenId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_movSalidaAlmacenId_idx" ON "DescargaFaenaPesca"("movSalidaAlmacenId");

-- AddForeignKey
ALTER TABLE "EstadoMultiFuncion" ADD CONSTRAINT "EstadoMultiFuncion_tipoProvieneDeId_fkey" FOREIGN KEY ("tipoProvieneDeId") REFERENCES "TipoProvieneDe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
