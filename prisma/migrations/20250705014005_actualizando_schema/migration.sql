-- CreateTable
CREATE TABLE "DescargaFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaConsumoId" BIGINT NOT NULL,
    "puertoDescargaId" BIGINT NOT NULL,
    "fechaHoraArriboPuerto" TIMESTAMP(3) NOT NULL,
    "fechaHoraLlegadaPuerto" TIMESTAMP(3) NOT NULL,
    "clienteId" BIGINT NOT NULL,
    "numPlataformaDescarga" VARCHAR(20),
    "turnoPlataformaDescarga" VARCHAR(20),
    "fechaHoraInicioDescarga" TIMESTAMP(3) NOT NULL,
    "fechaHoraFinDescarga" TIMESTAMP(3) NOT NULL,
    "numWinchaPesaje" VARCHAR(20),
    "urlComprobanteWincha" TEXT,
    "patroId" BIGINT NOT NULL,
    "motoristaId" BIGINT NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "almacenId" BIGINT NOT NULL,
    "latitud" DECIMAL(65,30),
    "longitud" DECIMAL(65,30),
    "fechaDescarga" TIMESTAMP(3) NOT NULL,
    "cantidadTotal" DECIMAL(65,30) NOT NULL,
    "combustibleAbastecidoGalones" DECIMAL(65,30) NOT NULL,
    "urlValeAbastecimiento" TEXT,
    "urlInformeDescargaProduce" TEXT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DescargaFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetDescargaFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "descargaFaenaConsumoId" BIGINT NOT NULL,
    "especieId" BIGINT NOT NULL,
    "toneladas" DECIMAL(65,30),
    "porcentajeJuveniles" DECIMAL(65,30),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetDescargaFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacionFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "faena_pesca_consumo_id" BIGINT NOT NULL,
    "fecha_liquidacion" TIMESTAMP(3) NOT NULL,
    "responsable_id" BIGINT NOT NULL,
    "verificadorId" BIGINT,
    "fechaVerificacion" TIMESTAMP(3),
    "urlPdfLiquidacion" TEXT,
    "saldo_inicial" DECIMAL(65,30) NOT NULL,
    "saldo_final" DECIMAL(65,30) NOT NULL,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidacionFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovLiquidacionFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "liquidacionFaenaConsumoId" BIGINT NOT NULL,
    "refDetMovsEntregaRendirId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "centroCostoId" BIGINT,
    "observaciones" TEXT,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovLiquidacionFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DescargaFaenaConsumo_faenaPescaConsumoId_key" ON "DescargaFaenaConsumo"("faenaPescaConsumoId");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionFaenaConsumo_faena_pesca_consumo_id_key" ON "LiquidacionFaenaConsumo"("faena_pesca_consumo_id");

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_faenaPescaConsumoId_fkey" FOREIGN KEY ("faenaPescaConsumoId") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetDescargaFaenaConsumo" ADD CONSTRAINT "DetDescargaFaenaConsumo_descargaFaenaConsumoId_fkey" FOREIGN KEY ("descargaFaenaConsumoId") REFERENCES "DescargaFaenaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionFaenaConsumo" ADD CONSTRAINT "LiquidacionFaenaConsumo_faena_pesca_consumo_id_fkey" FOREIGN KEY ("faena_pesca_consumo_id") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovLiquidacionFaenaConsumo" ADD CONSTRAINT "MovLiquidacionFaenaConsumo_liquidacionFaenaConsumoId_fkey" FOREIGN KEY ("liquidacionFaenaConsumoId") REFERENCES "LiquidacionFaenaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
