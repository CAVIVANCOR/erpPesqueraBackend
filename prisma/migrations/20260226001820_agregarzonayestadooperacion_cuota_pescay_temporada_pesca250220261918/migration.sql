-- CreateEnum
CREATE TYPE "ZonaPesca" AS ENUM ('NORTE', 'SUR');

-- AlterTable
ALTER TABLE "DetCuotaPesca" ADD COLUMN     "esAlquiler" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zona" "ZonaPesca" NOT NULL DEFAULT 'NORTE';

-- AlterTable
ALTER TABLE "TemporadaPesca" ADD COLUMN     "ingresosPorAlquilerCuotaSur" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "zona" "ZonaPesca" NOT NULL DEFAULT 'NORTE';

-- CreateIndex
CREATE INDEX "DetCuotaPesca_zona_idx" ON "DetCuotaPesca"("zona");

-- CreateIndex
CREATE INDEX "DetCuotaPesca_esAlquiler_idx" ON "DetCuotaPesca"("esAlquiler");
