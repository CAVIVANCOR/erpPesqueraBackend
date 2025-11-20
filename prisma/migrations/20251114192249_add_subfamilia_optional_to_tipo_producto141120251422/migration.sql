/*
  Warnings:

  - You are about to alter the column `nombre` on the `TipoProducto` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.

*/
-- AlterTable
ALTER TABLE "TipoProducto" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "subfamiliaId" BIGINT,
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100);

-- CreateIndex
CREATE INDEX "TipoProducto_subfamiliaId_idx" ON "TipoProducto"("subfamiliaId");

-- AddForeignKey
ALTER TABLE "TipoProducto" ADD CONSTRAINT "TipoProducto_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "SubfamiliaProducto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
