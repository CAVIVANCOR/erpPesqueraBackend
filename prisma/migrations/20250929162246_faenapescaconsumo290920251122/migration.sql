/*
  Warnings:

  - You are about to drop the column `fechaRetorno` on the `FaenaPescaConsumo` table. All the data in the column will be lost.
  - You are about to drop the column `puertoRetornoId` on the `FaenaPescaConsumo` table. All the data in the column will be lost.
  - Added the required column `fechaDescarga` to the `FaenaPescaConsumo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."FaenaPescaConsumo" DROP COLUMN "fechaRetorno",
DROP COLUMN "puertoRetornoId",
ADD COLUMN     "estadoFaenaId" BIGINT,
ADD COLUMN     "fechaDescarga" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaHoraFondeo" TIMESTAMP(3),
ADD COLUMN     "puertoFondeoId" BIGINT,
ADD COLUMN     "toneladasCapturadasFaena" DECIMAL(65,30);
