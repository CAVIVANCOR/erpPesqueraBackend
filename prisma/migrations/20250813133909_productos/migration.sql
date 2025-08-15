/*
  Warnings:

  - You are about to drop the column `descripcion` on the `UnidadMedida` table. All the data in the column will be lost.
  - You are about to drop the column `factor_conversion` on the `UnidadMedida` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UnidadMedida" DROP COLUMN "descripcion",
DROP COLUMN "factor_conversion",
ADD COLUMN     "factorConversion" DECIMAL(65,30);
