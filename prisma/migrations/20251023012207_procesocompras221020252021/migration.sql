-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "esExoneradoAlIGV" BOOLEAN DEFAULT false,
ADD COLUMN     "porcentajeIGV" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "RequerimientoCompra" ADD COLUMN     "esExoneradoAlIGV" BOOLEAN DEFAULT false,
ADD COLUMN     "porcentajeIGV" DECIMAL(65,30);
