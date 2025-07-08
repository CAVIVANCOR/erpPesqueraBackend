/*
  Warnings:

  - You are about to drop the column `centro_costo_id` on the `MovLiquidacionFaenaPesca` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_registro` on the `MovLiquidacionFaenaPesca` table. All the data in the column will be lost.
  - The primary key for the `Producto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_producto` on the `Producto` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" DROP CONSTRAINT "DetalleMovimientoAlmacen_productoId_fkey";

-- AlterTable
ALTER TABLE "MovLiquidacionFaenaPesca" DROP COLUMN "centro_costo_id",
DROP COLUMN "fecha_registro",
ADD COLUMN     "centroCostoId" BIGINT,
ADD COLUMN     "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_pkey",
DROP COLUMN "id_producto",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "Producto_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
