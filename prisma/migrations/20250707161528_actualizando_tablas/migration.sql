/*
  Warnings:

  - You are about to drop the column `movSalidaAlmacenId` on the `DescargaFaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `bahiaId` on the `EntregaARendir` table. All the data in the column will be lost.
  - You are about to drop the column `bahiaId` on the `EntregaARendirPescaConsumo` table. All the data in the column will be lost.
  - Added the required column `modoDespachoId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `respEntregaRendirId` to the `EntregaARendir` table without a default value. This is not possible if the table is not empty.
  - Added the required column `respEntregaRendirId` to the `EntregaARendirPescaConsumo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DescargaFaenaPesca_movSalidaAlmacenId_idx";

-- AlterTable
ALTER TABLE "CotizacionVentas" ADD COLUMN     "modoDespachoId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "DescargaFaenaPesca" DROP COLUMN "movSalidaAlmacenId";

-- AlterTable
ALTER TABLE "EntregaARendir" DROP COLUMN "bahiaId",
ADD COLUMN     "respEntregaRendirId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "EntregaARendirPescaConsumo" DROP COLUMN "bahiaId",
ADD COLUMN     "respEntregaRendirId" BIGINT NOT NULL;

-- CreateTable
CREATE TABLE "ModoDespacho" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModoDespacho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModoDespacho_nombre_key" ON "ModoDespacho"("nombre");

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_modoDespachoId_fkey" FOREIGN KEY ("modoDespachoId") REFERENCES "ModoDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
