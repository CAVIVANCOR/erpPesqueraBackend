/*
  Warnings:

  - Added the required column `clienteId` to the `DescargaFaenaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ADD COLUMN     "clienteId" BIGINT NOT NULL;
