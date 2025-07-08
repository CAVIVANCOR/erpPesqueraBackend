/*
  Warnings:

  - You are about to drop the column `destinoVentaId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `formaVentaId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `modoDespachoId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `tipoVentaId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the `DestinoVenta` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FormaVenta` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModoDespacho` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TipoVenta` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `destinoProductoId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `formaTransaccionId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modoDespachoRecepcionId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoEstadoProductoId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_destinoVentaId_fkey";

-- DropForeignKey
ALTER TABLE "CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_formaVentaId_fkey";

-- DropForeignKey
ALTER TABLE "CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_modoDespachoId_fkey";

-- DropForeignKey
ALTER TABLE "CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_tipoVentaId_fkey";

-- AlterTable
ALTER TABLE "CotizacionVentas" DROP COLUMN "destinoVentaId",
DROP COLUMN "formaVentaId",
DROP COLUMN "modoDespachoId",
DROP COLUMN "tipoVentaId",
ADD COLUMN     "destinoProductoId" BIGINT NOT NULL,
ADD COLUMN     "formaTransaccionId" BIGINT NOT NULL,
ADD COLUMN     "modoDespachoRecepcionId" BIGINT NOT NULL,
ADD COLUMN     "tipoEstadoProductoId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "TipoProducto" ADD COLUMN     "paraCompras" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paraVentas" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "DestinoVenta";

-- DropTable
DROP TABLE "FormaVenta";

-- DropTable
DROP TABLE "ModoDespacho";

-- DropTable
DROP TABLE "TipoVenta";

-- CreateTable
CREATE TABLE "TipoEstadoProducto" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "paraCompras" BOOLEAN NOT NULL DEFAULT false,
    "paraVentas" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TipoEstadoProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinoProducto" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "paraCompras" BOOLEAN NOT NULL DEFAULT false,
    "paraVentas" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DestinoProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaTransaccion" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FormaTransaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModoDespachoRecepcion" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModoDespachoRecepcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoEstadoProducto_nombre_key" ON "TipoEstadoProducto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "DestinoProducto_nombre_key" ON "DestinoProducto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FormaTransaccion_nombre_key" ON "FormaTransaccion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ModoDespachoRecepcion_nombre_key" ON "ModoDespachoRecepcion"("nombre");

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_tipoEstadoProductoId_fkey" FOREIGN KEY ("tipoEstadoProductoId") REFERENCES "TipoEstadoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_destinoProductoId_fkey" FOREIGN KEY ("destinoProductoId") REFERENCES "DestinoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_formaTransaccionId_fkey" FOREIGN KEY ("formaTransaccionId") REFERENCES "FormaTransaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_modoDespachoRecepcionId_fkey" FOREIGN KEY ("modoDespachoRecepcionId") REFERENCES "ModoDespachoRecepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
