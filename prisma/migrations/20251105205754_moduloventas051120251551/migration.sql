/*
  Warnings:

  - You are about to drop the column `actualizadoEn` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `estadoCotizacionId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `fechaArribo` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `fechaEntrega` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `fechaRegistro` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `fechaUsuarioGeneroPreFactVenta` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `fechaUsuarioGeneroReqCompraId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `fechaZarpe` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `idPaisDestino` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `monedaClienteId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `reqCompraId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioGeneroPreFactVentaId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioGeneroReqCompraId` on the `CotizacionVentas` table. All the data in the column will be lost.
  - You are about to alter the column `tipoCambio` on the `CotizacionVentas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `pesoMaximoContenedor` on the `CotizacionVentas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,3)`.
  - You are about to alter the column `montoAdelantadoCliente` on the `CotizacionVentas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to drop the column `actualizadoEn` on the `DetCotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `clienteId` on the `DetCotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `DetCotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `DetCotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `monedaId` on the `DetCotizacionVentas` table. All the data in the column will be lost.
  - You are about to drop the column `prefacturaVentaId` on the `DetCotizacionVentas` table. All the data in the column will be lost.
  - You are about to alter the column `cantidad` on the `DetCotizacionVentas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,3)`.
  - You are about to alter the column `precioUnitario` on the `DetCotizacionVentas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to drop the column `actualizadoEn` on the `DetMovsEntregaRendirPVentas` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `DetMovsEntregaRendirPVentas` table. All the data in the column will be lost.
  - You are about to alter the column `monto` on the `DetMovsEntregaRendirPVentas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `urlComprobanteMovimiento` on the `DetMovsEntregaRendirPVentas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `urlComprobanteOperacionMovCaja` on the `DetMovsEntregaRendirPVentas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `numeroCorrelativoComprobante` on the `DetMovsEntregaRendirPVentas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `numeroSerieComprobante` on the `DetMovsEntregaRendirPVentas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to drop the column `actualizadoEn` on the `DetallePreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `igv` on the `DetallePreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `DetallePreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `porcentajeIgv` on the `DetallePreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `DetallePreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `DetallePreFactura` table. All the data in the column will be lost.
  - You are about to alter the column `cantidad` on the `DetallePreFactura` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,3)`.
  - You are about to alter the column `precioUnitario` on the `DetallePreFactura` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to drop the column `actualizadoEn` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `fechaEmision` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `precioVentaTotal` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `totalIGV` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `valorVentaTotal` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to alter the column `ordenCompraCliente` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `numeroBuque` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `numeroBL` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `numContenedor` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `porcentajeIgv` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(5,2)`.
  - You are about to alter the column `tipoCambio` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `urlPreFacturaPdf` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `numIdTransfErpContable` on the `PreFactura` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to drop the `DocRequeridaComprasVentas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `detDocsReqCotizaVentas` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[codigo]` on the table `CotizacionVentas` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cotizacionVentasId]` on the table `EntregaARendirPVentas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigo` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estadoId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `factorExportacion` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaEntregaEstimada` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaVencimiento` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monedaId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoDocumentoId` to the `CotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `item` to the `DetCotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precioUnitarioFinal` to the `DetCotizacionVentas` table without a default value. This is not possible if the table is not empty.
  - Made the column `monedaId` on table `DetMovsEntregaRendirPVentas` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `nombre` to the `Incoterm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `formaPagoId` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoDocumentoId` to the `PreFactura` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_destinoProductoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_formaTransaccionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_modoDespachoRecepcionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CotizacionVentas" DROP CONSTRAINT "CotizacionVentas_tipoEstadoProductoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetCotizacionVentas" DROP CONSTRAINT "DetCotizacionVentas_cotizacionVentasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetMovsEntregaRendirPVentas" DROP CONSTRAINT "DetMovsEntregaRendirPVentas_entregaARendirPVentasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetMovsEntregaRendirPVentas" DROP CONSTRAINT "DetMovsEntregaRendirPVentas_monedaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DetallePreFactura" DROP CONSTRAINT "DetallePreFactura_preFacturaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detDocsReqCotizaVentas" DROP CONSTRAINT "detDocsReqCotizaVentas_cotizacionVentasId_fkey";

-- DropForeignKey
ALTER TABLE "public"."detDocsReqCotizaVentas" DROP CONSTRAINT "detDocsReqCotizaVentas_docRequeridaVentasId_fkey";

-- AlterTable
ALTER TABLE "CotizacionVentas" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
DROP COLUMN "estadoCotizacionId",
DROP COLUMN "fechaArribo",
DROP COLUMN "fechaEntrega",
DROP COLUMN "fechaRegistro",
DROP COLUMN "fechaUsuarioGeneroPreFactVenta",
DROP COLUMN "fechaUsuarioGeneroReqCompraId",
DROP COLUMN "fechaZarpe",
DROP COLUMN "idPaisDestino",
DROP COLUMN "monedaClienteId",
DROP COLUMN "reqCompraId",
DROP COLUMN "usuarioGeneroPreFactVentaId",
DROP COLUMN "usuarioGeneroReqCompraId",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "aprobadoPorId" BIGINT,
ADD COLUMN     "cantidadContenedores" INTEGER,
ADD COLUMN     "codigo" VARCHAR(30) NOT NULL,
ADD COLUMN     "cotizacionPadreId" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "diasTransito" INTEGER,
ADD COLUMN     "esExoneradoAlIGV" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esExportacion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "estadoId" BIGINT NOT NULL,
ADD COLUMN     "factorExportacion" DECIMAL(18,6) NOT NULL,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaAprobacion" TIMESTAMP(3),
ADD COLUMN     "fechaArriboEstimada" TIMESTAMP(3),
ADD COLUMN     "fechaConversionPreFactura" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaDocumento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaEntregaEstimada" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaZarpeEstimada" TIMESTAMP(3),
ADD COLUMN     "margenUtilidadPorcentaje" DECIMAL(5,2),
ADD COLUMN     "metodoCalculoFactor" VARCHAR(20) NOT NULL DEFAULT 'PORCENTUAL',
ADD COLUMN     "monedaId" BIGINT NOT NULL,
ADD COLUMN     "motivoRechazo" TEXT,
ADD COLUMN     "navieraId" BIGINT,
ADD COLUMN     "numeroDocumento" VARCHAR(40),
ADD COLUMN     "observacionesInternas" TEXT,
ADD COLUMN     "paisDestinoId" BIGINT,
ADD COLUMN     "porcentajeAdelanto" DECIMAL(5,2),
ADD COLUMN     "porcentajeIGV" DECIMAL(5,2),
ADD COLUMN     "serieDocId" BIGINT,
ADD COLUMN     "tipoContenedorId" BIGINT,
ADD COLUMN     "tipoDocumentoId" BIGINT NOT NULL,
ADD COLUMN     "urlCotizacionPdf" VARCHAR(500),
ADD COLUMN     "urlDocumentacionRequeridaPdf" VARCHAR(500),
ADD COLUMN     "usuarioConversionId" BIGINT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "tipoCambio" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "contactoClienteId" DROP NOT NULL,
ALTER COLUMN "bancoId" DROP NOT NULL,
ALTER COLUMN "respEmbarqueId" DROP NOT NULL,
ALTER COLUMN "respProduccionId" DROP NOT NULL,
ALTER COLUMN "respAlmacenId" DROP NOT NULL,
ALTER COLUMN "incotermsId" DROP NOT NULL,
ALTER COLUMN "pesoMaximoContenedor" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "centroCostoId" DROP NOT NULL,
ALTER COLUMN "montoAdelantadoCliente" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "destinoProductoId" DROP NOT NULL,
ALTER COLUMN "formaTransaccionId" DROP NOT NULL,
ALTER COLUMN "modoDespachoRecepcionId" DROP NOT NULL,
ALTER COLUMN "tipoEstadoProductoId" DROP NOT NULL,
ALTER COLUMN "dirEntregaId" DROP NOT NULL,
ALTER COLUMN "dirFiscalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DetCotizacionVentas" DROP COLUMN "actualizadoEn",
DROP COLUMN "clienteId",
DROP COLUMN "creadoEn",
DROP COLUMN "empresaId",
DROP COLUMN "monedaId",
DROP COLUMN "prefacturaVentaId",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "costoUnitarioEstimado" DECIMAL(18,6),
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "descripcionAdicional" TEXT,
ADD COLUMN     "factorExportacionAplicado" DECIMAL(18,6),
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaProduccion" TIMESTAMP(3),
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3),
ADD COLUMN     "item" INTEGER NOT NULL,
ADD COLUMN     "loteProduccion" VARCHAR(50),
ADD COLUMN     "pesoNeto" DECIMAL(18,3),
ADD COLUMN     "precioUnitarioFinal" DECIMAL(18,6) NOT NULL,
ADD COLUMN     "temperaturaAlmacenamiento" VARCHAR(50),
ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "precioUnitario" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "movSalidaAlmacenId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD COLUMN     "productoId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "productoId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD COLUMN     "productoId" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendirPVentas" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "productoId" BIGINT,
ADD COLUMN     "tipoCambio" DECIMAL(18,6),
ADD COLUMN     "validadoPorId" BIGINT,
ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "monedaId" SET NOT NULL,
ALTER COLUMN "urlComprobanteMovimiento" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "urlComprobanteOperacionMovCaja" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "numeroCorrelativoComprobante" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "numeroSerieComprobante" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "DetallePreFactura" DROP COLUMN "actualizadoEn",
DROP COLUMN "igv",
DROP COLUMN "observaciones",
DROP COLUMN "porcentajeIgv",
DROP COLUMN "subtotal",
DROP COLUMN "total",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "precioUnitario" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "EntregaARendirPVentas" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "liquidadoPorId" BIGINT,
ALTER COLUMN "fechaActualizacion" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Incoterm" ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nombre" VARCHAR(100) NOT NULL,
ALTER COLUMN "descripcion" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PreFactura" DROP COLUMN "actualizadoEn",
DROP COLUMN "fechaEmision",
DROP COLUMN "precioVentaTotal",
DROP COLUMN "totalIGV",
DROP COLUMN "valorVentaTotal",
ADD COLUMN     "actualizadoPor" BIGINT,
ADD COLUMN     "cotizacionVentasOrigenId" BIGINT,
ADD COLUMN     "creadoPor" BIGINT,
ADD COLUMN     "factorExportacion" DECIMAL(18,6),
ADD COLUMN     "factorExportacionReal" DECIMAL(18,6),
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaDocumento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "formaPagoId" BIGINT NOT NULL,
ADD COLUMN     "numeroDocumento" VARCHAR(40),
ADD COLUMN     "serieDocId" BIGINT,
ADD COLUMN     "tipoDocumentoId" BIGINT NOT NULL,
ALTER COLUMN "ordenCompraCliente" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "numeroBuque" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "numeroBL" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "numContenedor" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "porcentajeIgv" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "tipoCambio" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "urlPreFacturaPdf" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "numIdTransfErpContable" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "dirEntregaId" DROP NOT NULL,
ALTER COLUMN "dirFiscalId" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."DocRequeridaComprasVentas";

-- DropTable
DROP TABLE "public"."detDocsReqCotizaVentas";

-- CreateTable
CREATE TABLE "CostoExportacionPorIncoterm" (
    "id" BIGSERIAL NOT NULL,
    "incotermId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "esResponsabilidadVendedor" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esObligatorio" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "CostoExportacionPorIncoterm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostosExportacionCotizacion" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionVentasId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "concepto" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "montoEstimado" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tipoCambioAplicado" DECIMAL(18,6),
    "montoEstimadoMonedaBase" DECIMAL(18,2) NOT NULL,
    "montoReal" DECIMAL(18,2),
    "montoRealMonedaBase" DECIMAL(18,2),
    "variacionMonto" DECIMAL(18,2),
    "variacionPorcentaje" DECIMAL(5,2),
    "movimientoEntregaRendirId" BIGINT,
    "aplicaSegunIncoterm" BOOLEAN NOT NULL DEFAULT true,
    "responsableSegunIncoterm" VARCHAR(50),
    "proveedorId" BIGINT,
    "requiereDocumento" BOOLEAN NOT NULL DEFAULT false,
    "documentoAsociadoId" BIGINT,
    "esObligatorio" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "CostosExportacionCotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetDocsReqCotizaVentas" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionVentasId" BIGINT NOT NULL,
    "docRequeridaVentasId" BIGINT NOT NULL,
    "esObligatorio" BOOLEAN NOT NULL DEFAULT true,
    "numeroDocumento" VARCHAR(100),
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "urlDocumento" VARCHAR(500),
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "fechaVerificacion" TIMESTAMP(3),
    "verificadoPorId" BIGINT,
    "observacionesVerificacion" TEXT,
    "costoDocumento" DECIMAL(18,2),
    "monedaId" BIGINT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DetDocsReqCotizaVentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocRequeridaVentas" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "aplicaPorPais" BOOLEAN NOT NULL DEFAULT false,
    "aplicaPorProducto" BOOLEAN NOT NULL DEFAULT false,
    "aplicaPorIncoterm" BOOLEAN NOT NULL DEFAULT false,
    "esObligatorioPorDefecto" BOOLEAN NOT NULL DEFAULT true,
    "tieneVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "diasValidez" INTEGER,
    "costoEstimado" DECIMAL(18,2),
    "monedaId" BIGINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DocRequeridaVentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitoDocPorPais" (
    "id" BIGSERIAL NOT NULL,
    "docRequeridaVentasId" BIGINT NOT NULL,
    "paisId" BIGINT NOT NULL,
    "tipoProductoId" BIGINT,
    "esObligatorio" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "RequisitoDocPorPais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostoExportacionPorIncoterm_incotermId_idx" ON "CostoExportacionPorIncoterm"("incotermId");

-- CreateIndex
CREATE INDEX "CostoExportacionPorIncoterm_productoId_idx" ON "CostoExportacionPorIncoterm"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "CostoExportacionPorIncoterm_incotermId_productoId_key" ON "CostoExportacionPorIncoterm"("incotermId", "productoId");

-- CreateIndex
CREATE INDEX "CostosExportacionCotizacion_cotizacionVentasId_idx" ON "CostosExportacionCotizacion"("cotizacionVentasId");

-- CreateIndex
CREATE INDEX "CostosExportacionCotizacion_productoId_idx" ON "CostosExportacionCotizacion"("productoId");

-- CreateIndex
CREATE INDEX "CostosExportacionCotizacion_movimientoEntregaRendirId_idx" ON "CostosExportacionCotizacion"("movimientoEntregaRendirId");

-- CreateIndex
CREATE INDEX "DetDocsReqCotizaVentas_cotizacionVentasId_idx" ON "DetDocsReqCotizaVentas"("cotizacionVentasId");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitoDocPorPais_docRequeridaVentasId_paisId_tipoProduct_key" ON "RequisitoDocPorPais"("docRequeridaVentasId", "paisId", "tipoProductoId");

-- CreateIndex
CREATE UNIQUE INDEX "CotizacionVentas_codigo_key" ON "CotizacionVentas"("codigo");

-- CreateIndex
CREATE INDEX "CotizacionVentas_empresaId_fechaDocumento_idx" ON "CotizacionVentas"("empresaId", "fechaDocumento");

-- CreateIndex
CREATE INDEX "CotizacionVentas_estadoId_idx" ON "CotizacionVentas"("estadoId");

-- CreateIndex
CREATE INDEX "CotizacionVentas_clienteId_idx" ON "CotizacionVentas"("clienteId");

-- CreateIndex
CREATE INDEX "CotizacionVentas_codigo_idx" ON "CotizacionVentas"("codigo");

-- CreateIndex
CREATE INDEX "DetCotizacionVentas_cotizacionVentasId_idx" ON "DetCotizacionVentas"("cotizacionVentasId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirPVentas_entregaARendirPVentasId_idx" ON "DetMovsEntregaRendirPVentas"("entregaARendirPVentasId");

-- CreateIndex
CREATE INDEX "DetMovsEntregaRendirPVentas_productoId_idx" ON "DetMovsEntregaRendirPVentas"("productoId");

-- CreateIndex
CREATE INDEX "DetallePreFactura_preFacturaId_idx" ON "DetallePreFactura"("preFacturaId");

-- CreateIndex
CREATE UNIQUE INDEX "EntregaARendirPVentas_cotizacionVentasId_key" ON "EntregaARendirPVentas"("cotizacionVentasId");

-- CreateIndex
CREATE INDEX "EntregaARendirPVentas_cotizacionVentasId_idx" ON "EntregaARendirPVentas"("cotizacionVentasId");

-- CreateIndex
CREATE INDEX "PreFactura_empresaId_fechaDocumento_idx" ON "PreFactura"("empresaId", "fechaDocumento");

-- CreateIndex
CREATE INDEX "PreFactura_clienteId_idx" ON "PreFactura"("clienteId");

-- AddForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" ADD CONSTRAINT "CostoExportacionPorIncoterm_incotermId_fkey" FOREIGN KEY ("incotermId") REFERENCES "Incoterm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoExportacionPorIncoterm" ADD CONSTRAINT "CostoExportacionPorIncoterm_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_incotermsId_fkey" FOREIGN KEY ("incotermsId") REFERENCES "Incoterm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_tipoEstadoProductoId_fkey" FOREIGN KEY ("tipoEstadoProductoId") REFERENCES "TipoEstadoProducto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_destinoProductoId_fkey" FOREIGN KEY ("destinoProductoId") REFERENCES "DestinoProducto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_formaTransaccionId_fkey" FOREIGN KEY ("formaTransaccionId") REFERENCES "FormaTransaccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_modoDespachoRecepcionId_fkey" FOREIGN KEY ("modoDespachoRecepcionId") REFERENCES "ModoDespachoRecepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_cotizacionPadreId_fkey" FOREIGN KEY ("cotizacionPadreId") REFERENCES "CotizacionVentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetCotizacionVentas" ADD CONSTRAINT "DetCotizacionVentas_cotizacionVentasId_fkey" FOREIGN KEY ("cotizacionVentasId") REFERENCES "CotizacionVentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostosExportacionCotizacion" ADD CONSTRAINT "CostosExportacionCotizacion_cotizacionVentasId_fkey" FOREIGN KEY ("cotizacionVentasId") REFERENCES "CotizacionVentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostosExportacionCotizacion" ADD CONSTRAINT "CostosExportacionCotizacion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostosExportacionCotizacion" ADD CONSTRAINT "CostosExportacionCotizacion_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostosExportacionCotizacion" ADD CONSTRAINT "CostosExportacionCotizacion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostosExportacionCotizacion" ADD CONSTRAINT "CostosExportacionCotizacion_movimientoEntregaRendirId_fkey" FOREIGN KEY ("movimientoEntregaRendirId") REFERENCES "DetMovsEntregaRendirPVentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetDocsReqCotizaVentas" ADD CONSTRAINT "DetDocsReqCotizaVentas_cotizacionVentasId_fkey" FOREIGN KEY ("cotizacionVentasId") REFERENCES "CotizacionVentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetDocsReqCotizaVentas" ADD CONSTRAINT "DetDocsReqCotizaVentas_docRequeridaVentasId_fkey" FOREIGN KEY ("docRequeridaVentasId") REFERENCES "DocRequeridaVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocRequeridaVentas" ADD CONSTRAINT "DocRequeridaVentas_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitoDocPorPais" ADD CONSTRAINT "RequisitoDocPorPais_docRequeridaVentasId_fkey" FOREIGN KEY ("docRequeridaVentasId") REFERENCES "DocRequeridaVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitoDocPorPais" ADD CONSTRAINT "RequisitoDocPorPais_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitoDocPorPais" ADD CONSTRAINT "RequisitoDocPorPais_tipoProductoId_fkey" FOREIGN KEY ("tipoProductoId") REFERENCES "TipoProducto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_entregaARendirPVentasId_fkey" FOREIGN KEY ("entregaARendirPVentasId") REFERENCES "EntregaARendirPVentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPVentas" ADD CONSTRAINT "DetMovsEntregaRendirPVentas_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePreFactura" ADD CONSTRAINT "DetallePreFactura_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntRendirPescaConsumo" ADD CONSTRAINT "DetMovsEntRendirPescaConsumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendirPCompras" ADD CONSTRAINT "DetMovsEntregaRendirPCompras_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
