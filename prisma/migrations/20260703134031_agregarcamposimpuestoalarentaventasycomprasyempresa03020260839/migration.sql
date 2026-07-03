-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "porcentajeImpuestoRenta" DECIMAL(5,2) DEFAULT 8.00;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "aplicaImpuestoRenta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoImpuestoRenta" DECIMAL(18,2),
ADD COLUMN     "porcentajeImpuestoRenta" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "aplicaImpuestoRenta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoImpuestoRenta" DECIMAL(18,2),
ADD COLUMN     "porcentajeImpuestoRenta" DECIMAL(5,2);
