/*
  Warnings:

  - You are about to drop the column `especieId` on the `TemporadaPesca` table. All the data in the column will be lost.
  - Added the required column `estadoTemporadaId` to the `TemporadaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."TemporadaPesca" DROP COLUMN "especieId",
ADD COLUMN     "estadoTemporadaId" BIGINT NOT NULL;
