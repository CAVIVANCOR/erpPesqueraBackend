/*
  Warnings:

  - You are about to drop the `LiqNovedadPescaConsumo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LiquidacionTemporadaPesca` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovLiqNovedadPescaConsumo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovLiquidacionTemporadaPesca` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."LiqNovedadPescaConsumo" DROP CONSTRAINT "LiqNovedadPescaConsumo_novedadPescaConsumoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LiquidacionTemporadaPesca" DROP CONSTRAINT "LiquidacionTemporadaPesca_temporadaPescaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MovLiqNovedadPescaConsumo" DROP CONSTRAINT "MovLiqNovedadPescaConsumo_liqNovedadPescaConsumoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MovLiquidacionTemporadaPesca" DROP CONSTRAINT "MovLiquidacionTemporadaPesca_liquidacionTemporadaId_fkey";

-- DropTable
DROP TABLE "public"."LiqNovedadPescaConsumo";

-- DropTable
DROP TABLE "public"."LiquidacionTemporadaPesca";

-- DropTable
DROP TABLE "public"."MovLiqNovedadPescaConsumo";

-- DropTable
DROP TABLE "public"."MovLiquidacionTemporadaPesca";
