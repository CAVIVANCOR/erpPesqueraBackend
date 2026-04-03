/*
  Warnings:

  - A unique constraint covering the columns `[numeroCuenta,bancoId,empresaId,descripcion]` on the table `CuentaCorriente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CuentaCorriente_numeroCuenta_bancoId_empresaId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CuentaCorriente_numeroCuenta_bancoId_empresaId_descripcion_key" ON "CuentaCorriente"("numeroCuenta", "bancoId", "empresaId", "descripcion");
