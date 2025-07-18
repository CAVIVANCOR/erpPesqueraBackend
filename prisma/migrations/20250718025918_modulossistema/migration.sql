/*
  Warnings:

  - You are about to drop the column `icono` on the `ModuloSistema` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `ModuloSistema` table. All the data in the column will be lost.
  - You are about to drop the column `icono` on the `SubmoduloSistema` table. All the data in the column will be lost.
  - You are about to drop the column `orden` on the `SubmoduloSistema` table. All the data in the column will be lost.
  - You are about to drop the column `ruta` on the `SubmoduloSistema` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ModuloSistema" DROP COLUMN "icono",
DROP COLUMN "orden";

-- AlterTable
ALTER TABLE "SubmoduloSistema" DROP COLUMN "icono",
DROP COLUMN "orden",
DROP COLUMN "ruta";
