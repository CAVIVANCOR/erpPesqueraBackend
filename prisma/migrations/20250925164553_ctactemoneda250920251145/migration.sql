-- AddForeignKey
ALTER TABLE "public"."CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "public"."Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
