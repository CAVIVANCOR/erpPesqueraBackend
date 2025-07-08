-- CreateTable
CREATE TABLE "EntregaARendir" (
    "id" BIGSERIAL NOT NULL,
    "temporadaPescaId" BIGINT NOT NULL,
    "bahiaId" BIGINT NOT NULL,
    "entregaLiquidada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLiquidacion" TIMESTAMP(3),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntregaARendir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetMovsEntregaRendir" (
    "id" BIGSERIAL NOT NULL,
    "entregaARendirId" BIGINT NOT NULL,
    "responsableId" BIGINT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL,
    "tipoMovimientoId" BIGINT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetMovsEntregaRendir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoMovEntregaRendir" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esIngreso" BOOLEAN NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoMovEntregaRendir_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EntregaARendir" ADD CONSTRAINT "EntregaARendir_temporadaPescaId_fkey" FOREIGN KEY ("temporadaPescaId") REFERENCES "TemporadaPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_entregaARendirId_fkey" FOREIGN KEY ("entregaARendirId") REFERENCES "EntregaARendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetMovsEntregaRendir" ADD CONSTRAINT "DetMovsEntregaRendir_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovEntregaRendir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
