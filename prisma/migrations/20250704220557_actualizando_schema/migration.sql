-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "cuentaDetraccion" TEXT,
ADD COLUMN     "montoMinimoRetencion" DOUBLE PRECISION,
ADD COLUMN     "porcentajeRetencion" DOUBLE PRECISION,
ADD COLUMN     "soyAgentePercepcion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "soyAgenteRetencion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "AplicaDetraccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aplicaRetencion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cuentaDetraccion" TEXT,
ADD COLUMN     "montoDetraccion" DECIMAL(65,30),
ADD COLUMN     "montoRetencion" DECIMAL(65,30),
ADD COLUMN     "porcentajeDetraccion" DECIMAL(65,30),
ADD COLUMN     "porcentajeRetencion" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "exoneradoRetencion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sujetoDetraccion" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PreFactura" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "clienteId" BIGINT NOT NULL,
    "ordenCompraCliente" TEXT,
    "movSalidaAlmacenId" BIGINT,
    "esExportacion" BOOLEAN NOT NULL DEFAULT false,
    "paisDestinoId" BIGINT,
    "puertoCargaId" BIGINT,
    "puertoDescargaId" BIGINT,
    "incotermId" BIGINT,
    "agenteAduanaId" BIGINT,
    "bancoId" BIGINT,
    "numeroBuque" TEXT,
    "numeroBL" TEXT,
    "numContenedor" TEXT,
    "exoneradoIgv" BOOLEAN NOT NULL DEFAULT false,
    "porcentajeIgv" DECIMAL(65,30),
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "estadoId" BIGINT NOT NULL,
    "monedaId" BIGINT,
    "tipoCambio" DECIMAL(65,30),
    "subtotal" DECIMAL(65,30),
    "igv" DECIMAL(65,30),
    "total" DECIMAL(65,30),
    "observaciones" TEXT,
    "urlPreFacturaPdf" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreFactura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banco" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigoSwift" TEXT,
    "codigoBcrp" TEXT,
    "paisId" BIGINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Banco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incoterm" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Incoterm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetallePreFactura" (
    "id" BIGSERIAL NOT NULL,
    "preFacturaId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(65,30),
    "subtotal" DECIMAL(65,30),
    "porcentajeIgv" DECIMAL(65,30),
    "igv" DECIMAL(65,30),
    "total" DECIMAL(65,30),
    "observaciones" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetallePreFactura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreFactura_codigo_key" ON "PreFactura"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Incoterm_codigo_key" ON "Incoterm"("codigo");

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_movSalidaAlmacenId_fkey" FOREIGN KEY ("movSalidaAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_incotermId_fkey" FOREIGN KEY ("incotermId") REFERENCES "Incoterm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePreFactura" ADD CONSTRAINT "DetallePreFactura_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePreFactura" ADD CONSTRAINT "DetallePreFactura_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
