/*
  Warnings:

  - You are about to drop the column `actualizadoEn` on the `DetalleOrdenCompra` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `DetalleOrdenCompra` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DetalleOrdenCompra" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "cantidadCompra" DECIMAL(18,3),
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "precioUnitarioCompra" DECIMAL(18,6);
