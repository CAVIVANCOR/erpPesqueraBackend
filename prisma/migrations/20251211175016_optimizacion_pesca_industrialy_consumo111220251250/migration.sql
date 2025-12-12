-- CreateIndex
CREATE INDEX "FaenaPesca_temporadaId_idx" ON "FaenaPesca"("temporadaId");

-- CreateIndex
CREATE INDEX "FaenaPesca_embarcacionId_idx" ON "FaenaPesca"("embarcacionId");

-- CreateIndex
CREATE INDEX "FaenaPesca_bahiaId_idx" ON "FaenaPesca"("bahiaId");

-- CreateIndex
CREATE INDEX "FaenaPesca_motoristaId_idx" ON "FaenaPesca"("motoristaId");

-- CreateIndex
CREATE INDEX "FaenaPesca_patronId_idx" ON "FaenaPesca"("patronId");

-- CreateIndex
CREATE INDEX "FaenaPesca_estadoFaenaId_idx" ON "FaenaPesca"("estadoFaenaId");

-- CreateIndex
CREATE INDEX "FaenaPesca_fechaSalida_idx" ON "FaenaPesca"("fechaSalida");

-- CreateIndex
CREATE INDEX "FaenaPescaConsumo_novedadPescaConsumoId_idx" ON "FaenaPescaConsumo"("novedadPescaConsumoId");

-- CreateIndex
CREATE INDEX "FaenaPescaConsumo_embarcacionId_idx" ON "FaenaPescaConsumo"("embarcacionId");

-- CreateIndex
CREATE INDEX "FaenaPescaConsumo_bahiaId_idx" ON "FaenaPescaConsumo"("bahiaId");

-- CreateIndex
CREATE INDEX "FaenaPescaConsumo_motoristaId_idx" ON "FaenaPescaConsumo"("motoristaId");

-- CreateIndex
CREATE INDEX "FaenaPescaConsumo_patronId_idx" ON "FaenaPescaConsumo"("patronId");

-- CreateIndex
CREATE INDEX "FaenaPescaConsumo_estadoFaenaId_idx" ON "FaenaPescaConsumo"("estadoFaenaId");

-- CreateIndex
CREATE INDEX "FaenaPescaConsumo_fechaSalida_idx" ON "FaenaPescaConsumo"("fechaSalida");

-- CreateIndex
CREATE INDEX "NovedadPescaConsumo_empresaId_idx" ON "NovedadPescaConsumo"("empresaId");

-- CreateIndex
CREATE INDEX "NovedadPescaConsumo_BahiaId_idx" ON "NovedadPescaConsumo"("BahiaId");

-- CreateIndex
CREATE INDEX "NovedadPescaConsumo_estadoNovedadPescaConsumoId_idx" ON "NovedadPescaConsumo"("estadoNovedadPescaConsumoId");

-- CreateIndex
CREATE INDEX "NovedadPescaConsumo_fechaInicio_idx" ON "NovedadPescaConsumo"("fechaInicio");

-- CreateIndex
CREATE INDEX "TemporadaPesca_empresaId_idx" ON "TemporadaPesca"("empresaId");

-- CreateIndex
CREATE INDEX "TemporadaPesca_BahiaId_idx" ON "TemporadaPesca"("BahiaId");

-- CreateIndex
CREATE INDEX "TemporadaPesca_estadoTemporadaId_idx" ON "TemporadaPesca"("estadoTemporadaId");

-- CreateIndex
CREATE INDEX "TemporadaPesca_fechaInicio_idx" ON "TemporadaPesca"("fechaInicio");

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_bahiaId_fkey" FOREIGN KEY ("bahiaId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_puertoDescargaId_fkey" FOREIGN KEY ("puertoDescargaId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_puertoSalidaId_fkey" FOREIGN KEY ("puertoSalidaId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_puertoFondeoId_fkey" FOREIGN KEY ("puertoFondeoId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_estadoFaenaId_fkey" FOREIGN KEY ("estadoFaenaId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_bahiaId_fkey" FOREIGN KEY ("bahiaId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_puertoDescargaId_fkey" FOREIGN KEY ("puertoDescargaId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_puertoSalidaId_fkey" FOREIGN KEY ("puertoSalidaId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_puertoFondeoId_fkey" FOREIGN KEY ("puertoFondeoId") REFERENCES "PuertoPesca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaenaPescaConsumo" ADD CONSTRAINT "FaenaPescaConsumo_estadoFaenaId_fkey" FOREIGN KEY ("estadoFaenaId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadPescaConsumo" ADD CONSTRAINT "NovedadPescaConsumo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadPescaConsumo" ADD CONSTRAINT "NovedadPescaConsumo_BahiaId_fkey" FOREIGN KEY ("BahiaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadPescaConsumo" ADD CONSTRAINT "NovedadPescaConsumo_estadoNovedadPescaConsumoId_fkey" FOREIGN KEY ("estadoNovedadPescaConsumoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_BahiaId_fkey" FOREIGN KEY ("BahiaId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaPesca" ADD CONSTRAINT "TemporadaPesca_estadoTemporadaId_fkey" FOREIGN KEY ("estadoTemporadaId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
