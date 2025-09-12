/*
  Warnings:

  - You are about to drop the column `fechaDescarga` on the `DescargaFaenaConsumo` table. All the data in the column will be lost.
  - You are about to drop the column `patroId` on the `DescargaFaenaConsumo` table. All the data in the column will be lost.
  - Added the required column `patronId` to the `DescargaFaenaConsumo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DescargaFaenaConsumo" DROP COLUMN "fechaDescarga",
DROP COLUMN "patroId",
ADD COLUMN     "patronId" BIGINT NOT NULL,
ALTER COLUMN "puertoDescargaId" DROP NOT NULL,
ALTER COLUMN "fechaHoraArriboPuerto" DROP NOT NULL,
ALTER COLUMN "fechaHoraLlegadaPuerto" DROP NOT NULL,
ALTER COLUMN "clienteId" DROP NOT NULL,
ALTER COLUMN "fechaHoraInicioDescarga" DROP NOT NULL,
ALTER COLUMN "fechaHoraFinDescarga" DROP NOT NULL,
ALTER COLUMN "combustibleAbastecidoGalones" DROP NOT NULL,
ALTER COLUMN "movIngresoAlmacenId" DROP NOT NULL;
