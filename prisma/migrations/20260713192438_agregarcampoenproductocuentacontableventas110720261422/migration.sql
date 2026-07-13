-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "cuentaVentasId" BIGINT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_cuentaVentasId_fkey" FOREIGN KEY ("cuentaVentasId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
