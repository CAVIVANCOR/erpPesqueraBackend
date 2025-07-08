-- CreateTable
CREATE TABLE "MovimientoAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "conceptoMovAlmacenId" BIGINT NOT NULL,
    "serieDocId" BIGINT,
    "numSerieDoc" VARCHAR(40),
    "numCorreDoc" VARCHAR(40),
    "numeroDocumento" TEXT,
    "fechaDocumento" TIMESTAMP(3) NOT NULL,
    "entidadComercialId" BIGINT,
    "liquidacionViajeId" BIGINT,
    "faenaPescaId" BIGINT,
    "embarcacionId" BIGINT,
    "ordenTrabajoId" BIGINT,
    "dirOrigenId" BIGINT,
    "dirDestinoId" BIGINT,
    "numGuiaSunat" VARCHAR(40),
    "fechaGuiaSunat" TIMESTAMP(3),
    "transportistaId" BIGINT,
    "vehiculoId" BIGINT,
    "choferId" BIGINT,
    "agenciaEnvioId" BIGINT,
    "dirAgenciaEnvioId" BIGINT,
    "personalRespAlmacen" BIGINT,
    "ordenCompraId" BIGINT,
    "pedidoVentaId" BIGINT,
    "estadoDocAlmacenId" BIGINT,
    "refEmbarcacionMatricula" VARCHAR(40),
    "refEmbarcacionNombre" VARCHAR(100),
    "refEmbarcacionNroPlaca" VARCHAR(40),
    "custodia" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "MovimientoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleMovimientoAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "movimientoAlmacenId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "pesoNeto" DECIMAL(65,30),
    "lote" VARCHAR(40),
    "fechaProduccion" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "fechaIngreso" TIMESTAMP(3),
    "nroSerie" VARCHAR(40),
    "nroContenedor" VARCHAR(40),
    "ubicacionOrigenId" BIGINT,
    "ubicacionDestinoId" BIGINT,
    "paletaAlmacenId" BIGINT,
    "estadoMercaderiaId" BIGINT,
    "estadoCalidadId" BIGINT,
    "entidadComercialId" BIGINT,
    "custodia" BOOLEAN NOT NULL DEFAULT false,
    "empresaId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DetalleMovimientoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoDocumento" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "codigoSunat" VARCHAR(10),
    "descripcion" TEXT,
    "moduloId" BIGINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoMovAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" VARCHAR(100) NOT NULL,
    "almacenOrigenId" BIGINT,
    "almacenDestinoId" BIGINT,
    "kardexOrigen" BOOLEAN NOT NULL DEFAULT false,
    "kardexDestino" BOOLEAN NOT NULL DEFAULT false,
    "custodia" BOOLEAN NOT NULL DEFAULT false,
    "tipoConceptoId" BIGINT NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "tipoAlmacenId" BIGINT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConceptoMovAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoConcepto" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoConcepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoMovimientoAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoMovimientoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerieDoc" (
    "id" BIGSERIAL NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "tipoAlmacenId" BIGINT NOT NULL,
    "serie" VARCHAR(20) NOT NULL,
    "correlativo" BIGINT NOT NULL DEFAULT 0,
    "numCerosIzqCorre" INTEGER NOT NULL DEFAULT 0,
    "numCerosIzqSerie" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SerieDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id_producto" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "descripcion_base" VARCHAR(120) NOT NULL,
    "descripcion_extendida" TEXT,
    "descripcion_armada" TEXT,
    "id_familia" BIGINT NOT NULL,
    "id_subfamilia" BIGINT,
    "unidad_medida_id" BIGINT NOT NULL,
    "id_tipo_almacenamiento" BIGINT,
    "id_procedencia" BIGINT,
    "id_marca" BIGINT,
    "id_estado_inicial" BIGINT,
    "exonerado_igv" BOOLEAN NOT NULL DEFAULT false,
    "porcentaje_detraccion" DECIMAL(65,30),
    "id_cliente" BIGINT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "id_tipo_material" BIGINT,
    "id_color" BIGINT,
    "diametro" DECIMAL(65,30),
    "id_unidad_diametro" BIGINT,
    "ancho" DECIMAL(65,30),
    "id_unidad_ancho" BIGINT,
    "alto" DECIMAL(65,30),
    "id_unidad_alto" BIGINT,
    "largo" DECIMAL(65,30),
    "id_unidad_largo" BIGINT,
    "espesor" DECIMAL(65,30),
    "id_unidad_espesor" BIGINT,
    "angulo" DECIMAL(65,30),
    "id_unidad_angulo" BIGINT,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "FamiliaProducto" (
    "id_familia" BIGSERIAL NOT NULL,
    "descripcion_base" VARCHAR(120) NOT NULL,
    "descripcion_extendida" TEXT,
    "descripcion_armada" TEXT,
    "estado" VARCHAR(20) NOT NULL,

    CONSTRAINT "FamiliaProducto_pkey" PRIMARY KEY ("id_familia")
);

-- CreateTable
CREATE TABLE "SubfamiliaProducto" (
    "id_subfamilia" BIGSERIAL NOT NULL,
    "id_familia" BIGINT NOT NULL,
    "descripcion_base" VARCHAR(120) NOT NULL,
    "descripcion_extendida" TEXT,
    "descripcion_armada" TEXT,
    "estado" VARCHAR(20) NOT NULL,

    CONSTRAINT "SubfamiliaProducto_pkey" PRIMARY KEY ("id_subfamilia")
);

-- CreateTable
CREATE TABLE "UnidadMedida" (
    "id_unidad_medida" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "simbolo" VARCHAR(20) NOT NULL,
    "descripcion" TEXT,
    "unidad_base_id" BIGINT,
    "factor_conversion" DECIMAL(65,30),

    CONSTRAINT "UnidadMedida_pkey" PRIMARY KEY ("id_unidad_medida")
);

-- CreateTable
CREATE TABLE "TipoMaterial" (
    "id_tipo_material" BIGSERIAL NOT NULL,
    "descripcion_base" VARCHAR(80) NOT NULL,
    "descripcion_extendida" TEXT,
    "descripcion_armada" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoMaterial_pkey" PRIMARY KEY ("id_tipo_material")
);

-- CreateTable
CREATE TABLE "Color" (
    "id_color" BIGSERIAL NOT NULL,
    "descripcion_base" VARCHAR(80) NOT NULL,
    "descripcion_extendida" TEXT,
    "descripcion_armada" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id_color")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoDocumento_codigo_key" ON "TipoDocumento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_conceptoMovAlmacenId_fkey" FOREIGN KEY ("conceptoMovAlmacenId") REFERENCES "ConceptoMovAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_movimientoAlmacenId_fkey" FOREIGN KEY ("movimientoAlmacenId") REFERENCES "MovimientoAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMovimientoAlmacen" ADD CONSTRAINT "DetalleMovimientoAlmacen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoMovAlmacen" ADD CONSTRAINT "ConceptoMovAlmacen_tipoConceptoId_fkey" FOREIGN KEY ("tipoConceptoId") REFERENCES "TipoConcepto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoMovAlmacen" ADD CONSTRAINT "ConceptoMovAlmacen_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovimientoAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoMovAlmacen" ADD CONSTRAINT "ConceptoMovAlmacen_tipoAlmacenId_fkey" FOREIGN KEY ("tipoAlmacenId") REFERENCES "TipoAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_id_familia_fkey" FOREIGN KEY ("id_familia") REFERENCES "FamiliaProducto"("id_familia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_id_subfamilia_fkey" FOREIGN KEY ("id_subfamilia") REFERENCES "SubfamiliaProducto"("id_subfamilia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "UnidadMedida"("id_unidad_medida") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_id_tipo_material_fkey" FOREIGN KEY ("id_tipo_material") REFERENCES "TipoMaterial"("id_tipo_material") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_id_color_fkey" FOREIGN KEY ("id_color") REFERENCES "Color"("id_color") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadMedida" ADD CONSTRAINT "UnidadMedida_unidad_base_id_fkey" FOREIGN KEY ("unidad_base_id") REFERENCES "UnidadMedida"("id_unidad_medida") ON DELETE SET NULL ON UPDATE CASCADE;
