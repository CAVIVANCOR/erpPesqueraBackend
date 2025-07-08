-- AlterTable
ALTER TABLE "CotizacionCompras" ADD COLUMN     "conceptoMovIngresoProdTerminadoId" BIGINT,
ADD COLUMN     "fechaUsuarioGeneroMovIngresoProdTerminado" TIMESTAMP(3),
ADD COLUMN     "movIngresoProdTerminadoId" BIGINT,
ADD COLUMN     "usuarioGeneroMovIngresoProdTerminadoId" BIGINT;
