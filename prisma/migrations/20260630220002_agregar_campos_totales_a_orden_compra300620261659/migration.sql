-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "subtotal" DECIMAL(18,2),
ADD COLUMN     "total" DECIMAL(18,2),
ADD COLUMN     "totalDescuentos" DECIMAL(18,2),
ADD COLUMN     "totalIGV" DECIMAL(18,2);
