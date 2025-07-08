-- CreateTable
CREATE TABLE "AccesosUsuario" (
    "id" BIGSERIAL NOT NULL,
    "usuarioId" BIGINT NOT NULL,
    "submoduloId" BIGINT NOT NULL,
    "puedeVer" BOOLEAN NOT NULL DEFAULT true,
    "puedeCrear" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,
    "puedeEliminar" BOOLEAN NOT NULL DEFAULT false,
    "fechaOtorgado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesosUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuloSistema" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER,

    CONSTRAINT "ModuloSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmoduloSistema" (
    "id" BIGSERIAL NOT NULL,
    "moduloId" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "ruta" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER,

    CONSTRAINT "SubmoduloSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuloSistema_nombre_key" ON "ModuloSistema"("nombre");

-- AddForeignKey
ALTER TABLE "AccesosUsuario" ADD CONSTRAINT "AccesosUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesosUsuario" ADD CONSTRAINT "AccesosUsuario_submoduloId_fkey" FOREIGN KEY ("submoduloId") REFERENCES "SubmoduloSistema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmoduloSistema" ADD CONSTRAINT "SubmoduloSistema_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloSistema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
