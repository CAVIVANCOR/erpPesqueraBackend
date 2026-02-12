-- AlterTable
ALTER TABLE "CuentaPorCobrar" ADD COLUMN     "asientoContableId" BIGINT,
ADD COLUMN     "fechaDetraccion" TIMESTAMP(3),
ADD COLUMN     "fechaPercepcion" TIMESTAMP(3),
ADD COLUMN     "fechaRetencion" TIMESTAMP(3),
ADD COLUMN     "montoDetraccion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoPercepcion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoRetencion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "numeroComprobantePercepcion" VARCHAR(50),
ADD COLUMN     "numeroComprobanteRetencion" VARCHAR(50),
ADD COLUMN     "numeroConstanciaDetraccion" VARCHAR(50),
ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "porcentajePercepcion" DECIMAL(5,2),
ADD COLUMN     "tieneDetraccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tienePercepcion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tieneRetencion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CuentaPorPagar" ADD COLUMN     "asientoContableId" BIGINT,
ADD COLUMN     "fechaDetraccion" TIMESTAMP(3),
ADD COLUMN     "fechaPercepcion" TIMESTAMP(3),
ADD COLUMN     "fechaRetencion" TIMESTAMP(3),
ADD COLUMN     "montoDetraccion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoPercepcion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoRetencion" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "numeroComprobantePercepcion" VARCHAR(50),
ADD COLUMN     "numeroComprobanteRetencion" VARCHAR(50),
ADD COLUMN     "numeroConstanciaDetraccion" VARCHAR(50),
ADD COLUMN     "porcentajeDetraccion" DECIMAL(5,2),
ADD COLUMN     "porcentajePercepcion" DECIMAL(5,2),
ADD COLUMN     "tieneDetraccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tienePercepcion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tieneRetencion" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_asientoContableId_idx" ON "CuentaPorCobrar"("asientoContableId");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_tieneDetraccion_idx" ON "CuentaPorCobrar"("tieneDetraccion");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_tieneRetencion_idx" ON "CuentaPorCobrar"("tieneRetencion");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_tienePercepcion_idx" ON "CuentaPorCobrar"("tienePercepcion");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_ordenCompraId_idx" ON "CuentaPorPagar"("ordenCompraId");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_asientoContableId_idx" ON "CuentaPorPagar"("asientoContableId");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_tieneDetraccion_idx" ON "CuentaPorPagar"("tieneDetraccion");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_tieneRetencion_idx" ON "CuentaPorPagar"("tieneRetencion");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_tienePercepcion_idx" ON "CuentaPorPagar"("tienePercepcion");

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
