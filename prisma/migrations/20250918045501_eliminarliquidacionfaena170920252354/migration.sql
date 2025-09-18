/*
  Warnings:

  - You are about to drop the `LiquidacionFaenaConsumo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LiquidacionFaenaPesca` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovLiquidacionFaenaConsumo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovLiquidacionFaenaPesca` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."LiquidacionFaenaConsumo" DROP CONSTRAINT "LiquidacionFaenaConsumo_faena_pesca_consumo_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."LiquidacionFaenaPesca" DROP CONSTRAINT "LiquidacionFaenaPesca_faena_pesca_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."MovLiquidacionFaenaConsumo" DROP CONSTRAINT "MovLiquidacionFaenaConsumo_liquidacionFaenaConsumoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MovLiquidacionFaenaPesca" DROP CONSTRAINT "MovLiquidacionFaenaPesca_liquidacionFaenaId_fkey";

-- DropTable
DROP TABLE "public"."LiquidacionFaenaConsumo";

-- DropTable
DROP TABLE "public"."LiquidacionFaenaPesca";

-- DropTable
DROP TABLE "public"."MovLiquidacionFaenaConsumo";

-- DropTable
DROP TABLE "public"."MovLiquidacionFaenaPesca";
