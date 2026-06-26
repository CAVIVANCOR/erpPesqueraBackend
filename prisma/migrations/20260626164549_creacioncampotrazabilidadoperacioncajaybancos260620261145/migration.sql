-- AlterTable
ALTER TABLE "CentroCosto" ALTER COLUMN "ParentCentroID" SET DATA TYPE VARCHAR(80);

-- AlterTable
ALTER TABLE "CuotaPrestamo" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;

-- AlterTable
ALTER TABLE "DetMovsEntregaRendir" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "ultimoCorrelativoOperacionCaja" BIGINT DEFAULT 0;

-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;

-- AlterTable
ALTER TABLE "PagoCuentaPorCobrar" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;

-- AlterTable
ALTER TABLE "PagoCuentaPorPagar" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;

-- AlterTable
ALTER TABLE "PagoDeudaPersonal" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;

-- AlterTable
ALTER TABLE "PagoDeudaTributaria" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;

-- AlterTable
ALTER TABLE "PagoLetraCambio" ADD COLUMN     "refOperacionEspecializadaMovCaja" BIGINT;
