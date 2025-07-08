-- AlterTable
ALTER TABLE "AccesosUsuario" ADD COLUMN     "puedeReactivarDocs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puederAprobarDocs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puederRechazarDocs" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "esAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esSuperUsuario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esUsuario" BOOLEAN NOT NULL DEFAULT true;
