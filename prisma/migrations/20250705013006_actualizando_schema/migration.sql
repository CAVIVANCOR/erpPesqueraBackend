-- CreateTable
CREATE TABLE "CalaFaenaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "motoristaId" BIGINT NOT NULL,
    "patronId" BIGINT NOT NULL,
    "embarcacionId" BIGINT NOT NULL,
    "faenaPescaConsumoId" BIGINT NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "latitud" DECIMAL(65,30),
    "longitud" DECIMAL(65,30),
    "profundidadM" DECIMAL(65,30),
    "toneladasCapturadas" DECIMAL(65,30),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalaFaenaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetCalaPescaConsumo" (
    "id" BIGSERIAL NOT NULL,
    "calaFaenaConsumoId" BIGINT NOT NULL,
    "especieId" BIGINT NOT NULL,
    "toneladas" DECIMAL(65,30),
    "porcentajeJuveniles" DECIMAL(65,30),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetCalaPescaConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalaFaenaConsumoProduce" (
    "id" BIGSERIAL NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "motoristaId" BIGINT NOT NULL,
    "patronId" BIGINT NOT NULL,
    "embarcacionId" BIGINT NOT NULL,
    "faenaPescaConsumoId" BIGINT NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "latitud" DECIMAL(65,30),
    "longitud" DECIMAL(65,30),
    "profundidadM" DECIMAL(65,30),
    "toneladasCapturadas" DECIMAL(65,30),
    "observaciones" TEXT,
    "urlInformeCalaProduce" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalaFaenaConsumoProduce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetCalaFaenaConsumoProduce" (
    "id" BIGSERIAL NOT NULL,
    "calaFaenaConsumoProduceId" BIGINT NOT NULL,
    "especieId" BIGINT NOT NULL,
    "toneladas" DECIMAL(65,30),
    "porcentajeJuveniles" DECIMAL(65,30),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetCalaFaenaConsumoProduce_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CalaFaenaConsumo" ADD CONSTRAINT "CalaFaenaConsumo_faenaPescaConsumoId_fkey" FOREIGN KEY ("faenaPescaConsumoId") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetCalaPescaConsumo" ADD CONSTRAINT "DetCalaPescaConsumo_calaFaenaConsumoId_fkey" FOREIGN KEY ("calaFaenaConsumoId") REFERENCES "CalaFaenaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalaFaenaConsumoProduce" ADD CONSTRAINT "CalaFaenaConsumoProduce_faenaPescaConsumoId_fkey" FOREIGN KEY ("faenaPescaConsumoId") REFERENCES "FaenaPescaConsumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetCalaFaenaConsumoProduce" ADD CONSTRAINT "DetCalaFaenaConsumoProduce_calaFaenaConsumoProduceId_fkey" FOREIGN KEY ("calaFaenaConsumoProduceId") REFERENCES "CalaFaenaConsumoProduce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
