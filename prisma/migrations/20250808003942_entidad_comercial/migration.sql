/*
  Warnings:

  - Added the required column `empresaId` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Made the column `clienteId` on table `Producto` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Producto" ADD COLUMN     "empresaId" BIGINT NOT NULL,
ALTER COLUMN "clienteId" SET NOT NULL;
