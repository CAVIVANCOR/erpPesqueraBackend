/*
  Warnings:

  - You are about to drop the column `categoriaPlanillaId` on the `ConceptoPlanillaCuenta` table. All the data in the column will be lost.
  - You are about to drop the column `codigoAfpnet` on the `EntidadPension` table. All the data in the column will be lost.
  - You are about to drop the column `categoriaPlanillaId` on the `Personal` table. All the data in the column will be lost.
  - You are about to drop the `CategoriaPlanilla` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[conceptoPlanillaId,esObrero,esPescador]` on the table `ConceptoPlanillaCuenta` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ConceptoPlanillaCuenta" DROP CONSTRAINT "ConceptoPlanillaCuenta_categoriaPlanillaId_fkey";

-- DropForeignKey
ALTER TABLE "Personal" DROP CONSTRAINT "Personal_categoriaPlanillaId_fkey";

-- DropIndex
DROP INDEX "ConceptoPlanillaCuenta_conceptoPlanillaId_categoriaPlanilla_key";

-- AlterTable
ALTER TABLE "ConceptoPlanillaCuenta" DROP COLUMN "categoriaPlanillaId",
ADD COLUMN     "esObrero" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esPescador" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EntidadPension" DROP COLUMN "codigoAfpnet";

-- AlterTable
ALTER TABLE "Personal" DROP COLUMN "categoriaPlanillaId",
ADD COLUMN     "apellidoMaterno" VARCHAR(100),
ADD COLUMN     "apellidoPaterno" VARCHAR(100);

-- DropTable
DROP TABLE "CategoriaPlanilla";

-- CreateIndex
CREATE UNIQUE INDEX "ConceptoPlanillaCuenta_conceptoPlanillaId_esObrero_esPescad_key" ON "ConceptoPlanillaCuenta"("conceptoPlanillaId", "esObrero", "esPescador");
