-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
