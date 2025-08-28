-- AddForeignKey
ALTER TABLE "public"."Embarcacion" ADD CONSTRAINT "Embarcacion_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "public"."Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
