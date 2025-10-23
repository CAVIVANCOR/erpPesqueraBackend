/*
  Warnings:

  - You are about to drop the `LiquidacionProcesoComprasProd` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovLiquidacionProcesoComprasProd` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."LiquidacionProcesoComprasProd" DROP CONSTRAINT "LiquidacionProcesoComprasProd_cotizacionComprasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MovLiquidacionProcesoComprasProd" DROP CONSTRAINT "MovLiquidacionProcesoComprasProd_liquidacionProcesoCompras_fkey";

-- AlterTable
ALTER TABLE "CotizacionCompras" ALTER COLUMN "respComprasId" DROP NOT NULL,
ALTER COLUMN "respProduccionId" DROP NOT NULL,
ALTER COLUMN "fechaEntrega" DROP NOT NULL,
ALTER COLUMN "autorizaCompraId" DROP NOT NULL,
ALTER COLUMN "contactoProveedorId" DROP NOT NULL,
ALTER COLUMN "direccionProveedorId" DROP NOT NULL,
ALTER COLUMN "bancoId" DROP NOT NULL,
ALTER COLUMN "centroCostoId" DROP NOT NULL,
ALTER COLUMN "proveedorMateriaPrimaId" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."LiquidacionProcesoComprasProd";

-- DropTable
DROP TABLE "public"."MovLiquidacionProcesoComprasProd";
