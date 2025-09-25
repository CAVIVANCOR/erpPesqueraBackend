/*
  Warnings:

  - You are about to drop the column `urlCertificadoAguasSucias` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoArqueo` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoBalsasSalvavidas` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoCompas` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoExtinguidores` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoFrancoBordo` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoFumigacion` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoHidroCarburos` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoMatricula` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoPaqueteEmergencia` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoRadioBaliza` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoSanitarioSanipes` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoSeguridad` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadoSimtrac` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadogeolocalizador` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlCertificadosDotacionMinimaSeguridad` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlConstanciaNoAdeudoFoncopes` on the `Embarcacion` table. All the data in the column will be lost.
  - You are about to drop the column `urlPermisoPesca` on the `Embarcacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Embarcacion" DROP COLUMN "urlCertificadoAguasSucias",
DROP COLUMN "urlCertificadoArqueo",
DROP COLUMN "urlCertificadoBalsasSalvavidas",
DROP COLUMN "urlCertificadoCompas",
DROP COLUMN "urlCertificadoExtinguidores",
DROP COLUMN "urlCertificadoFrancoBordo",
DROP COLUMN "urlCertificadoFumigacion",
DROP COLUMN "urlCertificadoHidroCarburos",
DROP COLUMN "urlCertificadoMatricula",
DROP COLUMN "urlCertificadoPaqueteEmergencia",
DROP COLUMN "urlCertificadoRadioBaliza",
DROP COLUMN "urlCertificadoSanitarioSanipes",
DROP COLUMN "urlCertificadoSeguridad",
DROP COLUMN "urlCertificadoSimtrac",
DROP COLUMN "urlCertificadogeolocalizador",
DROP COLUMN "urlCertificadosDotacionMinimaSeguridad",
DROP COLUMN "urlConstanciaNoAdeudoFoncopes",
DROP COLUMN "urlPermisoPesca";
