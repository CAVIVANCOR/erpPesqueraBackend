/*
  Warnings:

  - You are about to drop the column `fechaEmision` on the `DocumentoPesca` table. All the data in the column will be lost.
  - You are about to drop the column `fechaVencimiento` on the `DocumentoPesca` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."DetalleDocTripulantes" ADD COLUMN     "docVencido" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."DocumentacionEmbarcacion" ADD COLUMN     "docVencido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3),
ADD COLUMN     "numeroDocumento" TEXT,
ADD COLUMN     "urlDocPdf" TEXT;

-- AlterTable
ALTER TABLE "public"."DocumentoPesca" DROP COLUMN "fechaEmision",
DROP COLUMN "fechaVencimiento";
