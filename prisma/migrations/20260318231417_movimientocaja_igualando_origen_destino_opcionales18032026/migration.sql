-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_cuentaCorrienteOrigenId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_empresaOrigenId_fkey";

-- AlterTable
ALTER TABLE "MovimientoCaja" ALTER COLUMN "empresaOrigenId" DROP NOT NULL,
ALTER COLUMN "cuentaCorrienteOrigenId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cuentaCorrienteOrigenId_fkey" FOREIGN KEY ("cuentaCorrienteOrigenId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_empresaOrigenId_fkey" FOREIGN KEY ("empresaOrigenId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
