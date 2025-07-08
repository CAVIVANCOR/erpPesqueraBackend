/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `Personal` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Personal" DROP CONSTRAINT "Personal_usuarioId_fkey";

-- DropIndex
DROP INDEX "Personal_usuarioId_key";

-- AlterTable
ALTER TABLE "Personal" DROP COLUMN "usuarioId";

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
