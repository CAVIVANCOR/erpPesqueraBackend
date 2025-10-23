/*
  Warnings:

  - You are about to drop the column `fechaCreacion` on the `RequerimientoCompra` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."RequerimientoCompra_empresaId_fechaCreacion_idx";

-- AlterTable
ALTER TABLE "RequerimientoCompra" DROP COLUMN "fechaCreacion";

-- CreateIndex
CREATE INDEX "RequerimientoCompra_empresaId_fechaDocumento_idx" ON "RequerimientoCompra"("empresaId", "fechaDocumento");
