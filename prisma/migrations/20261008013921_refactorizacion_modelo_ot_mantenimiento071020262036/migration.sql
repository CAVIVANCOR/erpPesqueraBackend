/*
  Warnings:

  - You are about to drop the column `preFacturaId` on the `DetContratistasOT` table. All the data in the column will be lost.
  - You are about to drop the column `productoServicioId` on the `DetContratistasOT` table. All the data in the column will be lost.
  - You are about to drop the column `incluidoEnPresupuesto` on the `DetRepuestosContratistaOT` table. All the data in the column will be lost.
  - You are about to drop the column `ordenCompraId` on the `DetRepuestosContratistaOT` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DetContratistasOT" DROP CONSTRAINT "DetContratistasOT_preFacturaId_fkey";

-- DropForeignKey
ALTER TABLE "DetContratistasOT" DROP CONSTRAINT "DetContratistasOT_productoServicioId_fkey";

-- DropForeignKey
ALTER TABLE "DetPermisoGestionadoOT" DROP CONSTRAINT "DetPermisoGestionadoOT_otMantenimientoId_fkey";

-- DropForeignKey
ALTER TABLE "DetRepuestosContratistaOT" DROP CONSTRAINT "DetRepuestosContratistaOT_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "EntregaARendirOTMantenimiento" DROP CONSTRAINT "EntregaARendirOTMantenimiento_otMantenimientoId_fkey";

-- DropIndex
DROP INDEX "DetContratistasOT_preFacturaId_idx";

-- DropIndex
DROP INDEX "DetContratistasOT_productoServicioId_idx";

-- DropIndex
DROP INDEX "DetRepuestosContratistaOT_ordenCompraId_idx";

-- AlterTable
ALTER TABLE "DetContratistasOT" DROP COLUMN "preFacturaId",
DROP COLUMN "productoServicioId",
ADD COLUMN     "fechaPresupuesto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "montoFacturado" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tipoCambio" DECIMAL(10,3),
ALTER COLUMN "montoPactado" SET DEFAULT 0,
ALTER COLUMN "saldo" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "DetRepuestosContratistaOT" DROP COLUMN "incluidoEnPresupuesto",
DROP COLUMN "ordenCompraId";
