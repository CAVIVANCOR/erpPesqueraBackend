/*
  Warnings:

  - You are about to drop the column `custodia` on the `SaldosProductoCliente` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[empresaId,almacenId,productoId,clienteId,esCustodia]` on the table `SaldosProductoCliente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."SaldosProductoCliente_empresaId_almacenId_productoId_client_key";

-- AlterTable
ALTER TABLE "SaldosProductoCliente" DROP COLUMN "custodia",
ADD COLUMN     "esCustodia" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "SaldosProductoCliente_empresaId_almacenId_productoId_client_key" ON "SaldosProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "esCustodia");

-- AddForeignKey
ALTER TABLE "SaldosDetProductoCliente" ADD CONSTRAINT "SaldosDetProductoCliente_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldosDetProductoCliente" ADD CONSTRAINT "SaldosDetProductoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldosProductoCliente" ADD CONSTRAINT "SaldosProductoCliente_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldosProductoCliente" ADD CONSTRAINT "SaldosProductoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
