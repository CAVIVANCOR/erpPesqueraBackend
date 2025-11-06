/*
  Warnings:

  - You are about to drop the column `createdAt` on the `VehiculoEntidad` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `VehiculoEntidad` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Banco" ADD COLUMN     "billeteraDigital" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nroBilleteraDigital" TEXT;

-- AlterTable
ALTER TABLE "ContactoEntidad" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "DireccionEntidad" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "LineaCreditoEntidad" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PrecioEntidad" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VehiculoEntidad" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CtaCteEntidad" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,
    "bancoId" BIGINT NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "numeroCuenta" TEXT,
    "numeroCuentaCCI" TEXT,
    "numeroTelefonoBilletera" TEXT,
    "BilleteraDigital" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CtaCteEntidad_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LineaCreditoEntidad" ADD CONSTRAINT "LineaCreditoEntidad_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaCteEntidad" ADD CONSTRAINT "CtaCteEntidad_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaCteEntidad" ADD CONSTRAINT "CtaCteEntidad_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaCteEntidad" ADD CONSTRAINT "CtaCteEntidad_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
