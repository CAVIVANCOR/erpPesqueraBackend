-- AlterTable
ALTER TABLE "public"."AccesoInstalacion" ADD COLUMN     "accesoSellado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaHoraSalidaDefinitiva" TIMESTAMP(3);
