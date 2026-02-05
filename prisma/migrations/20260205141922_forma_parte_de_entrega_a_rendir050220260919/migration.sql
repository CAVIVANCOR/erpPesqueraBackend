-- AlterTable
ALTER TABLE "DetMovsEntregaRendirContratoServicios" ADD COLUMN     "formaParteCalculoEntregaARendir" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirMovAlmacen" ADD COLUMN     "formaParteCalculoEntregaARendir" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirOTMantenimiento" ADD COLUMN     "formaParteCalculoEntregaARendir" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "formaParteCalculoEntregaARendir" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD COLUMN     "formaParteCalculoEntregaARendir" BOOLEAN DEFAULT false;
