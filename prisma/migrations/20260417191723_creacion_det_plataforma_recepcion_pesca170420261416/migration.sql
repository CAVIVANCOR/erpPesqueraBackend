-- CreateTable
CREATE TABLE "DetPlataformaRecepcionPesca" (
    "id" BIGSERIAL NOT NULL,
    "entidadComercialId" BIGINT NOT NULL,
    "puertoPescaId" BIGINT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "latitud" DECIMAL(10,8),
    "longitud" DECIMAL(11,8),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DetPlataformaRecepcionPesca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetPlataformaRecepcionPesca_entidadComercialId_idx" ON "DetPlataformaRecepcionPesca"("entidadComercialId");

-- CreateIndex
CREATE INDEX "DetPlataformaRecepcionPesca_puertoPescaId_idx" ON "DetPlataformaRecepcionPesca"("puertoPescaId");

-- CreateIndex
CREATE INDEX "DetPlataformaRecepcionPesca_activo_idx" ON "DetPlataformaRecepcionPesca"("activo");

-- AddForeignKey
ALTER TABLE "DetPlataformaRecepcionPesca" ADD CONSTRAINT "DetPlataformaRecepcionPesca_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetPlataformaRecepcionPesca" ADD CONSTRAINT "DetPlataformaRecepcionPesca_puertoPescaId_fkey" FOREIGN KEY ("puertoPescaId") REFERENCES "PuertoPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
