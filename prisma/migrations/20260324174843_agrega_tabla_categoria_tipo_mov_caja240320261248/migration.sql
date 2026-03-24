-- AlterTable
ALTER TABLE "TipoMovEntregaRendir" ADD COLUMN     "categoriaId" BIGINT;

-- CreateTable
CREATE TABLE "CategoriaTipoMovEntregaRendir" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(255),
    "cesado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3),
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "CategoriaTipoMovEntregaRendir_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TipoMovEntregaRendir" ADD CONSTRAINT "TipoMovEntregaRendir_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaTipoMovEntregaRendir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaTipoMovEntregaRendir" ADD CONSTRAINT "CategoriaTipoMovEntregaRendir_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaTipoMovEntregaRendir" ADD CONSTRAINT "CategoriaTipoMovEntregaRendir_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
