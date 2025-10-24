/*
  Warnings:

  - Made the column `lote` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `numContenedor` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nroSerie` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoCant` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoCantCostoTotal` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoCantCostoUnit` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoCantVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoPeso` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoPesoCostoTotal` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoPesoCostoUnit` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `egresoPesoVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoCant` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoCantCostoTotal` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoCantCostoUnit` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoCantVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoPeso` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoPesoCostoTotal` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoPesoCostoUnit` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingresoPesoVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoFinalCantVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoFinalCostoTotalCant` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoFinalCostoUnitCant` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoFinalPeso` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoFinalPesoCostoTotal` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoFinalPesoCostoUnit` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoFinalPesoVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoInicialCantVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoInicialCostoTotalCant` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoInicialCostoUnitCant` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoInicialPeso` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoInicialPesoCostoTotal` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoInicialPesoCostoUnit` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoInicialPesoVariables` on table `KardexAlmacen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clienteId` on table `SaldosDetProductoCliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lote` on table `SaldosDetProductoCliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `numContenedor` on table `SaldosDetProductoCliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nroSerie` on table `SaldosDetProductoCliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoPeso` on table `SaldosDetProductoCliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clienteId` on table `SaldosProductoCliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoPeso` on table `SaldosProductoCliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `costoUnitarioPromedio` on table `SaldosProductoCliente` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."SaldosDetProductoCliente" DROP CONSTRAINT "SaldosDetProductoCliente_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SaldosProductoCliente" DROP CONSTRAINT "SaldosProductoCliente_clienteId_fkey";

-- AlterTable
ALTER TABLE "KardexAlmacen" ALTER COLUMN "lote" SET NOT NULL,
ALTER COLUMN "lote" SET DEFAULT '',
ALTER COLUMN "numContenedor" SET NOT NULL,
ALTER COLUMN "numContenedor" SET DEFAULT '',
ALTER COLUMN "nroSerie" SET NOT NULL,
ALTER COLUMN "nroSerie" SET DEFAULT '',
ALTER COLUMN "egresoCant" SET NOT NULL,
ALTER COLUMN "egresoCant" SET DEFAULT 0,
ALTER COLUMN "egresoCantCostoTotal" SET NOT NULL,
ALTER COLUMN "egresoCantCostoTotal" SET DEFAULT 0,
ALTER COLUMN "egresoCantCostoUnit" SET NOT NULL,
ALTER COLUMN "egresoCantCostoUnit" SET DEFAULT 0,
ALTER COLUMN "egresoCantVariables" SET NOT NULL,
ALTER COLUMN "egresoCantVariables" SET DEFAULT 0,
ALTER COLUMN "egresoPeso" SET NOT NULL,
ALTER COLUMN "egresoPeso" SET DEFAULT 0,
ALTER COLUMN "egresoPesoCostoTotal" SET NOT NULL,
ALTER COLUMN "egresoPesoCostoTotal" SET DEFAULT 0,
ALTER COLUMN "egresoPesoCostoUnit" SET NOT NULL,
ALTER COLUMN "egresoPesoCostoUnit" SET DEFAULT 0,
ALTER COLUMN "egresoPesoVariables" SET NOT NULL,
ALTER COLUMN "egresoPesoVariables" SET DEFAULT 0,
ALTER COLUMN "ingresoCant" SET NOT NULL,
ALTER COLUMN "ingresoCant" SET DEFAULT 0,
ALTER COLUMN "ingresoCantCostoTotal" SET NOT NULL,
ALTER COLUMN "ingresoCantCostoTotal" SET DEFAULT 0,
ALTER COLUMN "ingresoCantCostoUnit" SET NOT NULL,
ALTER COLUMN "ingresoCantCostoUnit" SET DEFAULT 0,
ALTER COLUMN "ingresoCantVariables" SET NOT NULL,
ALTER COLUMN "ingresoCantVariables" SET DEFAULT 0,
ALTER COLUMN "ingresoPeso" SET NOT NULL,
ALTER COLUMN "ingresoPeso" SET DEFAULT 0,
ALTER COLUMN "ingresoPesoCostoTotal" SET NOT NULL,
ALTER COLUMN "ingresoPesoCostoTotal" SET DEFAULT 0,
ALTER COLUMN "ingresoPesoCostoUnit" SET NOT NULL,
ALTER COLUMN "ingresoPesoCostoUnit" SET DEFAULT 0,
ALTER COLUMN "ingresoPesoVariables" SET NOT NULL,
ALTER COLUMN "ingresoPesoVariables" SET DEFAULT 0,
ALTER COLUMN "saldoFinalCant" SET DEFAULT 0,
ALTER COLUMN "saldoFinalCantVariables" SET NOT NULL,
ALTER COLUMN "saldoFinalCantVariables" SET DEFAULT 0,
ALTER COLUMN "saldoFinalCostoTotalCant" SET NOT NULL,
ALTER COLUMN "saldoFinalCostoTotalCant" SET DEFAULT 0,
ALTER COLUMN "saldoFinalCostoUnitCant" SET NOT NULL,
ALTER COLUMN "saldoFinalCostoUnitCant" SET DEFAULT 0,
ALTER COLUMN "saldoFinalPeso" SET NOT NULL,
ALTER COLUMN "saldoFinalPeso" SET DEFAULT 0,
ALTER COLUMN "saldoFinalPesoCostoTotal" SET NOT NULL,
ALTER COLUMN "saldoFinalPesoCostoTotal" SET DEFAULT 0,
ALTER COLUMN "saldoFinalPesoCostoUnit" SET NOT NULL,
ALTER COLUMN "saldoFinalPesoCostoUnit" SET DEFAULT 0,
ALTER COLUMN "saldoFinalPesoVariables" SET NOT NULL,
ALTER COLUMN "saldoFinalPesoVariables" SET DEFAULT 0,
ALTER COLUMN "saldoIniCant" SET DEFAULT 0,
ALTER COLUMN "saldoInicialCantVariables" SET NOT NULL,
ALTER COLUMN "saldoInicialCantVariables" SET DEFAULT 0,
ALTER COLUMN "saldoInicialCostoTotalCant" SET NOT NULL,
ALTER COLUMN "saldoInicialCostoTotalCant" SET DEFAULT 0,
ALTER COLUMN "saldoInicialCostoUnitCant" SET NOT NULL,
ALTER COLUMN "saldoInicialCostoUnitCant" SET DEFAULT 0,
ALTER COLUMN "saldoInicialPeso" SET NOT NULL,
ALTER COLUMN "saldoInicialPeso" SET DEFAULT 0,
ALTER COLUMN "saldoInicialPesoCostoTotal" SET NOT NULL,
ALTER COLUMN "saldoInicialPesoCostoTotal" SET DEFAULT 0,
ALTER COLUMN "saldoInicialPesoCostoUnit" SET NOT NULL,
ALTER COLUMN "saldoInicialPesoCostoUnit" SET DEFAULT 0,
ALTER COLUMN "saldoInicialPesoVariables" SET NOT NULL,
ALTER COLUMN "saldoInicialPesoVariables" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "SaldosDetProductoCliente" ALTER COLUMN "clienteId" SET NOT NULL,
ALTER COLUMN "lote" SET NOT NULL,
ALTER COLUMN "lote" SET DEFAULT '',
ALTER COLUMN "numContenedor" SET NOT NULL,
ALTER COLUMN "numContenedor" SET DEFAULT '',
ALTER COLUMN "nroSerie" SET NOT NULL,
ALTER COLUMN "nroSerie" SET DEFAULT '',
ALTER COLUMN "saldoCantidad" SET DEFAULT 0,
ALTER COLUMN "saldoPeso" SET NOT NULL,
ALTER COLUMN "saldoPeso" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "SaldosProductoCliente" ALTER COLUMN "clienteId" SET NOT NULL,
ALTER COLUMN "saldoCantidad" SET DEFAULT 0,
ALTER COLUMN "saldoPeso" SET NOT NULL,
ALTER COLUMN "saldoPeso" SET DEFAULT 0,
ALTER COLUMN "costoUnitarioPromedio" SET NOT NULL,
ALTER COLUMN "costoUnitarioPromedio" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "SaldosDetProductoCliente" ADD CONSTRAINT "SaldosDetProductoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldosProductoCliente" ADD CONSTRAINT "SaldosProductoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
