-- CreateTable
CREATE TABLE "AccesoInstalacion" (
    "id" BIGSERIAL NOT NULL,
    "sedeId" BIGINT NOT NULL,
    "areaDestinoVisitaId" BIGINT,
    "empresaId" BIGINT,
    "tipoAccesoId" BIGINT NOT NULL,
    "vehiculoId" BIGINT,
    "tipoPersonaId" BIGINT,
    "motivoId" BIGINT,
    "tipoEquipoId" BIGINT,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "nombrePersona" TEXT,
    "tipoDocIdentidadId" BIGINT,
    "numeroDocumento" TEXT,
    "vehiculoNroPlaca" TEXT,
    "vehiculoMarca" TEXT,
    "equipoMarca" TEXT,
    "equipoSerie" TEXT,
    "personaFirmaDestinoVisitaId" BIGINT,
    "nombreDestinoVisita" TEXT,
    "observaciones" TEXT,
    "incidenteResaltante" BOOLEAN NOT NULL DEFAULT false,
    "descripcionIncidente" TEXT,
    "imprimeTicketIng" BOOLEAN NOT NULL DEFAULT true,
    "urlImpresionTicket" TEXT,
    "urlDocumentoVisitante" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesoInstalacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoEquipo" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesoInstalacionDetalle" (
    "id" BIGSERIAL NOT NULL,
    "accesoInstalacionId" BIGINT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "areaDestinoVisitaId" BIGINT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesoInstalacionDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoMovimientoAcceso" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoMovimientoAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAccesoInstalacion" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoAccesoInstalacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoPersona" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivoAcceso" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MotivoAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoEquipo_nombre_key" ON "TipoEquipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoMovimientoAcceso_nombre_key" ON "TipoMovimientoAcceso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAccesoInstalacion_nombre_key" ON "TipoAccesoInstalacion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoPersona_nombre_key" ON "TipoPersona"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "MotivoAcceso_nombre_key" ON "MotivoAcceso"("nombre");

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_tipoAccesoId_fkey" FOREIGN KEY ("tipoAccesoId") REFERENCES "TipoAccesoInstalacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_tipoPersonaId_fkey" FOREIGN KEY ("tipoPersonaId") REFERENCES "TipoPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "MotivoAcceso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_tipoEquipoId_fkey" FOREIGN KEY ("tipoEquipoId") REFERENCES "TipoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacionDetalle" ADD CONSTRAINT "AccesoInstalacionDetalle_accesoInstalacionId_fkey" FOREIGN KEY ("accesoInstalacionId") REFERENCES "AccesoInstalacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacionDetalle" ADD CONSTRAINT "AccesoInstalacionDetalle_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovimientoAcceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
