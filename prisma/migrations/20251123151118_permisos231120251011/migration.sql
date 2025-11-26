/*
  Warnings:

  - You are about to drop the column `observaciones` on the `DetPermisoGestionadoOT` table. All the data in the column will be lost.
  - You are about to drop the column `permisoId` on the `DetPermisoGestionadoOT` table. All the data in the column will be lost.
  - Added the required column `permisoAutorizacionId` to the `DetPermisoGestionadoOT` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DetPermisoGestionadoOT" DROP COLUMN "observaciones",
DROP COLUMN "permisoId",
ADD COLUMN     "permisoAutorizacionId" BIGINT NOT NULL,
ADD COLUMN     "urlPermisoAutorizacion" TEXT;

-- AddForeignKey
ALTER TABLE "DetPermisoGestionadoOT" ADD CONSTRAINT "DetPermisoGestionadoOT_permisoAutorizacionId_fkey" FOREIGN KEY ("permisoAutorizacionId") REFERENCES "PermisoAutorizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
