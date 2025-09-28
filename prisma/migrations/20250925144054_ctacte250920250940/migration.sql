/*
  Warnings:

  - A unique constraint covering the columns `[numeroCuenta,bancoId,empresaId]` on the table `CuentaCorriente` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CuentaCorriente_numeroCuenta_bancoId_empresaId_key" ON "public"."CuentaCorriente"("numeroCuenta", "bancoId", "empresaId");
