/*
  Warnings:

  - You are about to drop the column `numeroLinea` on the `LineaCredito` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LineaCredito_empresaId_numeroLinea_key";

-- AlterTable
ALTER TABLE "FormaPago" ADD COLUMN     "descripcionIngles" TEXT;

-- AlterTable
ALTER TABLE "LineaCredito" DROP COLUMN "numeroLinea";

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "descripcionEspanolExportacion" TEXT,
ADD COLUMN     "descripcionInglesExportacion" TEXT;
