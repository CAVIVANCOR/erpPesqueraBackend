/*
  Warnings:

  - You are about to drop the column `descripcionArmada` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionBase` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionExtendida` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `fechaActualizacion` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `fechaCreacion` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionArmada` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionBase` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionExtendida` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionArmada` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionBase` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionExtendida` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionArmada` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionBase` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `descripcionExtendida` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `fechaActualizacion` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `fechaCreacion` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `unidad_base_id` on the `UnidadMedida` table. All the data in the column will be lost.
  - Added the required column `nombre` to the `Color` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `FamiliaProducto` table without a default value. This is not possible if the table is not empty.
  - Made the column `colorId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `descripcionArmada` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `estadoInicialId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `marcaId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `procedenciaId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subfamiliaId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tipoAlmacenamientoId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tipoMaterialId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unidadAnguloId` on table `Producto` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `nombre` to the `SubfamiliaProducto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `TipoMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Producto" DROP CONSTRAINT "Producto_colorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Producto" DROP CONSTRAINT "Producto_subfamiliaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Producto" DROP CONSTRAINT "Producto_tipoMaterialId_fkey";

-- AlterTable
ALTER TABLE "public"."Color" DROP COLUMN "descripcionArmada",
DROP COLUMN "descripcionBase",
DROP COLUMN "descripcionExtendida",
DROP COLUMN "fechaActualizacion",
DROP COLUMN "fechaCreacion",
ADD COLUMN     "nombre" VARCHAR(80) NOT NULL;

-- AlterTable
ALTER TABLE "public"."FamiliaProducto" DROP COLUMN "descripcionArmada",
DROP COLUMN "descripcionBase",
DROP COLUMN "descripcionExtendida",
DROP COLUMN "estado",
ADD COLUMN     "nombre" VARCHAR(120) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Producto" ALTER COLUMN "colorId" SET NOT NULL,
ALTER COLUMN "descripcionArmada" SET NOT NULL,
ALTER COLUMN "estadoInicialId" SET NOT NULL,
ALTER COLUMN "marcaId" SET NOT NULL,
ALTER COLUMN "procedenciaId" SET NOT NULL,
ALTER COLUMN "subfamiliaId" SET NOT NULL,
ALTER COLUMN "tipoAlmacenamientoId" SET NOT NULL,
ALTER COLUMN "tipoMaterialId" SET NOT NULL,
ALTER COLUMN "unidadAnguloId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."SubfamiliaProducto" DROP COLUMN "descripcionArmada",
DROP COLUMN "descripcionBase",
DROP COLUMN "descripcionExtendida",
DROP COLUMN "estado",
ADD COLUMN     "nombre" VARCHAR(120) NOT NULL;

-- AlterTable
ALTER TABLE "public"."TipoMaterial" DROP COLUMN "descripcionArmada",
DROP COLUMN "descripcionBase",
DROP COLUMN "descripcionExtendida",
DROP COLUMN "fechaActualizacion",
DROP COLUMN "fechaCreacion",
ADD COLUMN     "nombre" VARCHAR(80) NOT NULL;

-- AlterTable
ALTER TABLE "public"."UnidadMedida" DROP COLUMN "unidad_base_id";

-- CreateTable
CREATE TABLE "public"."TipoAlmacenamiento" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "TipoAlmacenamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Procedencia" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "Procedencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Marca" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "Marca_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "public"."SubfamiliaProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_tipoMaterialId_fkey" FOREIGN KEY ("tipoMaterialId") REFERENCES "public"."TipoMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "public"."Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_tipoAlmacenamientoId_fkey" FOREIGN KEY ("tipoAlmacenamientoId") REFERENCES "public"."TipoAlmacenamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_procedenciaId_fkey" FOREIGN KEY ("procedenciaId") REFERENCES "public"."Procedencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "public"."Marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
