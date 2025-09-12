-- AlterTable
ALTER TABLE "public"."DescargaFaenaPesca" ALTER COLUMN "puertoDescargaId" DROP NOT NULL,
ALTER COLUMN "fechaHoraArriboPuerto" DROP NOT NULL,
ALTER COLUMN "fechaHoraLlegadaPuerto" DROP NOT NULL,
ALTER COLUMN "fechaHoraInicioDescarga" DROP NOT NULL,
ALTER COLUMN "fechaHoraFinDescarga" DROP NOT NULL,
ALTER COLUMN "combustibleAbastecidoGalones" DROP NOT NULL,
ALTER COLUMN "clienteId" DROP NOT NULL,
ALTER COLUMN "movIngresoAlmacenId" DROP NOT NULL;
