/*
  Warnings:

  - You are about to drop the column `custodia` on the `ConceptoMovAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `kardexDestino` on the `ConceptoMovAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `kardexOrigen` on the `ConceptoMovAlmacen` table. All the data in the column will be lost.
  - Added the required column `descripcionArmada` to the `ConceptoMovAlmacen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConceptoMovAlmacen" DROP COLUMN "custodia",
DROP COLUMN "kardexDestino",
DROP COLUMN "kardexOrigen",
ADD COLUMN     "descripcionArmada" VARCHAR(255) NOT NULL,
ADD COLUMN     "esCustodia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "llevaKardexDestino" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "llevaKardexOrigen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Almacen" (
    "id" BIGSERIAL NOT NULL,
    "tipoAlmacenamientoId" BIGINT NOT NULL,
    "tipoAlmacenId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "centroAlmacenId" BIGINT NOT NULL,
    "seLlevaKardex" BOOLEAN NOT NULL DEFAULT false,
    "esAlmacenExterno" BOOLEAN NOT NULL DEFAULT false,
    "esAlmacenPropioSede" BOOLEAN NOT NULL DEFAULT false,
    "esAlmacenProduccion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentrosAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "proveedorId" BIGINT,
    "esCentroExterno" BOOLEAN NOT NULL DEFAULT false,
    "esCentroPropioSede" BOOLEAN NOT NULL DEFAULT false,
    "esCentroProduccion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CentrosAlmacen_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_centroAlmacenId_fkey" FOREIGN KEY ("centroAlmacenId") REFERENCES "CentrosAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_tipoAlmacenamientoId_fkey" FOREIGN KEY ("tipoAlmacenamientoId") REFERENCES "TipoAlmacenamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_tipoAlmacenId_fkey" FOREIGN KEY ("tipoAlmacenId") REFERENCES "TipoAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
