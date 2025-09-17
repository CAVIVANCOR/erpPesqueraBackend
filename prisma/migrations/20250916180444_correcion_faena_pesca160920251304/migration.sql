/*
  Warnings:

  - You are about to drop the column `fechaRetorno` on the `FaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `puertoRetornoId` on the `FaenaPesca` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."DescargaFaenaConsumo" ADD COLUMN     "fechaHoraFondeo" TIMESTAMP(3),
ADD COLUMN     "latitudFondeo" DECIMAL(65,30),
ADD COLUMN     "longitudFondeo" DECIMAL(65,30),
ADD COLUMN     "puertoFondeoId" BIGINT;

-- AlterTable
ALTER TABLE "public"."DescargaFaenaPesca" ADD COLUMN     "fechaHoraFondeo" TIMESTAMP(3),
ADD COLUMN     "latitudFondeo" DECIMAL(65,30),
ADD COLUMN     "longitudFondeo" DECIMAL(65,30),
ADD COLUMN     "puertoFondeoId" BIGINT;

-- AlterTable
ALTER TABLE "public"."FaenaPesca" DROP COLUMN "fechaRetorno",
DROP COLUMN "puertoRetornoId",
ADD COLUMN     "fechaHoraFondeo" TIMESTAMP(3),
ADD COLUMN     "puertoFondeoId" BIGINT;
