/*
  Warnings:

  - You are about to alter the column `nombre` on the `TipoMovEntregaRendir` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE "TipoMovEntregaRendir" ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(50);

-- CreateTable
CREATE TABLE "LiquidacionFaenaPesca" (
    "id_liquidacion_faena" BIGSERIAL NOT NULL,
    "faena_pesca_id" BIGINT NOT NULL,
    "fecha_liquidacion" TIMESTAMP(3) NOT NULL,
    "responsable_id" BIGINT NOT NULL,
    "verificadorId" BIGINT,
    "fechaVerificacion" TIMESTAMP(3),
    "urlPdfLiquidacion" TEXT,
    "saldo_inicial" DOUBLE PRECISION NOT NULL,
    "saldo_final" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidacionFaenaPesca_pkey" PRIMARY KEY ("id_liquidacion_faena")
);

-- CreateTable
CREATE TABLE "MovLiquidacionFaenaPesca" (
    "id_mov_liquidacion" BIGSERIAL NOT NULL,
    "id_liquidacion_faena" BIGINT NOT NULL,
    "refDetMovsEntregaRendir_id" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "centro_costo_id" BIGINT,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovLiquidacionFaenaPesca_pkey" PRIMARY KEY ("id_mov_liquidacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionFaenaPesca_faena_pesca_id_key" ON "LiquidacionFaenaPesca"("faena_pesca_id");

-- AddForeignKey
ALTER TABLE "LiquidacionFaenaPesca" ADD CONSTRAINT "LiquidacionFaenaPesca_faena_pesca_id_fkey" FOREIGN KEY ("faena_pesca_id") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiquidacionFaenaPesca" ADD CONSTRAINT "MovLiquidacionFaenaPesca_id_liquidacion_faena_fkey" FOREIGN KEY ("id_liquidacion_faena") REFERENCES "LiquidacionFaenaPesca"("id_liquidacion_faena") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiquidacionFaenaPesca" ADD CONSTRAINT "MovLiquidacionFaenaPesca_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "CentroCosto"("CentroID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiquidacionFaenaPesca" ADD CONSTRAINT "MovLiquidacionFaenaPesca_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
