-- AlterTable
ALTER TABLE "TipoDeudaPersonal" ADD COLUMN     "categoriaId" BIGINT;

-- AlterTable
ALTER TABLE "TipoDeudaTributaria" ADD COLUMN     "categoriaId" BIGINT;

-- CreateTable
CREATE TABLE "CategoriaTipoDeudaPersonal" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "CategoriaTipoDeudaPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaTipoDeudaTributaria" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "CategoriaTipoDeudaTributaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoriaTipoDeudaPersonal_activo_idx" ON "CategoriaTipoDeudaPersonal"("activo");

-- CreateIndex
CREATE INDEX "CategoriaTipoDeudaTributaria_activo_idx" ON "CategoriaTipoDeudaTributaria"("activo");

-- CreateIndex
CREATE INDEX "TipoDeudaPersonal_categoriaId_idx" ON "TipoDeudaPersonal"("categoriaId");

-- CreateIndex
CREATE INDEX "TipoDeudaPersonal_activo_idx" ON "TipoDeudaPersonal"("activo");

-- CreateIndex
CREATE INDEX "TipoDeudaTributaria_categoriaId_idx" ON "TipoDeudaTributaria"("categoriaId");

-- CreateIndex
CREATE INDEX "TipoDeudaTributaria_activo_idx" ON "TipoDeudaTributaria"("activo");

-- AddForeignKey
ALTER TABLE "TipoDeudaPersonal" ADD CONSTRAINT "TipoDeudaPersonal_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaTipoDeudaPersonal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoDeudaTributaria" ADD CONSTRAINT "TipoDeudaTributaria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaTipoDeudaTributaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
