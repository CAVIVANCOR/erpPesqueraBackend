-- AlterTable
ALTER TABLE "AccesoInstalacion" ADD COLUMN     "contactoEntidadId" BIGINT,
ADD COLUMN     "entidadComercialId" BIGINT,
ADD COLUMN     "personalDestinoId" BIGINT,
ADD COLUMN     "personalIngresoId" BIGINT;

-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "esAdministrativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marcaAsistencia" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_personalIngresoId_fkey" FOREIGN KEY ("personalIngresoId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_personalDestinoId_fkey" FOREIGN KEY ("personalDestinoId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoInstalacion" ADD CONSTRAINT "AccesoInstalacion_contactoEntidadId_fkey" FOREIGN KEY ("contactoEntidadId") REFERENCES "ContactoEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
