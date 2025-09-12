/*
  Warnings:

  - You are about to drop the `DetDescargaFaenaConsumo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetalleDescargaFaena` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DetDescargaFaenaConsumo" DROP CONSTRAINT "DetDescargaFaenaConsumo_descargaFaenaConsumoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleDescargaFaena" DROP CONSTRAINT "DetalleDescargaFaena_descargaFaenaId_fkey";

-- AlterTable
ALTER TABLE "public"."DescargaFaenaConsumo" ADD COLUMN     "especieId" BIGINT,
ADD COLUMN     "porcentajeJuveniles" DECIMAL(65,30),
ADD COLUMN     "toneladas" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."DescargaFaenaPesca" ADD COLUMN     "especieId" BIGINT,
ADD COLUMN     "porcentajeJuveniles" DECIMAL(65,30),
ADD COLUMN     "toneladas" DECIMAL(65,30);

-- DropTable
DROP TABLE "public"."DetDescargaFaenaConsumo";

-- DropTable
DROP TABLE "public"."DetalleDescargaFaena";
