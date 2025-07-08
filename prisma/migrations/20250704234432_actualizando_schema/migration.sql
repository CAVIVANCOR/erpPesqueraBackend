-- AlterTable
ALTER TABLE "PreFactura" ADD COLUMN     "fechaTransfErpContable" TIMESTAMP(3),
ADD COLUMN     "numIdTransfErpContable" TEXT,
ADD COLUMN     "personaRespTransfErpContable" BIGINT;

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" BIGSERIAL NOT NULL,
    "empresaOrigenId" BIGINT NOT NULL,
    "cuentaBancariaOrigenId" BIGINT NOT NULL,
    "empresaDestinoId" BIGINT,
    "cuentaBancariaDestinoId" BIGINT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoMovimientoId" BIGINT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "descripcion" TEXT,
    "referenciaExtId" TEXT,
    "tipoReferenciaId" BIGINT,
    "usuarioId" BIGINT,
    "estadoId" BIGINT NOT NULL,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoReferenciaMovimientoCaja" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoReferenciaMovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsientoContableInterfaz" (
    "id" BIGSERIAL NOT NULL,
    "movimientoCajaId" BIGINT NOT NULL,
    "fechaContable" TIMESTAMP(3) NOT NULL,
    "cuentaContable" TEXT NOT NULL,
    "descripcion" TEXT,
    "debe" DECIMAL(65,30) NOT NULL,
    "haber" DECIMAL(65,30) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "referenciaExtId" TEXT,
    "tipoReferenciaId" BIGINT,
    "estado" TEXT NOT NULL,
    "fechaEnvio" TIMESTAMP(3),

    CONSTRAINT "AsientoContableInterfaz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoReferenciaMovimientoCaja_codigo_key" ON "TipoReferenciaMovimientoCaja"("codigo");

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_tipoReferenciaId_fkey" FOREIGN KEY ("tipoReferenciaId") REFERENCES "TipoReferenciaMovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
