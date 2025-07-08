/*
  Warnings:

  - The primary key for the `Color` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `descripcion_armada` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_base` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_extendida` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_actualizacion` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `id_color` on the `Color` table. All the data in the column will be lost.
  - The primary key for the `FamiliaProducto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `descripcion_armada` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_base` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_extendida` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `id_familia` on the `FamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_armada` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_base` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_extendida` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `exonerado_igv` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_actualizacion` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_cliente` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_color` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_estado_inicial` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_familia` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_marca` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_procedencia` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_subfamilia` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_tipo_almacenamiento` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_tipo_material` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_unidad_alto` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_unidad_ancho` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_unidad_angulo` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_unidad_diametro` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_unidad_espesor` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `id_unidad_largo` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `porcentaje_detraccion` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `unidad_medida_id` on the `Producto` table. All the data in the column will be lost.
  - The primary key for the `SubfamiliaProducto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `descripcion_armada` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_base` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_extendida` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `id_familia` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - You are about to drop the column `id_subfamilia` on the `SubfamiliaProducto` table. All the data in the column will be lost.
  - The primary key for the `TipoMaterial` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `descripcion_armada` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_base` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion_extendida` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_actualizacion` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `TipoMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `id_tipo_material` on the `TipoMaterial` table. All the data in the column will be lost.
  - The primary key for the `UnidadMedida` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_unidad_medida` on the `UnidadMedida` table. All the data in the column will be lost.
  - Added the required column `descripcionBase` to the `Color` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaActualizacion` to the `Color` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcionBase` to the `FamiliaProducto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcionBase` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `familiaId` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaActualizacion` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unidadMedidaId` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcionBase` to the `SubfamiliaProducto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `familiaId` to the `SubfamiliaProducto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcionBase` to the `TipoMaterial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaActualizacion` to the `TipoMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_id_color_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_id_familia_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_id_subfamilia_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_id_tipo_material_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_unidad_medida_id_fkey";

-- AlterTable
ALTER TABLE "Color" DROP CONSTRAINT "Color_pkey",
DROP COLUMN "descripcion_armada",
DROP COLUMN "descripcion_base",
DROP COLUMN "descripcion_extendida",
DROP COLUMN "fecha_actualizacion",
DROP COLUMN "fecha_creacion",
DROP COLUMN "id_color",
ADD COLUMN     "descripcionArmada" TEXT,
ADD COLUMN     "descripcionBase" VARCHAR(80) NOT NULL,
ADD COLUMN     "descripcionExtendida" TEXT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "Color_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "FamiliaProducto" DROP CONSTRAINT "FamiliaProducto_pkey",
DROP COLUMN "descripcion_armada",
DROP COLUMN "descripcion_base",
DROP COLUMN "descripcion_extendida",
DROP COLUMN "id_familia",
ADD COLUMN     "descripcionArmada" TEXT,
ADD COLUMN     "descripcionBase" VARCHAR(120) NOT NULL,
ADD COLUMN     "descripcionExtendida" TEXT,
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "FamiliaProducto_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "descripcion_armada",
DROP COLUMN "descripcion_base",
DROP COLUMN "descripcion_extendida",
DROP COLUMN "exonerado_igv",
DROP COLUMN "fecha_actualizacion",
DROP COLUMN "fecha_creacion",
DROP COLUMN "id_cliente",
DROP COLUMN "id_color",
DROP COLUMN "id_estado_inicial",
DROP COLUMN "id_familia",
DROP COLUMN "id_marca",
DROP COLUMN "id_procedencia",
DROP COLUMN "id_subfamilia",
DROP COLUMN "id_tipo_almacenamiento",
DROP COLUMN "id_tipo_material",
DROP COLUMN "id_unidad_alto",
DROP COLUMN "id_unidad_ancho",
DROP COLUMN "id_unidad_angulo",
DROP COLUMN "id_unidad_diametro",
DROP COLUMN "id_unidad_espesor",
DROP COLUMN "id_unidad_largo",
DROP COLUMN "porcentaje_detraccion",
DROP COLUMN "unidad_medida_id",
ADD COLUMN     "clienteId" BIGINT,
ADD COLUMN     "colorId" BIGINT,
ADD COLUMN     "descripcionArmada" TEXT,
ADD COLUMN     "descripcionBase" VARCHAR(120) NOT NULL,
ADD COLUMN     "descripcionExtendida" TEXT,
ADD COLUMN     "estadoInicialId" BIGINT,
ADD COLUMN     "exoneradoIgv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "familiaId" BIGINT NOT NULL,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "marcaId" BIGINT,
ADD COLUMN     "porcentajeDetraccion" DECIMAL(65,30),
ADD COLUMN     "procedenciaId" BIGINT,
ADD COLUMN     "subfamiliaId" BIGINT,
ADD COLUMN     "tipoAlmacenamientoId" BIGINT,
ADD COLUMN     "tipoMaterialId" BIGINT,
ADD COLUMN     "unidadAltoId" BIGINT,
ADD COLUMN     "unidadAnchoId" BIGINT,
ADD COLUMN     "unidadAnguloId" BIGINT,
ADD COLUMN     "unidadDiametroId" BIGINT,
ADD COLUMN     "unidadEspesorId" BIGINT,
ADD COLUMN     "unidadLargoId" BIGINT,
ADD COLUMN     "unidadMedidaId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "SubfamiliaProducto" DROP CONSTRAINT "SubfamiliaProducto_pkey",
DROP COLUMN "descripcion_armada",
DROP COLUMN "descripcion_base",
DROP COLUMN "descripcion_extendida",
DROP COLUMN "id_familia",
DROP COLUMN "id_subfamilia",
ADD COLUMN     "descripcionArmada" TEXT,
ADD COLUMN     "descripcionBase" VARCHAR(120) NOT NULL,
ADD COLUMN     "descripcionExtendida" TEXT,
ADD COLUMN     "familiaId" BIGINT NOT NULL,
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "SubfamiliaProducto_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TipoMaterial" DROP CONSTRAINT "TipoMaterial_pkey",
DROP COLUMN "descripcion_armada",
DROP COLUMN "descripcion_base",
DROP COLUMN "descripcion_extendida",
DROP COLUMN "fecha_actualizacion",
DROP COLUMN "fecha_creacion",
DROP COLUMN "id_tipo_material",
ADD COLUMN     "descripcionArmada" TEXT,
ADD COLUMN     "descripcionBase" VARCHAR(80) NOT NULL,
ADD COLUMN     "descripcionExtendida" TEXT,
ADD COLUMN     "fechaActualizacion" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "TipoMaterial_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UnidadMedida" DROP CONSTRAINT "UnidadMedida_pkey",
DROP COLUMN "id_unidad_medida",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "UnidadMedida_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "FamiliaProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "SubfamiliaProducto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "UnidadMedida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tipoMaterialId_fkey" FOREIGN KEY ("tipoMaterialId") REFERENCES "TipoMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;
