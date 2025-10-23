/*
  Warnings:

  - You are about to drop the column `codigo` on the `OrdenCompra` table. All the data in the column will be lost.
  - You are about to drop the column `fechaEmision` on the `OrdenCompra` table. All the data in the column will be lost.
  - You are about to drop the column `codigo` on the `RequerimientoCompra` table. All the data in the column will be lost.
  - Added the required column `tipoDocumentoId` to the `OrdenCompra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoDocumentoId` to the `RequerimientoCompra` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."OrdenCompra_codigo_idx";

-- DropIndex
DROP INDEX "public"."OrdenCompra_codigo_key";

-- DropIndex
DROP INDEX "public"."OrdenCompra_empresaId_fechaEmision_idx";

-- DropIndex
DROP INDEX "public"."RequerimientoCompra_codigo_idx";

-- DropIndex
DROP INDEX "public"."RequerimientoCompra_codigo_key";

-- AlterTable
ALTER TABLE "OrdenCompra" DROP COLUMN "codigo",
DROP COLUMN "fechaEmision",
ADD COLUMN     "fechaDocumento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "numCorreDoc" VARCHAR(40),
ADD COLUMN     "numSerieDoc" VARCHAR(40),
ADD COLUMN     "numeroDocumento" TEXT,
ADD COLUMN     "serieDocId" BIGINT,
ADD COLUMN     "tipoDocumentoId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "RequerimientoCompra" DROP COLUMN "codigo",
ADD COLUMN     "fechaDocumento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "numCorreDoc" VARCHAR(40),
ADD COLUMN     "numSerieDoc" VARCHAR(40),
ADD COLUMN     "numeroDocumento" TEXT,
ADD COLUMN     "serieDocId" BIGINT,
ADD COLUMN     "tipoDocumentoId" BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX "OrdenCompra_empresaId_fechaDocumento_idx" ON "OrdenCompra"("empresaId", "fechaDocumento");

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequerimientoCompra" ADD CONSTRAINT "RequerimientoCompra_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
