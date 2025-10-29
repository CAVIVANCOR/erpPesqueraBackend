/*
  Warnings:

  - You are about to drop the column `puederAprobarDocs` on the `AccesosUsuario` table. All the data in the column will be lost.
  - You are about to drop the column `puederRechazarDocs` on the `AccesosUsuario` table. All the data in the column will be lost.
  - You are about to drop the column `cesado` on the `Usuario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[usuarioId,submoduloId]` on the table `AccesosUsuario` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[moduloId,nombre]` on the table `SubmoduloSistema` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AccesosUsuario" DROP COLUMN "puederAprobarDocs",
DROP COLUMN "puederRechazarDocs",
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fechaRevocado" TIMESTAMP(3),
ADD COLUMN     "otorgadoPor" BIGINT,
ADD COLUMN     "puedeAprobarDocs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puedeRechazarDocs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revocadoPor" BIGINT;

-- AlterTable
ALTER TABLE "SubmoduloSistema" ADD COLUMN     "icono" TEXT,
ADD COLUMN     "orden" INTEGER,
ADD COLUMN     "ruta" TEXT;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "cesado",
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bloqueadoHasta" TIMESTAMP(3),
ADD COLUMN     "fechaInactivacion" TIMESTAMP(3),
ADD COLUMN     "inactivadoPor" BIGINT,
ADD COLUMN     "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "motivoInactivacion" TEXT;

-- CreateIndex
CREATE INDEX "AccesosUsuario_usuarioId_idx" ON "AccesosUsuario"("usuarioId");

-- CreateIndex
CREATE INDEX "AccesosUsuario_submoduloId_idx" ON "AccesosUsuario"("submoduloId");

-- CreateIndex
CREATE INDEX "AccesosUsuario_activo_idx" ON "AccesosUsuario"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "AccesosUsuario_usuarioId_submoduloId_key" ON "AccesosUsuario"("usuarioId", "submoduloId");

-- CreateIndex
CREATE INDEX "SubmoduloSistema_moduloId_idx" ON "SubmoduloSistema"("moduloId");

-- CreateIndex
CREATE INDEX "SubmoduloSistema_activo_idx" ON "SubmoduloSistema"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "SubmoduloSistema_moduloId_nombre_key" ON "SubmoduloSistema"("moduloId", "nombre");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE INDEX "Usuario_personalId_idx" ON "Usuario"("personalId");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- CreateIndex
CREATE INDEX "Usuario_username_idx" ON "Usuario"("username");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
