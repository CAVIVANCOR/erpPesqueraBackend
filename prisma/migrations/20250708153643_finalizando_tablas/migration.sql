/*
  Warnings:

  - You are about to drop the column `cuentaBancariaDestinoId` on the `MovimientoCaja` table. All the data in the column will be lost.
  - You are about to drop the column `cuentaBancariaOrigenId` on the `MovimientoCaja` table. All the data in the column will be lost.
  - You are about to drop the column `fechaContable` on the `MovimientoCaja` table. All the data in the column will be lost.
  - You are about to drop the column `fechaOperacionReal` on the `MovimientoCaja` table. All the data in the column will be lost.
  - Added the required column `cuentaCorrienteDestinoId` to the `MovimientoCaja` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cuentaCorrienteOrigenId` to the `MovimientoCaja` table without a default value. This is not possible if the table is not empty.
  - Made the column `empresaDestinoId` on table `MovimientoCaja` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MovimientoCaja" DROP COLUMN "cuentaBancariaDestinoId",
DROP COLUMN "cuentaBancariaOrigenId",
DROP COLUMN "fechaContable",
DROP COLUMN "fechaOperacionReal",
ADD COLUMN     "cuentaCorrienteDestinoId" BIGINT NOT NULL,
ADD COLUMN     "cuentaCorrienteOrigenId" BIGINT NOT NULL,
ADD COLUMN     "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "empresaDestinoId" SET NOT NULL;

-- CreateTable
CREATE TABLE "CuentaCorriente" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "bancoId" BIGINT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "tipoCuentaCorrienteId" BIGINT NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CuentaCorriente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoCuentaCorriente" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoCuentaCorriente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuentaCorriente_numeroCuenta_key" ON "CuentaCorriente"("numeroCuenta");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCuentaCorriente_nombre_key" ON "TipoCuentaCorriente"("nombre");

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cuentaCorrienteOrigenId_fkey" FOREIGN KEY ("cuentaCorrienteOrigenId") REFERENCES "CuentaCorriente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cuentaCorrienteDestinoId_fkey" FOREIGN KEY ("cuentaCorrienteDestinoId") REFERENCES "CuentaCorriente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_tipoCuentaCorrienteId_fkey" FOREIGN KEY ("tipoCuentaCorrienteId") REFERENCES "TipoCuentaCorriente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
