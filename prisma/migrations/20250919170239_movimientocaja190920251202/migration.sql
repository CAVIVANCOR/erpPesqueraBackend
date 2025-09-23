/*
  Warnings:

  - You are about to drop the column `fecha` on the `MovimientoCaja` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."DetMovsEntregaRendir" ADD COLUMN     "fechaOperacionMovCaja" TIMESTAMP(3),
ADD COLUMN     "moduloOrigenMovCajaId" BIGINT,
ADD COLUMN     "operacionMovCajaId" BIGINT,
ADD COLUMN     "operacionSinFactura" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."MovimientoCaja" DROP COLUMN "fecha",
ADD COLUMN     "centroCostoId" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaMotivoOperacion" TIMESTAMP(3),
ADD COLUMN     "fechaOperacionMovCaja" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "moduloOrigenMotivoOperacionId" BIGINT,
ADD COLUMN     "operacionSinFactura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "origenMotivoOperacionId" BIGINT,
ADD COLUMN     "usuarioMotivoOperacionId" BIGINT;
