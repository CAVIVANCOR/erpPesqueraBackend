-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "procesoOrigenId" BIGINT,
ADD COLUMN     "submoduloOrigenId" BIGINT;

-- CreateIndex
CREATE INDEX "OrdenCompra_submoduloOrigenId_procesoOrigenId_idx" ON "OrdenCompra"("submoduloOrigenId", "procesoOrigenId");

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_submoduloOrigenId_fkey" FOREIGN KEY ("submoduloOrigenId") REFERENCES "SubmoduloSistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
