/*
  Warnings:

  - You are about to drop the column `fechaGeneroPrefacturaVenta` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `fechaGeneroSalidaAlmacen` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `generoPrefacturaVentaId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `generoSalidaAlmacenId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `movSalidaAlmacenId` on the `CotizacionVentas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CotizacionVentas" DROP COLUMN "fechaGeneroPrefacturaVenta",
DROP COLUMN "fechaGeneroSalidaAlmacen",
DROP COLUMN "generoPrefacturaVentaId",
DROP COLUMN "generoSalidaAlmacenId",
DROP COLUMN "movSalidaAlmacenId",
ADD COLUMN     "fechaUsuarioGeneroPreFactVenta" TIMESTAMP(3),
ADD COLUMN     "fechaUsuarioGeneroReqCompraId" TIMESTAMP(3),
ADD COLUMN     "reqCompraId" BIGINT,
ADD COLUMN     "usuarioGeneroPreFactVentaId" BIGINT,
ADD COLUMN     "usuarioGeneroReqCompraId" BIGINT;
