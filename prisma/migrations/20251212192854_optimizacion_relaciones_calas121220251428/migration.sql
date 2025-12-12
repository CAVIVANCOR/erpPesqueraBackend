-- AlterTable
ALTER TABLE "PuertoPesca" ADD COLUMN     "esPuertoOtroPais" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Cala_bahiaId_idx" ON "Cala"("bahiaId");

-- CreateIndex
CREATE INDEX "Cala_motoristaId_idx" ON "Cala"("motoristaId");

-- CreateIndex
CREATE INDEX "Cala_patronId_idx" ON "Cala"("patronId");

-- CreateIndex
CREATE INDEX "Cala_embarcacionId_idx" ON "Cala"("embarcacionId");

-- CreateIndex
CREATE INDEX "Cala_faenaPescaId_idx" ON "Cala"("faenaPescaId");

-- CreateIndex
CREATE INDEX "Cala_temporadaPescaId_idx" ON "Cala"("temporadaPescaId");

-- CreateIndex
CREATE INDEX "CalaFaenaConsumo_bahiaId_idx" ON "CalaFaenaConsumo"("bahiaId");

-- CreateIndex
CREATE INDEX "CalaFaenaConsumo_motoristaId_idx" ON "CalaFaenaConsumo"("motoristaId");

-- CreateIndex
CREATE INDEX "CalaFaenaConsumo_patronId_idx" ON "CalaFaenaConsumo"("patronId");

-- CreateIndex
CREATE INDEX "CalaFaenaConsumo_embarcacionId_idx" ON "CalaFaenaConsumo"("embarcacionId");

-- CreateIndex
CREATE INDEX "CalaFaenaConsumo_faenaPescaConsumoId_idx" ON "CalaFaenaConsumo"("faenaPescaConsumoId");

-- CreateIndex
CREATE INDEX "CalaFaenaConsumo_novedadPescaConsumoId_idx" ON "CalaFaenaConsumo"("novedadPescaConsumoId");

-- AddForeignKey
ALTER TABLE "Cala" ADD CONSTRAINT "Cala_bahiaId_fkey" FOREIGN KEY ("bahiaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cala" ADD CONSTRAINT "Cala_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cala" ADD CONSTRAINT "Cala_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cala" ADD CONSTRAINT "Cala_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalaFaenaConsumo" ADD CONSTRAINT "CalaFaenaConsumo_bahiaId_fkey" FOREIGN KEY ("bahiaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalaFaenaConsumo" ADD CONSTRAINT "CalaFaenaConsumo_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalaFaenaConsumo" ADD CONSTRAINT "CalaFaenaConsumo_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalaFaenaConsumo" ADD CONSTRAINT "CalaFaenaConsumo_embarcacionId_fkey" FOREIGN KEY ("embarcacionId") REFERENCES "Embarcacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
