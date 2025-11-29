/*
  Warnings:

  - You are about to drop the column `codigo` on the `OTMantenimiento` table. All the data in the column will be lost.
  - You are about to drop the column `numeroDocumento` on the `OTMantenimiento` table. All the data in the column will be lost.
  - Added the required column `numeroCompleto` to the `OTMantenimiento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numeroCorrelativo` to the `OTMantenimiento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numeroSerie` to the `OTMantenimiento` table without a default value. This is not possible if the table is not empty.
  - Made the column `serieDocId` on table `OTMantenimiento` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "OTMantenimiento" DROP CONSTRAINT "OTMantenimiento_serieDocId_fkey";

-- DropIndex
DROP INDEX "OTMantenimiento_codigo_key";

-- AlterTable
ALTER TABLE "OTMantenimiento" DROP COLUMN "codigo",
DROP COLUMN "numeroDocumento",
ADD COLUMN     "numeroCompleto" VARCHAR(20) NOT NULL,
ADD COLUMN     "numeroCorrelativo" INTEGER NOT NULL,
ADD COLUMN     "numeroSerie" VARCHAR(10) NOT NULL,
ALTER COLUMN "serieDocId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
