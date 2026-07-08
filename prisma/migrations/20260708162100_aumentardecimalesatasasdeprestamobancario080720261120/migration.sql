/*
  Warnings:

  - You are about to alter the column `comisionInicial` on the `PrestamoBancario` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,6)`.
  - You are about to alter the column `comisionMantenimiento` on the `PrestamoBancario` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,6)`.
  - You are about to alter the column `seguroDesgravamen` on the `PrestamoBancario` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,6)`.

*/
-- AlterTable
ALTER TABLE "PrestamoBancario" ALTER COLUMN "tasaInteresAnual" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "tasaInteresEfectiva" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "tasaMoratoria" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "comisionInicial" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "comisionMantenimiento" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "seguroDesgravamen" SET DATA TYPE DECIMAL(18,6);
