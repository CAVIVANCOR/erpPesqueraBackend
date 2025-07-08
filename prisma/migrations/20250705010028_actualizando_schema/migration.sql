/*
  Warnings:

  - You are about to alter the column `latitud` on the `Cala` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `longitud` on the `Cala` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `profundidadM` on the `Cala` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `toneladasCapturadas` on the `Cala` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `latitud` on the `CalaProduce` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `longitud` on the `CalaProduce` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `profundidadM` on the `CalaProduce` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `toneladasCapturadas` on the `CalaProduce` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `latitud` on the `DescargaFaenaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `longitud` on the `DescargaFaenaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `cantidadTotal` on the `DescargaFaenaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `combustibleAbastecidoGalones` on the `DescargaFaenaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `monto` on the `DetMovsEntregaRendir` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `toneladas` on the `DetalleCalaEspecie` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `porcentajeJuveniles` on the `DetalleCalaEspecie` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `toneladas` on the `DetalleCalaEspecieProduce` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `porcentajeJuveniles` on the `DetalleCalaEspecieProduce` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `toneladas` on the `DetalleDescargaFaena` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `porcentajeJuveniles` on the `DetalleDescargaFaena` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `capacidadBodegaTon` on the `Embarcacion` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `esloraM` on the `Embarcacion` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `mangaM` on the `Embarcacion` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `puntalM` on the `Embarcacion` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `porcentajeIgv` on the `Empresa` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `montoMinimoRetencion` on the `Empresa` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `porcentajeRetencion` on the `Empresa` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `montoMaximo` on the `LineaCreditoEntidad` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `saldo_inicial` on the `LiquidacionFaenaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `saldo_final` on the `LiquidacionFaenaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `monto` on the `MovLiquidacionFaenaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to drop the column `fecha` on the `MovimientoCaja` table. All the data in the column will be lost.
  - You are about to alter the column `precioUnitario` on the `PrecioEntidad` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `latitud` on the `PuertoPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `longitud` on the `PuertoPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `cuotaAlquiladaTon` on the `TemporadaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `cuotaPropiaTon` on the `TemporadaPesca` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `capacidadTon` on the `VehiculoEntidad` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - Added the required column `BahiaId` to the `TemporadaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cala" ALTER COLUMN "latitud" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "longitud" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "profundidadM" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "toneladasCapturadas" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "CalaProduce" ALTER COLUMN "latitud" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "longitud" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "profundidadM" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "toneladasCapturadas" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ALTER COLUMN "latitud" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "longitud" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "cantidadTotal" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "combustibleAbastecidoGalones" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetalleCalaEspecie" ALTER COLUMN "toneladas" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "porcentajeJuveniles" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetalleCalaEspecieProduce" ALTER COLUMN "toneladas" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "porcentajeJuveniles" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetalleDescargaFaena" ALTER COLUMN "toneladas" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "porcentajeJuveniles" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Embarcacion" ALTER COLUMN "capacidadBodegaTon" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "esloraM" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "mangaM" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "puntalM" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Empresa" ALTER COLUMN "porcentajeIgv" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "montoMinimoRetencion" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "porcentajeRetencion" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "LineaCreditoEntidad" ALTER COLUMN "montoMaximo" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "LiquidacionFaenaPesca" ALTER COLUMN "saldo_inicial" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "saldo_final" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "MovLiquidacionFaenaPesca" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "MovimientoCaja" DROP COLUMN "fecha",
ADD COLUMN     "fechaContable" TIMESTAMP(3),
ADD COLUMN     "fechaOperacionReal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PrecioEntidad" ALTER COLUMN "precioUnitario" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "PuertoPesca" ALTER COLUMN "latitud" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "longitud" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "BahiaId" BIGINT NOT NULL,
ALTER COLUMN "cuotaAlquiladaTon" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "cuotaPropiaTon" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "VehiculoEntidad" ALTER COLUMN "capacidadTon" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "NovedadPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "BahiaId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovedadPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaenaPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "novedadPescaConsumoId" BIGINT NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "motoristaId" BIGINT NOT NULL,
    "patronId" BIGINT NOT NULL,
    "descripcion" TEXT,
    "fechaSalida" TIMESTAMP(3) NOT NULL,
    "fechaRetorno" TIMESTAMP(3) NOT NULL,
    "puertoSalidaId" BIGINT NOT NULL,
    "puertoRetornoId" BIGINT NOT NULL,
    "puertoDescargaId" BIGINT NOT NULL,
    "embarcacionId" BIGINT,
    "bolicheRedId" BIGINT,
    "urlInformeFaena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaenaPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetAccionesPreviasFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaConsumoId" BIGINT NOT NULL,
    "accionPreviaId" BIGINT NOT NULL,
    "responsableId" BIGINT,
    "verificadorId" BIGINT,
    "fechaVerificacion" TIMESTAMP(3),
    "cumplida" BOOLEAN NOT NULL DEFAULT false,
    "fechaCumplida" TIMESTAMP(3),
    "urlConfirmaAccionPdf" TEXT,
    "observaciones" TEXT,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetAccionesPreviasFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetDocTripulantesFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaConsumoId" BIGINT NOT NULL,
    "tripulanteId" BIGINT,
    "documentoId" BIGINT,
    "numeroDocumento" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "urlDocTripulantePdf" TEXT,
    "observaciones" TEXT,
    "verificado" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetDocTripulantesFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripulanteFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaConsumoId" BIGINT NOT NULL,
    "personalId" BIGINT,
    "cargoId" BIGINT,
    "nombres" TEXT,
    "apellidos" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripulanteFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetDocEmbarcacionPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaConsumoId" BIGINT NOT NULL,
    "documentoPescaId" BIGINT NOT NULL,
    "numeroDocumento" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "urlDocEmbarcacio" TEXT,
    "observaciones" TEXT,
    "verificado" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetDocEmbarcacionPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaARendirPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "novedadPescaConsumoId" BIGINT NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "entregaLiquidada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLiquidacion" TIMESTAMP(3),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntregaARendirPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetMovsEntRendirPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "entregaARendirPescaConsumoId" BIGINT NOT NULL,
    "responsableId" BIGINT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "centroCostoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetMovsEntRendirPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_novedadPescaConsumoId_fkey" FOREIGN KEY ("novedadPescaConsumoId") REFERENCES "NovedadPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_bolicheRedId_fkey" FOREIGN KEY ("bolicheRedId") REFERENCES "BolicheRed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetAccionesPreviasFaenaConsumo" ADD CONSTRAINT "DetAccionesPreviasFaenaConsumo_faenaPescaConsumoId_fkey" FOREIGN KEY ("faenaPescaConsumoId") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetAccionesPreviasFaenaConsumo" ADD CONSTRAINT "DetAccionesPreviasFaenaConsumo_accionPreviaId_fkey" FOREIGN KEY ("accionPreviaId") REFERENCES "AccionesPreviasFaena"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetDocTripulantesFaenaConsumo" ADD CONSTRAINT "DetDocTripulantesFaenaConsumo_faenaPescaConsumoId_fkey" FOREIGN KEY ("faenaPescaConsumoId") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripulanteFaenaConsumo" ADD CONSTRAINT "TripulanteFaenaConsumo_faenaPescaConsumoId_fkey" FOREIGN KEY ("faenaPescaConsumoId") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetDocEmbarcacionPescaConsumo" ADD CONSTRAINT "DetDocEmbarcacionPescaConsumo_faenaPescaConsumoId_fkey" FOREIGN KEY ("faenaPescaConsumoId") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaARendirPescaConsumo" ADD CONSTRAINT "EntregaARendirPescaConsumo_novedadPescaConsumoId_fkey" FOREIGN KEY ("novedadPescaConsumoId") REFERENCES "NovedadPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_entregaARendirPescaConsumoId_fkey" FOREIGN KEY ("entregaARendirPescaConsumoId") REFERENCES "EntregaARendirPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
