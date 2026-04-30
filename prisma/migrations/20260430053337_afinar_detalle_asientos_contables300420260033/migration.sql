/*
  Warnings:

  - You are about to drop the column `documentoOrigenId` on the `DetalleAsientoContable` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DetalleAsientoContable" DROP CONSTRAINT "DetalleAsientoContable_documentoOrigenId_fkey";

-- DropIndex
DROP INDEX "DetalleAsientoContable_documentoOrigenId_idx";

-- AlterTable
ALTER TABLE "DetalleAsientoContable" DROP COLUMN "documentoOrigenId",
ADD COLUMN     "fechaVenceDocumentoOrigen" TIMESTAMP(3),
ADD COLUMN     "procesoOrigenLineaId" BIGINT,
ADD COLUMN     "submoduloOrigenLineaId" BIGINT;

-- AlterTable
ALTER TABLE "SubmoduloSistema" ADD COLUMN     "nombreModeloOrigen" VARCHAR(50);

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_submoduloOrigenLineaId_procesoOrigen_idx" ON "DetalleAsientoContable"("submoduloOrigenLineaId", "procesoOrigenLineaId");

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_fechaVenceDocumentoOrigen_idx" ON "DetalleAsientoContable"("fechaVenceDocumentoOrigen");

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_submoduloOrigenLineaId_fkey" FOREIGN KEY ("submoduloOrigenLineaId") REFERENCES "SubmoduloSistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
