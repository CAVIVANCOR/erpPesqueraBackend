/*
  Warnings:

  - You are about to drop the column `patroId` on the `DescargaFaenaPesca` table. All the data in the column will be lost.
  - Added the required column `patronId` to the `DescargaFaenaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DescargaFaenaPesca" DROP COLUMN "patroId",
ADD COLUMN     "patronId" BIGINT NOT NULL;
