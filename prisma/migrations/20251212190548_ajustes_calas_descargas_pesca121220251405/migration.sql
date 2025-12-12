-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_puertoDescargaId_idx" ON "DescargaFaenaConsumo"("puertoDescargaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_puertoFondeoId_idx" ON "DescargaFaenaConsumo"("puertoFondeoId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_patronId_idx" ON "DescargaFaenaConsumo"("patronId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_motoristaId_idx" ON "DescargaFaenaConsumo"("motoristaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_bahiaId_idx" ON "DescargaFaenaConsumo"("bahiaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_clienteId_idx" ON "DescargaFaenaConsumo"("clienteId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_especieId_idx" ON "DescargaFaenaConsumo"("especieId");

-- CreateIndex
CREATE INDEX "DescargaFaenaConsumo_faenaPescaConsumoId_idx" ON "DescargaFaenaConsumo"("faenaPescaConsumoId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_puertoDescargaId_idx" ON "DescargaFaenaPesca"("puertoDescargaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_puertoFondeoId_idx" ON "DescargaFaenaPesca"("puertoFondeoId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_patronId_idx" ON "DescargaFaenaPesca"("patronId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_motoristaId_idx" ON "DescargaFaenaPesca"("motoristaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_bahiaId_idx" ON "DescargaFaenaPesca"("bahiaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_clienteId_idx" ON "DescargaFaenaPesca"("clienteId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_temporadaPescaId_idx" ON "DescargaFaenaPesca"("temporadaPescaId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_especieId_idx" ON "DescargaFaenaPesca"("especieId");

-- CreateIndex
CREATE INDEX "DescargaFaenaPesca_faenaPescaId_idx" ON "DescargaFaenaPesca"("faenaPescaId");

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_puertoDescargaId_fkey" FOREIGN KEY ("puertoDescargaId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_puertoFondeoId_fkey" FOREIGN KEY ("puertoFondeoId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_bahiaId_fkey" FOREIGN KEY ("bahiaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "Especie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaConsumo" ADD CONSTRAINT "DescargaFaenaConsumo_movIngresoAlmacenId_fkey" FOREIGN KEY ("movIngresoAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_puertoDescargaId_fkey" FOREIGN KEY ("puertoDescargaId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_puertoFondeoId_fkey" FOREIGN KEY ("puertoFondeoId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_bahiaId_fkey" FOREIGN KEY ("bahiaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "Especie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescargaFaenaPesca" ADD CONSTRAINT "DescargaFaenaPesca_movIngresoAlmacenId_fkey" FOREIGN KEY ("movIngresoAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
