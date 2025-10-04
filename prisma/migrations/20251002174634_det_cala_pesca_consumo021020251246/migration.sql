-- AddForeignKey
ALTER TABLE "DetCalaPescaConsumo" ADD CONSTRAINT "DetCalaPescaConsumo_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "Especie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
