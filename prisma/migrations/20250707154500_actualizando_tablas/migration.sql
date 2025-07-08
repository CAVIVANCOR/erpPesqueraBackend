-- CreateTable
CREATE TABLE "CotizacionVentas" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoProductoId" BIGINT NOT NULL,
    "tipoVentaId" BIGINT NOT NULL,
    "destinoVentaId" BIGINT NOT NULL,
    "formaVentaId" BIGINT NOT NULL,
    "respVentasId" BIGINT NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "autorizaVentaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(65,30) NOT NULL,
    "contactoClienteId" BIGINT NOT NULL,
    "direccionDestinoClienteId" BIGINT NOT NULL,
    "clienteId" BIGINT NOT NULL,
    "bancoId" BIGINT NOT NULL,
    "formaPagoId" BIGINT NOT NULL,
    "respEmbarqueId" BIGINT NOT NULL,
    "respProduccionId" BIGINT NOT NULL,
    "respAlmacenId" BIGINT NOT NULL,
    "incotermsId" BIGINT NOT NULL,
    "idPaisDestino" BIGINT NOT NULL,
    "pesoMaximoContenedor" DECIMAL(65,30),
    "fechaZarpe" TIMESTAMP(3),
    "fechaArribo" TIMESTAMP(3),
    "agenteAduanasId" BIGINT,
    "operadorLogisticoId" BIGINT,
    "movSalidaAlmacenId" BIGINT NOT NULL,
    "generoSalidaAlmacenId" BIGINT NOT NULL,
    "fechaGeneroSalidaAlmacen" TIMESTAMP(3) NOT NULL,
    "prefacturaVentaId" BIGINT,
    "generoPrefacturaVentaId" BIGINT,
    "fechaGeneroPrefacturaVenta" TIMESTAMP(3),
    "supervisorVentaCampoId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionVentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetCotizacionVentas" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "cotizacionVentasId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "clienteId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "movSalidaAlmacenId" BIGINT NOT NULL,
    "prefacturaVentaId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetCotizacionVentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoProducto" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoVenta" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoVenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinoVenta" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DestinoVenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaVenta" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FormaVenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocRequeridaVentas" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "tipoProductoId" BIGINT NOT NULL,
    "tipoVentaId" BIGINT NOT NULL,
    "destinoVentaId" BIGINT NOT NULL,
    "formaVentaId" BIGINT NOT NULL,

    CONSTRAINT "DocRequeridaVentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detDocsReqCotizaVentas" (
    "id" BIGSERIAL NOT NULL,
    "cotizacionVentasId" BIGINT NOT NULL,
    "docRequeridaVentasId" BIGINT NOT NULL,
    "numeroDocumento" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "urlDocumento" TEXT,
    "observaciones" TEXT,
    "verificado" BOOLEAN NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detDocsReqCotizaVentas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoProducto_nombre_key" ON "TipoProducto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoVenta_nombre_key" ON "TipoVenta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "DestinoVenta_nombre_key" ON "DestinoVenta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FormaVenta_nombre_key" ON "FormaVenta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "DocRequeridaVentas_nombre_key" ON "DocRequeridaVentas"("nombre");

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_tipoProductoId_fkey" FOREIGN KEY ("tipoProductoId") REFERENCES "TipoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_tipoVentaId_fkey" FOREIGN KEY ("tipoVentaId") REFERENCES "TipoVenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_destinoVentaId_fkey" FOREIGN KEY ("destinoVentaId") REFERENCES "DestinoVenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionVentas" ADD CONSTRAINT "CotizacionVentas_formaVentaId_fkey" FOREIGN KEY ("formaVentaId") REFERENCES "FormaVenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetCotizacionVentas" ADD CONSTRAINT "DetCotizacionVentas_cotizacionVentasId_fkey" FOREIGN KEY ("cotizacionVentasId") REFERENCES "CotizacionVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detDocsReqCotizaVentas" ADD CONSTRAINT "detDocsReqCotizaVentas_cotizacionVentasId_fkey" FOREIGN KEY ("cotizacionVentasId") REFERENCES "CotizacionVentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
