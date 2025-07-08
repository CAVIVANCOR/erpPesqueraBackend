/*
  Warnings:

  - Added the required column `bahiaId` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `motoristaId` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patronId` to the `FaenaPesca` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FaenaPesca" ADD COLUMN     "bahiaId" BIGINT NOT NULL,
ADD COLUMN     "motoristaId" BIGINT NOT NULL,
ADD COLUMN     "patronId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "areaFisicaId" BIGINT,
ADD COLUMN     "sedeEmpresaId" BIGINT;

-- CreateTable
CREATE TABLE "AreaFisicaSede" (
    "id" BIGSERIAL NOT NULL,
    "sedeId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaFisicaSede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cala" (
    "id" BIGSERIAL NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "motoristaId" BIGINT NOT NULL,
    "patronId" BIGINT NOT NULL,
    "embarcacionId" BIGINT NOT NULL,
    "faenaPescaId" BIGINT NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "profundidadM" DOUBLE PRECISION,
    "toneladasCapturadas" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleCalaEspecie" (
    "id" BIGSERIAL NOT NULL,
    "calaId" BIGINT NOT NULL,
    "especieId" BIGINT NOT NULL,
    "toneladas" DOUBLE PRECISION,
    "porcentajeJuveniles" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleCalaEspecie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalaProduce" (
    "id" BIGSERIAL NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "motoristaId" BIGINT NOT NULL,
    "patronId" BIGINT NOT NULL,
    "embarcacionId" BIGINT NOT NULL,
    "faenaPescaId" BIGINT NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "profundidadM" DOUBLE PRECISION,
    "toneladasCapturadas" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalaProduce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleCalaEspecieProduce" (
    "id" BIGSERIAL NOT NULL,
    "calaProduceId" BIGINT NOT NULL,
    "especieId" BIGINT NOT NULL,
    "toneladas" DOUBLE PRECISION,
    "porcentajeJuveniles" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetalleCalaEspecieProduce_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AreaFisicaSede" ADD CONSTRAINT "AreaFisicaSede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "SedesEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cala" ADD CONSTRAINT "Cala_faenaPescaId_fkey" FOREIGN KEY ("faenaPescaId") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCalaEspecie" ADD CONSTRAINT "DetalleCalaEspecie_calaId_fkey" FOREIGN KEY ("calaId") REFERENCES "Cala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalaProduce" ADD CONSTRAINT "CalaProduce_faenaPescaId_fkey" FOREIGN KEY ("faenaPescaId") REFERENCES "FaenaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCalaEspecieProduce" ADD CONSTRAINT "DetalleCalaEspecieProduce_calaProduceId_fkey" FOREIGN KEY ("calaProduceId") REFERENCES "CalaProduce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
