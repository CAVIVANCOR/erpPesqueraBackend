-- AlterTable
ALTER TABLE "Cala" ADD COLUMN     "combustibleConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "lugarUbicacionGeografica" TEXT,
ADD COLUMN     "recorridoMillasNauticas" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "CalaFaenaConsumo" ADD COLUMN     "combustibleConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "lugarUbicacionGeografica" TEXT,
ADD COLUMN     "recorridoMillasNauticas" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "DescargaFaenaConsumo" ADD COLUMN     "combustibleConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoMillasNauticas" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" ADD COLUMN     "combustibleConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoMillasNauticas" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "FaenaPesca" ADD COLUMN     "PrecioGalonPetroleoSoles" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleAbastecidoGalones" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoMillasNauticas" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "FaenaPescaConsumo" ADD COLUMN     "PrecioGalonPetroleoSoles" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleAbastecidoGalones" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoMillasNauticas" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "combustibleTotalConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleTotalConsumidoReal" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "consumoTotalPetroleo" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "consumoTotalPetroleoReal" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoTotalMillasNauticas" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoTotalMillasNauticasReal" DECIMAL(65,30) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "combustibleTotalConsumido" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "combustibleTotalConsumidoReal" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "consumoTotalPetroleo" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "consumoTotalPetroleoReal" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoTotalMillasNauticas" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "recorridoTotalMillasNauticasReal" DECIMAL(65,30) DEFAULT 0.00;

-- CreateTable
CREATE TABLE "DetalleDiaSinFaena" (
    "id" BIGSERIAL NOT NULL,
    "temporadaPescaId" BIGINT,
    "novedadPescaConsumoId" BIGINT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "motivoSinFaenaId" BIGINT NOT NULL,
    "observaciones" VARCHAR(500),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DetalleDiaSinFaena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivoSinFaena" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MotivoSinFaena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetalleDiaSinFaena_temporadaPescaId_idx" ON "DetalleDiaSinFaena"("temporadaPescaId");

-- CreateIndex
CREATE INDEX "DetalleDiaSinFaena_novedadPescaConsumoId_idx" ON "DetalleDiaSinFaena"("novedadPescaConsumoId");

-- CreateIndex
CREATE INDEX "DetalleDiaSinFaena_fecha_idx" ON "DetalleDiaSinFaena"("fecha");

-- CreateIndex
CREATE INDEX "DetalleDiaSinFaena_motivoSinFaenaId_idx" ON "DetalleDiaSinFaena"("motivoSinFaenaId");

-- CreateIndex
CREATE INDEX "MotivoSinFaena_activo_idx" ON "MotivoSinFaena"("activo");

-- AddForeignKey
ALTER TABLE "DetalleDiaSinFaena" ADD CONSTRAINT "DetalleDiaSinFaena_temporadaPescaId_fkey" FOREIGN KEY ("temporadaPescaId") REFERENCES "TemporadaPesca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDiaSinFaena" ADD CONSTRAINT "DetalleDiaSinFaena_novedadPescaConsumoId_fkey" FOREIGN KEY ("novedadPescaConsumoId") REFERENCES "NovedadPescaConsumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDiaSinFaena" ADD CONSTRAINT "DetalleDiaSinFaena_motivoSinFaenaId_fkey" FOREIGN KEY ("motivoSinFaenaId") REFERENCES "MotivoSinFaena"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDiaSinFaena" ADD CONSTRAINT "DetalleDiaSinFaena_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDiaSinFaena" ADD CONSTRAINT "DetalleDiaSinFaena_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
