/*
  Warnings:

  - You are about to drop the column `pesoNeto` on the `DetalleMovimientoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `cantidad` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `costoSaldoPromedio` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `costoUnitario` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `costoUnitarioPromedio` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `detalleId` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `documentoId` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `fechaMovimiento` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `ingreso` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `peso` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `saldoCantidad` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `saldoDetCantidad` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `saldoDetPeso` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `saldoPeso` on the `KardexAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `tipoMovimientoId` on the `KardexAlmacen` table. All the data in the column will be lost.
  - Added the required column `detalleMovimientoAlmacenId` to the `KardexAlmacen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaMovimientoAlmacen` to the `KardexAlmacen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `movimientoAlmacenId` to the `KardexAlmacen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoFinalCant` to the `KardexAlmacen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldoIniCant` to the `KardexAlmacen` table without a default value. This is not possible if the table is not empty.
  - Made the column `clienteId` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."KardexAlmacen" DROP CONSTRAINT "KardexAlmacen_clienteId_fkey";

-- AlterTable
ALTER TABLE "DetalleMovimientoAlmacen" DROP COLUMN "pesoNeto",
ADD COLUMN     "peso" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "KardexAlmacen" DROP COLUMN "cantidad",
DROP COLUMN "costoSaldoPromedio",
DROP COLUMN "costoUnitario",
DROP COLUMN "costoUnitarioPromedio",
DROP COLUMN "detalleId",
DROP COLUMN "documentoId",
DROP COLUMN "fechaMovimiento",
DROP COLUMN "ingreso",
DROP COLUMN "observaciones",
DROP COLUMN "peso",
DROP COLUMN "saldoCantidad",
DROP COLUMN "saldoDetCantidad",
DROP COLUMN "saldoDetPeso",
DROP COLUMN "saldoPeso",
DROP COLUMN "tipoMovimientoId",
ADD COLUMN     "detalleMovimientoAlmacenId" BIGINT NOT NULL,
ADD COLUMN     "egresoCant" DECIMAL(65,30),
ADD COLUMN     "egresoCantCostoTotal" DECIMAL(65,30),
ADD COLUMN     "egresoCantCostoUnit" DECIMAL(65,30),
ADD COLUMN     "egresoCantVariables" DECIMAL(65,30),
ADD COLUMN     "egresoPeso" DECIMAL(65,30),
ADD COLUMN     "egresoPesoCostoTotal" DECIMAL(65,30),
ADD COLUMN     "egresoPesoCostoUnit" DECIMAL(65,30),
ADD COLUMN     "egresoPesoVariables" DECIMAL(65,30),
ADD COLUMN     "esIngresoEgreso" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaMovimientoAlmacen" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ingresoCant" DECIMAL(65,30),
ADD COLUMN     "ingresoCantCostoTotal" DECIMAL(65,30),
ADD COLUMN     "ingresoCantCostoUnit" DECIMAL(65,30),
ADD COLUMN     "ingresoCantVariables" DECIMAL(65,30),
ADD COLUMN     "ingresoPeso" DECIMAL(65,30),
ADD COLUMN     "ingresoPesoCostoTotal" DECIMAL(65,30),
ADD COLUMN     "ingresoPesoCostoUnit" DECIMAL(65,30),
ADD COLUMN     "ingresoPesoVariables" DECIMAL(65,30),
ADD COLUMN     "movimientoAlmacenId" BIGINT NOT NULL,
ADD COLUMN     "saldoFinalCant" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "saldoFinalCantVariables" DECIMAL(65,30),
ADD COLUMN     "saldoFinalCostoTotalCant" DECIMAL(65,30),
ADD COLUMN     "saldoFinalCostoUnitCant" DECIMAL(65,30),
ADD COLUMN     "saldoFinalPeso" DECIMAL(65,30),
ADD COLUMN     "saldoFinalPesoCostoTotal" DECIMAL(65,30),
ADD COLUMN     "saldoFinalPesoCostoUnit" DECIMAL(65,30),
ADD COLUMN     "saldoFinalPesoVariables" DECIMAL(65,30),
ADD COLUMN     "saldoIniCant" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "saldoInicialCantVariables" DECIMAL(65,30),
ADD COLUMN     "saldoInicialCostoTotalCant" DECIMAL(65,30),
ADD COLUMN     "saldoInicialCostoUnitCant" DECIMAL(65,30),
ADD COLUMN     "saldoInicialPeso" DECIMAL(65,30),
ADD COLUMN     "saldoInicialPesoCostoTotal" DECIMAL(65,30),
ADD COLUMN     "saldoInicialPesoCostoUnit" DECIMAL(65,30),
ADD COLUMN     "saldoInicialPesoVariables" DECIMAL(65,30),
ALTER COLUMN "clienteId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "KardexAlmacen" ADD CONSTRAINT "KardexAlmacen_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KardexAlmacen" ADD CONSTRAINT "KardexAlmacen_conceptoMovAlmacenId_fkey" FOREIGN KEY ("conceptoMovAlmacenId") REFERENCES "ConceptoMovAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
