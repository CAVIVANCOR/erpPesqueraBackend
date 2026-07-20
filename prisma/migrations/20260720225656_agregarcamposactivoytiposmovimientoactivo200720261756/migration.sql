-- AlterTable
ALTER TABLE "Activo" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "cuentaDepreciacionId" BIGINT,
ADD COLUMN     "cuentaGastoDepId" BIGINT,
ADD COLUMN     "productoId" BIGINT;

-- AlterTable
ALTER TABLE "TipoMovimientoActivoFijo" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "afectaDepreciacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "afectaValorActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "cuentaDebeId" BIGINT,
ADD COLUMN     "cuentaHaberId" BIGINT,
ADD COLUMN     "dasDeBajaActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "generaAsientoAutomatico" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiereProducto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usaCuentasActivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "usaCuentasProducto" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_cuentaDepreciacionId_fkey" FOREIGN KEY ("cuentaDepreciacionId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_cuentaGastoDepId_fkey" FOREIGN KEY ("cuentaGastoDepId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoMovimientoActivoFijo" ADD CONSTRAINT "TipoMovimientoActivoFijo_cuentaDebeId_fkey" FOREIGN KEY ("cuentaDebeId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoMovimientoActivoFijo" ADD CONSTRAINT "TipoMovimientoActivoFijo_cuentaHaberId_fkey" FOREIGN KEY ("cuentaHaberId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
