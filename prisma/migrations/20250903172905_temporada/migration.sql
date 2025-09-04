-- AlterTable
ALTER TABLE "public"."DocumentacionPersonal" ADD COLUMN     "docVencido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3),
ADD COLUMN     "numeroDocumento" TEXT,
ADD COLUMN     "urlDocPdf" TEXT;

-- AlterTable
ALTER TABLE "public"."DocumentoPesca" ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3);
