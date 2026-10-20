-- AlterTable
ALTER TABLE "LetraCambio" ADD COLUMN     "fechaLimiteProtesto" TIMESTAMP(3),
ADD COLUMN     "fechaRefinanciacion" TIMESTAMP(3),
ADD COLUMN     "interesPagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "moraPagada" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "saldoCapital" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PagoLetraCambio" ADD COLUMN     "fechaContable" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "montoCapital" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoInteres" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoMora" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "periodoContableId" BIGINT,
ADD COLUMN     "tipoCambio" DECIMAL(10,4);

-- CreateTable
CREATE TABLE "LetraCambioDocumento" (
    "id" BIGSERIAL NOT NULL,
    "letraCambioId" BIGINT NOT NULL,
    "cuentaPorPagarId" BIGINT,
    "cuentaPorCobrarId" BIGINT,
    "montoCanjeado" DECIMAL(18,2) NOT NULL,
    "capitalPagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pagoCanjeCxPId" BIGINT,
    "pagoCanjeCxCId" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,

    CONSTRAINT "LetraCambioDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LetraCambioDocumento_pagoCanjeCxPId_key" ON "LetraCambioDocumento"("pagoCanjeCxPId");

-- CreateIndex
CREATE UNIQUE INDEX "LetraCambioDocumento_pagoCanjeCxCId_key" ON "LetraCambioDocumento"("pagoCanjeCxCId");

-- CreateIndex
CREATE INDEX "LetraCambioDocumento_letraCambioId_idx" ON "LetraCambioDocumento"("letraCambioId");

-- CreateIndex
CREATE INDEX "LetraCambioDocumento_cuentaPorPagarId_idx" ON "LetraCambioDocumento"("cuentaPorPagarId");

-- CreateIndex
CREATE INDEX "LetraCambioDocumento_cuentaPorCobrarId_idx" ON "LetraCambioDocumento"("cuentaPorCobrarId");

-- CreateIndex
CREATE INDEX "LetraCambio_letraRenovadaId_idx" ON "LetraCambio"("letraRenovadaId");

-- CreateIndex
CREATE INDEX "LetraCambio_fechaLimiteProtesto_idx" ON "LetraCambio"("fechaLimiteProtesto");

-- CreateIndex
CREATE INDEX "PagoLetraCambio_refOperacionEspecializadaMovCaja_idx" ON "PagoLetraCambio"("refOperacionEspecializadaMovCaja");

-- AddForeignKey
ALTER TABLE "LetraCambioDocumento" ADD CONSTRAINT "LetraCambioDocumento_letraCambioId_fkey" FOREIGN KEY ("letraCambioId") REFERENCES "LetraCambio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambioDocumento" ADD CONSTRAINT "LetraCambioDocumento_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambioDocumento" ADD CONSTRAINT "LetraCambioDocumento_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambioDocumento" ADD CONSTRAINT "LetraCambioDocumento_pagoCanjeCxPId_fkey" FOREIGN KEY ("pagoCanjeCxPId") REFERENCES "PagoCuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambioDocumento" ADD CONSTRAINT "LetraCambioDocumento_pagoCanjeCxCId_fkey" FOREIGN KEY ("pagoCanjeCxCId") REFERENCES "PagoCuentaPorCobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLetraCambio" ADD CONSTRAINT "PagoLetraCambio_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
