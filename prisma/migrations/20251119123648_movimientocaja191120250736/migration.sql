-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_cuentaCorrienteDestinoId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_entidadComercialId_fkey";

-- AlterTable
ALTER TABLE "MovimientoCaja" ALTER COLUMN "empresaDestinoId" DROP NOT NULL,
ALTER COLUMN "cuentaCorrienteDestinoId" DROP NOT NULL,
ALTER COLUMN "entidadComercialId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cuentaCorrienteDestinoId_fkey" FOREIGN KEY ("cuentaCorrienteDestinoId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_empresaOrigenId_fkey" FOREIGN KEY ("empresaOrigenId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_empresaDestinoId_fkey" FOREIGN KEY ("empresaDestinoId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
