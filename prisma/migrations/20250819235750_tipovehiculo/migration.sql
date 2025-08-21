/*
  Warnings:

  - A unique constraint covering the columns `[activoId]` on the table `BolicheRed` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BolicheRed_activoId_key" ON "public"."BolicheRed"("activoId");
