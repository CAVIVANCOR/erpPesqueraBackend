-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "saldoFinalAsignacion" DECIMAL(65,30),
ADD COLUMN     "saldoInicialAsignacion" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "saldoFinalAsignacion" DECIMAL(65,30),
ADD COLUMN     "saldoInicialAsignacion" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD COLUMN     "saldoFinalAsignacion" DECIMAL(65,30),
ADD COLUMN     "saldoInicialAsignacion" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD COLUMN     "saldoFinalAsignacion" DECIMAL(65,30),
ADD COLUMN     "saldoInicialAsignacion" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD COLUMN     "saldoFinalAsignacion" DECIMAL(65,30),
ADD COLUMN     "saldoInicialAsignacion" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "saldoFinalAsignacion" DECIMAL(65,30),
ADD COLUMN     "saldoInicialAsignacion" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD COLUMN     "saldoFinalAsignacion" DECIMAL(65,30),
ADD COLUMN     "saldoInicialAsignacion" DECIMAL(65,30);
