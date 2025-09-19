-- AlterTable
ALTER TABLE "public"."DetMovsEntregaRendir" ADD COLUMN     "fechaValidacionTesoreria" TIMESTAMP(3),
ADD COLUMN     "validadoTesoreria" BOOLEAN NOT NULL DEFAULT false;
