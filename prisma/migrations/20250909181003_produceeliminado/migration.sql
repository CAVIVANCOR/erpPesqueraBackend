/*
  Warnings:

  - You are about to drop the `CalaFaenaConsumoProduce` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CalaProduce` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetCalaFaenaConsumoProduce` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetalleCalaEspecieProduce` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CalaFaenaConsumoProduce" DROP CONSTRAINT "CalaFaenaConsumoProduce_faenaPescaConsumoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CalaProduce" DROP CONSTRAINT "CalaProduce_faenaPescaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetCalaFaenaConsumoProduce" DROP CONSTRAINT "DetCalaFaenaConsumoProduce_calaFaenaConsumoProduceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetalleCalaEspecieProduce" DROP CONSTRAINT "DetalleCalaEspecieProduce_calaProduceId_fkey";

-- DropTable
DROP TABLE "public"."CalaFaenaConsumoProduce";

-- DropTable
DROP TABLE "public"."CalaProduce";

-- DropTable
DROP TABLE "public"."DetCalaFaenaConsumoProduce";

-- DropTable
DROP TABLE "public"."DetalleCalaEspecieProduce";
