-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "esTemporadaSoloAlquiler" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "TemporadaPesca_esTemporadaSoloAlquiler_idx" ON "TemporadaPesca"("esTemporadaSoloAlquiler");
