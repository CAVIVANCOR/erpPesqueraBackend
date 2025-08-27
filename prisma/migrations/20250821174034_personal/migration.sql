-- AddForeignKey
ALTER TABLE "public"."DocumentacionEmbarcacion" ADD CONSTRAINT "DocumentacionEmbarcacion_documentoPescaId_fkey" FOREIGN KEY ("documentoPescaId") REFERENCES "public"."DocumentoPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentacionPersonal" ADD CONSTRAINT "DocumentacionPersonal_documentoPescaId_fkey" FOREIGN KEY ("documentoPescaId") REFERENCES "public"."DocumentoPesca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
