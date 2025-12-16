-- AlterTable
ALTER TABLE "DescargaFaenaConsumo" ADD COLUMN     "katanaTripulacionId" BIGINT,
ADD COLUMN     "nroCubetas" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "precioPorKgEspecie" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "precioTotal" DECIMAL(18,2) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "DetCuotaPesca" ADD COLUMN     "precioPorTonDolares" DECIMAL(10,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "formaParteCalculoEntregaARendir" BOOLEAN DEFAULT false,
ADD COLUMN     "formaParteCalculoLiquidacionTripulantes" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "formaParteCalculoEntregaARendir" BOOLEAN DEFAULT false,
ADD COLUMN     "formaParteCalculoLiquidacionTripulantes" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "cantDivisoriaCalcComisionMotorista" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "cantPersonalCalcComisionMotorista" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "monedaCalculosLiqId" BIGINT DEFAULT 1,
ADD COLUMN     "porcentajeBaseLiqPesca" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeCalcComisionPanguero" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeComisionPatron" DECIMAL(7,2) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "Especie" ADD COLUMN     "cubetaPesoKg" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "precioPorKg" DECIMAL(7,2) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "origenReferenciaIngresoMovCajaId" BIGINT;

-- AlterTable
ALTER TABLE "NovedadPescaConsumo" ADD COLUMN     "cantDivisoriaCalcComisionMotorista" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "cantPersonalCalcComisionMotorista" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionAlquilerCuota" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionMotoristaReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionPangueroReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionPatronReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqTotalPescaReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqTripulantesPescaReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeBaseLiqPesca" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeCalcComisionPanguero" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeComisionPatron" DECIMAL(7,2) DEFAULT 0.00;

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "cantDivisoriaCalcComisionMotorista" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "cantPersonalCalcComisionMotorista" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionAlquilerCuota" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionMotoristaEstimado" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionMotoristaReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionPangueroEstimado" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionPangueroReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionPatronEstimado" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqComisionPatronReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqTotalPescaEstimada" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqTotalPescaReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqTripulantesPescaEstimado" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "liqTripulantesPescaReal" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeBaseLiqPesca" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeCalcComisionPanguero" DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN     "porcentajeComisionPatron" DECIMAL(7,2) DEFAULT 0.00;

-- CreateTable
CREATE TABLE "KatanaTripulacion" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "rangoInicialTn" DECIMAL(7,3) DEFAULT 0.00,
    "rangoFinaTn" DECIMAL(7,3) DEFAULT 0.00,
    "kgOtorgadoCalculo" DECIMAL(10,3) DEFAULT 0.00,

    CONSTRAINT "KatanaTripulacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KatanaTripulacion_empresaId_idx" ON "KatanaTripulacion"("empresaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_katanaTripulacionId_idx" ON "DescargaFaenaConsumo"("katanaTripulacionId");

-- CreateIndex
CREATE INDEX "Empresa_monedaCalculosLiqId_idx" ON "Empresa"("monedaCalculosLiqId");

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_katanaTripulacionId_fkey" FOREIGN KEY ("katanaTripulacionId") REFERENCES "KatanaTripulacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_monedaCalculosLiqId_fkey" FOREIGN KEY ("monedaCalculosLiqId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KatanaTripulacion" ADD CONSTRAINT "KatanaTripulacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
