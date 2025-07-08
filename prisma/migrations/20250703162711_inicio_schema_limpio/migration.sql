-- CreateTable
CREATE TABLE "DescargaFaenaPesca" (
    "id" BIGSERIAL NOT NULL,
    "faenaPescaId" BIGINT NOT NULL,
    "puertoDescargaId" BIGINT NOT NULL,
    "fechaHoraArriboPuerto" TIMESTAMP(3) NOT NULL,
    "fechaHoraLlegadaPuerto" TIMESTAMP(3) NOT NULL,
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
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "fechaDescarga" TIMESTAMP(3) NOT NULL,
    "cantidadTotal" DOUBLE PRECISION NOT NULL,
    "combustibleAbastecidoGalones" DOUBLE PRECISION NOT NULL,
    "urlValeAbastecimiento" TEXT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DescargaFaenaPesca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleDescargaFaena" (
    "id" BIGSERIAL NOT NULL,
    "descargaFaenaId" BIGINT NOT NULL,
    "especieId" BIGINT NOT NULL,
    "toneladas" DOUBLE PRECISION,
    "porcentajeJuveniles" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleDescargaFaena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DescargaFaenaPesca_faenaPescaId_key" ON "DescargaFaenaPesca"("faenaPescaId");

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_faenaPescaId_fkey" FOREIGN KEY ("faenaPescaId") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDescargaFaena" ADD CONSTRAINT "DetalleDescargaFaena_descargaFaenaId_fkey" FOREIGN KEY ("descargaFaenaId") REFERENCES "DescargaFaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
