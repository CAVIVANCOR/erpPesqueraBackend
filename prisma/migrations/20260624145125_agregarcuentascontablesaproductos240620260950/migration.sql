-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "cuentaComprasId" BIGINT,
ADD COLUMN     "cuentaCostoVentasId" BIGINT,
ADD COLUMN     "cuentaInventarioId" BIGINT,
ADD COLUMN     "cuentaVariacionId" BIGINT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_cuentaComprasId_fkey" FOREIGN KEY ("cuentaComprasId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_cuentaInventarioId_fkey" FOREIGN KEY ("cuentaInventarioId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_cuentaCostoVentasId_fkey" FOREIGN KEY ("cuentaCostoVentasId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_cuentaVariacionId_fkey" FOREIGN KEY ("cuentaVariacionId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
