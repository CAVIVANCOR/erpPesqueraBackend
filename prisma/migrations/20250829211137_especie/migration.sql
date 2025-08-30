-- CreateTable
CREATE TABLE "public"."Especie" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "Especie_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."DetalleCalaEspecie" ADD CONSTRAINT "DetalleCalaEspecie_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "public"."Especie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
