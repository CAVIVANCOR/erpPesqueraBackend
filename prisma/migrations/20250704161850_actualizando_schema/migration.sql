/*
  Warnings:

  - You are about to drop the column `archivoUrl` on the `DetAccionesPreviasFaena` table. All the data in the column will be lost.
  - You are about to drop the column `archivoUrl` on the `DetalleDocEmbarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `archivoUrl` on the `DetalleDocTripulantes` table. All the data in the column will be lost.
  - You are about to drop the column `fotoUrl` on the `Personal` table. All the data in the column will be lost.
  - You are about to drop the column `resolucionPdfUrl` on the `TemporadaPesca` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DetAccionesPreviasFaena" DROP COLUMN "archivoUrl",
ADD COLUMN     "urlConfirmaAccionPdf" TEXT;

-- AlterTable
ALTER TABLE "DetalleDocEmbarcacion" DROP COLUMN "archivoUrl",
ADD COLUMN     "urlDocEmbarcacio" TEXT;

-- AlterTable
ALTER TABLE "DetalleDocTripulantes" DROP COLUMN "archivoUrl",
ADD COLUMN     "urlDocTripulantePdf" TEXT;

-- AlterTable
ALTER TABLE "Personal" DROP COLUMN "fotoUrl",
ADD COLUMN     "urlFotoPersona" TEXT;

-- AlterTable
ALTER TABLE "TemporadaPesca" DROP COLUMN "resolucionPdfUrl",
ADD COLUMN     "urlResolucionPdf" TEXT;

-- CreateTable
CREATE TABLE "DetallePermisoActivo" (
    "id" BIGSERIAL NOT NULL,
    "activoId" BIGINT NOT NULL,
    "permisoId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DetallePermisoActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermisoAutorizacion" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PermisoAutorizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KardexAlmacen" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "almacenId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "clienteId" BIGINT,
    "custodia" BOOLEAN NOT NULL DEFAULT false,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "ingreso" BOOLEAN NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "conceptoMovAlmacenId" BIGINT NOT NULL,
    "documentoId" BIGINT,
    "detalleId" BIGINT,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "peso" DECIMAL(65,30),
    "lote" VARCHAR(40),
    "fechaVencimiento" TIMESTAMP(3),
    "fechaProduccion" TIMESTAMP(3),
    "fechaIngreso" TIMESTAMP(3),
    "numContenedor" VARCHAR(40),
    "nroSerie" VARCHAR(40),
    "paletaAlmacenId" BIGINT,
    "ubicacionId" BIGINT,
    "estadoId" BIGINT,
    "saldoCantidad" DECIMAL(65,30) NOT NULL,
    "saldoPeso" DECIMAL(65,30),
    "costoUnitarioPromedio" DECIMAL(65,30),
    "costoSaldoPromedio" DECIMAL(65,30),
    "saldoDetCantidad" DECIMAL(65,30),
    "saldoDetPeso" DECIMAL(65,30),
    "costoUnitario" DECIMAL(65,30),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KardexAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldosProductoCliente" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "almacenId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "clienteId" BIGINT,
    "custodia" BOOLEAN NOT NULL DEFAULT false,
    "saldoCantidad" DECIMAL(65,30) NOT NULL,
    "saldoPeso" DECIMAL(65,30),
    "costoUnitarioPromedio" DECIMAL(65,30),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaldosProductoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldosDetProductoCliente" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "almacenId" BIGINT NOT NULL,
    "productoId" BIGINT NOT NULL,
    "clienteId" BIGINT,
    "custodia" BOOLEAN NOT NULL DEFAULT false,
    "lote" VARCHAR(40),
    "fechaVencimiento" TIMESTAMP(3),
    "fechaProduccion" TIMESTAMP(3),
    "fechaIngreso" TIMESTAMP(3),
    "numContenedor" VARCHAR(40),
    "nroSerie" VARCHAR(40),
    "paletaAlmacenId" BIGINT,
    "ubicacionId" BIGINT,
    "estadoId" BIGINT,
    "saldoCantidad" DECIMAL(65,30) NOT NULL,
    "saldoPeso" DECIMAL(65,30),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaldosDetProductoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTMantenimiento" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "sedeId" BIGINT,
    "activoId" BIGINT,
    "FaenaPescaId" BIGINT,
    "tipoMantenimientoId" BIGINT NOT NULL,
    "motivoOriginoId" BIGINT NOT NULL,
    "prioridadAlta" BOOLEAN NOT NULL DEFAULT false,
    "estadoId" BIGINT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaProgramada" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "solicitanteId" BIGINT,
    "responsableId" BIGINT,
    "autorizadoPorId" BIGINT,
    "descripcion" TEXT,
    "causa" TEXT,
    "solucion" TEXT,
    "observaciones" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "urlOTPdf" TEXT,

    CONSTRAINT "OTMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoMantenimiento" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "descripcion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivoOriginoOT" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "descripcion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MotivoOriginoOT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetPermisoGestionadoOT" (
    "id" BIGSERIAL NOT NULL,
    "otMantenimientoId" BIGINT NOT NULL,
    "permisoId" BIGINT NOT NULL,
    "gestionado" BOOLEAN NOT NULL DEFAULT false,
    "fechaGestion" TIMESTAMP(3),
    "observaciones" TEXT,

    CONSTRAINT "DetPermisoGestionadoOT_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DetallePermisoActivo_activoId_permisoId_key" ON "DetallePermisoActivo"("activoId", "permisoId");

-- CreateIndex
CREATE UNIQUE INDEX "PermisoAutorizacion_nombre_key" ON "PermisoAutorizacion"("nombre");

-- CreateIndex
CREATE INDEX "KardexAlmacen_empresaId_clienteId_productoId_custodia_idx" ON "KardexAlmacen"("empresaId", "clienteId", "productoId", "custodia");

-- CreateIndex
CREATE INDEX "KardexAlmacen_empresaId_clienteId_productoId_custodia_lote__idx" ON "KardexAlmacen"("empresaId", "clienteId", "productoId", "custodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "paletaAlmacenId", "ubicacionId", "estadoId", "numContenedor", "nroSerie");

-- CreateIndex
CREATE INDEX "KardexAlmacen_productoId_idx" ON "KardexAlmacen"("productoId");

-- CreateIndex
CREATE INDEX "KardexAlmacen_clienteId_idx" ON "KardexAlmacen"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "SaldosProductoCliente_empresaId_almacenId_productoId_client_key" ON "SaldosProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "custodia");

-- CreateIndex
CREATE UNIQUE INDEX "SaldosDetProductoCliente_empresaId_almacenId_productoId_cli_key" ON "SaldosDetProductoCliente"("empresaId", "almacenId", "productoId", "clienteId", "custodia", "lote", "fechaIngreso", "fechaProduccion", "fechaVencimiento", "paletaAlmacenId", "ubicacionId", "estadoId", "numContenedor", "nroSerie");

-- CreateIndex
CREATE UNIQUE INDEX "OTMantenimiento_codigo_key" ON "OTMantenimiento"("codigo");

-- AddForeignKey
ALTER TABLE "DetallePermisoActivo" ADD CONSTRAINT "DetallePermisoActivo_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePermisoActivo" ADD CONSTRAINT "DetallePermisoActivo_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "PermisoAutorizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KardexAlmacen" ADD CONSTRAINT "KardexAlmacen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KardexAlmacen" ADD CONSTRAINT "KardexAlmacen_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_tipoMantenimientoId_fkey" FOREIGN KEY ("tipoMantenimientoId") REFERENCES "TipoMantenimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTMantenimiento" ADD CONSTRAINT "OTMantenimiento_motivoOriginoId_fkey" FOREIGN KEY ("motivoOriginoId") REFERENCES "MotivoOriginoOT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetPermisoGestionadoOT" ADD CONSTRAINT "DetPermisoGestionadoOT_otMantenimientoId_fkey" FOREIGN KEY ("otMantenimientoId") REFERENCES "OTMantenimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
