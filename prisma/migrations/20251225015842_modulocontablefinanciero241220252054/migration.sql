/*
  Warnings:

  - You are about to drop the column `movimientoCajaId` on the `AsientoContableInterfaz` table. All the data in the column will be lost.
  - You are about to drop the column `cuentaContableDebe` on the `ConfiguracionCuentaContable` table. All the data in the column will be lost.
  - You are about to drop the column `cuentaContableHaber` on the `ConfiguracionCuentaContable` table. All the data in the column will be lost.
  - You are about to drop the column `cotizacionVentasOrigenId` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `esExportacion` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `ordenCompraCliente` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `puertoCargaId` on the `PreFactura` table. All the data in the column will be lost.
  - You are about to drop the column `puertoDescargaId` on the `PreFactura` table. All the data in the column will be lost.
  - Made the column `creadoEn` on table `AsientoContableInterfaz` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `cuentaContableDebeId` to the `ConfiguracionCuentaContable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cuentaContableHaberId` to the `ConfiguracionCuentaContable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `respVentasId` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoProductoId` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalIGV` to the `PreFactura` table without a default value. This is not possible if the table is not empty.
  - Made the column `monedaId` on table `PreFactura` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tipoCambio` on table `PreFactura` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "NivelCuentaContable" AS ENUM ('CLASE', 'CUENTA', 'SUBCUENTA', 'DIVISIONARIA', 'SUBDIVISIONARIA');

-- CreateEnum
CREATE TYPE "NaturalezaCuenta" AS ENUM ('DEUDORA', 'ACREEDORA');

-- CreateEnum
CREATE TYPE "TipoCuentaContable" AS ENUM ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO');

-- CreateEnum
CREATE TYPE "TipoLibroContable" AS ENUM ('FISCAL', 'GERENCIAL');

-- CreateEnum
CREATE TYPE "OrigenAsiento" AS ENUM ('MANUAL', 'AUTOMATICO');

-- CreateEnum
CREATE TYPE "TipoEndosoLetra" AS ENUM ('PLENO', 'PROCURACION', 'GARANTIA');

-- DropForeignKey
ALTER TABLE "AsientoContableInterfaz" DROP CONSTRAINT "AsientoContableInterfaz_movimientoCajaId_fkey";

-- DropForeignKey
ALTER TABLE "PreFactura" DROP CONSTRAINT "PreFactura_monedaId_fkey";

-- AlterTable
ALTER TABLE "AccesosUsuario" ADD COLUMN     "accesoLibroFiscal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accesoLibroGerencial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esUsuarioGerencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esUsuarioSunat" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AsientoContableInterfaz" DROP COLUMN "movimientoCajaId",
ADD COLUMN     "centroCostoId" BIGINT,
ADD COLUMN     "procesoOrigenId" BIGINT,
ADD COLUMN     "submoduloId" BIGINT,
ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE',
ALTER COLUMN "creadoEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "ConfiguracionCuentaContable" DROP COLUMN "cuentaContableDebe",
DROP COLUMN "cuentaContableHaber",
ADD COLUMN     "cuentaContableDebeId" BIGINT NOT NULL,
ADD COLUMN     "cuentaContableHaberId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "FormaPago" ADD COLUMN     "diasCredito" INTEGER,
ADD COLUMN     "esCredito" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "comprobanteRecibido" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaRecepcionComprobante" TIMESTAMP(3),
ADD COLUMN     "numCorreDocFinal" VARCHAR(40),
ADD COLUMN     "numSerieDocFinal" VARCHAR(40),
ADD COLUMN     "numeroDocumentoFinal" VARCHAR(40),
ADD COLUMN     "serieDocFinalId" BIGINT,
ADD COLUMN     "tipoDocumentoFinalId" BIGINT;

-- AlterTable
ALTER TABLE "PreFactura" DROP COLUMN "cotizacionVentasOrigenId",
DROP COLUMN "esExportacion",
DROP COLUMN "ordenCompraCliente",
DROP COLUMN "puertoCargaId",
DROP COLUMN "puertoDescargaId",
ADD COLUMN     "aprobadoPorId" BIGINT,
ADD COLUMN     "autorizaVentaId" BIGINT,
ADD COLUMN     "contactoClienteId" BIGINT,
ADD COLUMN     "cotizacionVentaId" BIGINT,
ADD COLUMN     "facturado" BOOLEAN DEFAULT false,
ADD COLUMN     "fechaAprobacion" TIMESTAMP(3),
ADD COLUMN     "fechaFacturacion" TIMESTAMP(3),
ADD COLUMN     "montoAdelantadoCliente" DECIMAL(18,2),
ADD COLUMN     "motivoRechazo" TEXT,
ADD COLUMN     "numCorreDocFinal" VARCHAR(40),
ADD COLUMN     "numSerieDocFinal" VARCHAR(40),
ADD COLUMN     "numeroDocumentoFinal" VARCHAR(40),
ADD COLUMN     "porcentajeAdelanto" DECIMAL(5,2),
ADD COLUMN     "puertoDestinoId" BIGINT,
ADD COLUMN     "puertoEmbarqueId" BIGINT,
ADD COLUMN     "respAlmacenId" BIGINT,
ADD COLUMN     "respEmbarqueId" BIGINT,
ADD COLUMN     "respProduccionId" BIGINT,
ADD COLUMN     "respVentasId" BIGINT NOT NULL,
ADD COLUMN     "serieDocFinalId" BIGINT,
ADD COLUMN     "subtotal" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "supervisorVentaCampoId" BIGINT,
ADD COLUMN     "tipoDocumentoFinalId" BIGINT,
ADD COLUMN     "tipoProductoId" BIGINT NOT NULL,
ADD COLUMN     "total" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "totalDescuentos" DECIMAL(18,2),
ADD COLUMN     "totalIGV" DECIMAL(18,2) NOT NULL,
ALTER COLUMN "monedaId" SET NOT NULL,
ALTER COLUMN "tipoCambio" SET NOT NULL;

-- CreateTable
CREATE TABLE "PlanCuentasContable" (
    "id" BIGSERIAL NOT NULL,
    "codigoCuenta" VARCHAR(20) NOT NULL,
    "nombreCuenta" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "nivel" "NivelCuentaContable" NOT NULL,
    "cuentaPadreId" BIGINT,
    "naturaleza" "NaturalezaCuenta" NOT NULL,
    "esImputable" BOOLEAN NOT NULL DEFAULT false,
    "requiereCentroCosto" BOOLEAN NOT NULL DEFAULT false,
    "requiereEntidad" BOOLEAN NOT NULL DEFAULT false,
    "requiereProyecto" BOOLEAN NOT NULL DEFAULT false,
    "tipoCuenta" "TipoCuentaContable",
    "esActivoCorriente" BOOLEAN NOT NULL DEFAULT false,
    "esActivoNoCorriente" BOOLEAN NOT NULL DEFAULT false,
    "esPasivoCorriente" BOOLEAN NOT NULL DEFAULT false,
    "esPasivoNoCorriente" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PlanCuentasContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoContable" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "nombrePeriodo" VARCHAR(50) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "fechaCierre" TIMESTAMP(3),
    "cerradoPor" BIGINT,
    "fechaReapertura" TIMESTAMP(3),
    "reabiertoPor" BIGINT,
    "motivoReapertura" TEXT,
    "fechaBloqueo" TIMESTAMP(3),
    "bloqueadoPor" BIGINT,
    "motivoBloqueo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "PeriodoContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsientoContable" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "periodoContableId" BIGINT NOT NULL,
    "numeroAsiento" VARCHAR(20) NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "fechaAsiento" TIMESTAMP(3) NOT NULL,
    "glosa" TEXT NOT NULL,
    "tipoLibro" "TipoLibroContable" NOT NULL,
    "origenAsiento" "OrigenAsiento" NOT NULL,
    "submoduloOrigenId" BIGINT,
    "procesoOrigenId" BIGINT,
    "estadoId" BIGINT NOT NULL,
    "totalDebe" DECIMAL(18,2) NOT NULL,
    "totalHaber" DECIMAL(18,2) NOT NULL,
    "diferencia" DECIMAL(18,2) NOT NULL,
    "estaCuadrado" BOOLEAN NOT NULL DEFAULT false,
    "monedaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4),
    "fechaAprobacion" TIMESTAMP(3),
    "aprobadoPor" BIGINT,
    "fechaAnulacion" TIMESTAMP(3),
    "anuladoPor" BIGINT,
    "motivoAnulacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "AsientoContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleAsientoContable" (
    "id" BIGSERIAL NOT NULL,
    "asientoContableId" BIGINT NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "planCuentaId" BIGINT NOT NULL,
    "codigoCuenta" VARCHAR(20) NOT NULL,
    "nombreCuenta" VARCHAR(200) NOT NULL,
    "glosa" TEXT NOT NULL,
    "debe" DECIMAL(18,2) NOT NULL,
    "haber" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4),
    "debeMonedaExtranjera" DECIMAL(18,2),
    "haberMonedaExtranjera" DECIMAL(18,2),
    "centroCostoId" BIGINT,
    "entidadComercialId" BIGINT,
    "proyectoId" BIGINT,
    "tipoDocumentoOrigenId" BIGINT,
    "numeroDocumentoOrigen" VARCHAR(50),
    "fechaDocumentoOrigen" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "DetalleAsientoContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAfectacionIGV" (
    "id" BIGSERIAL NOT NULL,
    "codigoSunat" VARCHAR(2) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "afectoIGV" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoAfectacionIGV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComprobanteElectronico" (
    "id" BIGSERIAL NOT NULL,
    "preFacturaId" BIGINT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "sedeId" BIGINT NOT NULL,
    "tipoComprobanteId" BIGINT NOT NULL,
    "serieDocId" BIGINT NOT NULL,
    "numeroSerie" VARCHAR(4) NOT NULL,
    "numeroCorrelativo" INTEGER NOT NULL,
    "numeroCompleto" VARCHAR(20) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaEmision" VARCHAR(8) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "entidadComercialId" BIGINT NOT NULL,
    "tipoDocumentoClienteId" BIGINT NOT NULL,
    "numeroDocumentoCliente" VARCHAR(20) NOT NULL,
    "razonSocialCliente" VARCHAR(255) NOT NULL,
    "direccionCliente" TEXT NOT NULL,
    "emailCliente" VARCHAR(100),
    "monedaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4) NOT NULL,
    "formaPagoId" BIGINT NOT NULL,
    "montoPendientePago" DECIMAL(18,2),
    "ordenCompra" VARCHAR(50),
    "guiaRemision" VARCHAR(50),
    "sujetoDetraccion" BOOLEAN NOT NULL DEFAULT false,
    "codigoDetraccion" VARCHAR(10),
    "porcentajeDetraccion" DECIMAL(5,2),
    "montoDetraccion" DECIMAL(18,2),
    "sujetoPercepcion" BOOLEAN NOT NULL DEFAULT false,
    "codigoPercepcion" VARCHAR(10),
    "porcentajePercepcion" DECIMAL(5,2),
    "montoPercepcion" DECIMAL(18,2),
    "sujetoRetencion" BOOLEAN NOT NULL DEFAULT false,
    "porcentajeRetencion" DECIMAL(5,2),
    "montoRetencion" DECIMAL(18,2),
    "tipoNotaId" BIGINT,
    "motivoNotaId" BIGINT,
    "comprobanteModificaId" BIGINT,
    "nubefactRuta" VARCHAR(100),
    "nubefactToken" VARCHAR(200),
    "nubefactAceptadoPorSunat" BOOLEAN,
    "nubefactSunatTransaction" INTEGER DEFAULT 1,
    "nubefactEnlacePDF" VARCHAR(500),
    "nubefactEnlaceXML" VARCHAR(500),
    "nubefactEnlaceCDR" VARCHAR(500),
    "nubefactSunatDescription" TEXT,
    "nubefactSunatNote" TEXT,
    "nubefactSunatResponsecode" VARCHAR(10),
    "nubefactSunatSoapError" TEXT,
    "nubefactCadenaParaQr" TEXT,
    "nubefactHashCpe" VARCHAR(100),
    "nubefactQr" TEXT,
    "rutaLocalPDF" VARCHAR(500),
    "rutaLocalXML" VARCHAR(500),
    "rutaLocalCDR" VARCHAR(500),
    "estadoOSEId" BIGINT NOT NULL,
    "fechaEnvioOSE" TIMESTAMP(3),
    "fechaRespuestaOSE" TIMESTAMP(3),
    "estadoSUNATId" BIGINT NOT NULL,
    "fechaBaja" TIMESTAMP(3),
    "motivoBaja" TEXT,
    "ticketBaja" VARCHAR(50),
    "enviadoEmail" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvioEmail" TIMESTAMP(3),
    "emailsEnviados" TEXT,
    "asientoContableId" BIGINT,
    "contabilizado" BOOLEAN NOT NULL DEFAULT false,
    "fechaContabilizacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" BIGINT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" BIGINT,

    CONSTRAINT "ComprobanteElectronico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleComprobante" (
    "id" BIGSERIAL NOT NULL,
    "comprobanteElectronicoId" BIGINT NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "productoId" BIGINT,
    "codigoProducto" VARCHAR(50),
    "codigoProductoSunat" VARCHAR(50),
    "descripcion" TEXT NOT NULL,
    "unidadMedidaId" BIGINT NOT NULL,
    "codigoUnidadSUNAT" VARCHAR(10) NOT NULL,
    "nombreUnidad" VARCHAR(50),
    "cantidad" DECIMAL(18,4) NOT NULL,
    "valorUnitario" DECIMAL(18,6) NOT NULL,
    "precioUnitario" DECIMAL(18,6) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "porcentajeDescuento" DECIMAL(5,2),
    "descuento" DECIMAL(18,2),
    "tipoAfectacionIGVId" BIGINT NOT NULL,
    "igv" DECIMAL(18,2) NOT NULL,
    "porcentajeIgv" DECIMAL(5,2) NOT NULL,
    "isc" DECIMAL(18,2),
    "total" DECIMAL(18,2) NOT NULL,
    "anticipo" BOOLEAN DEFAULT false,

    CONSTRAINT "DetalleComprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuotaPagoComprobante" (
    "id" BIGSERIAL NOT NULL,
    "comprobanteElectronicoId" BIGINT NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "montoCuota" DECIMAL(18,2) NOT NULL,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" TIMESTAMP(3),
    "montoPagado" DECIMAL(18,2),

    CONSTRAINT "CuotaPagoComprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioOSE" (
    "id" BIGSERIAL NOT NULL,
    "comprobanteElectronicoId" BIGINT NOT NULL,
    "numeroIntento" INTEGER NOT NULL DEFAULT 1,
    "fechaEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadJSON" JSONB NOT NULL,
    "respuestaJSON" JSONB,
    "aceptadoPorSunat" BOOLEAN,
    "codigoRespuesta" VARCHAR(10),
    "mensajeRespuesta" TEXT,
    "estadoEnvio" VARCHAR(20) NOT NULL,
    "tieneError" BOOLEAN NOT NULL DEFAULT false,
    "codigoError" VARCHAR(50),
    "mensajeError" TEXT,

    CONSTRAINT "EnvioOSE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" BIGSERIAL NOT NULL,
    "preFacturaId" BIGINT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "clienteId" BIGINT NOT NULL,
    "numeroPreFactura" VARCHAR(30) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "esContado" BOOLEAN NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCuentaPorCobrar" (
    "id" BIGSERIAL NOT NULL,
    "cuentaPorCobrarId" BIGINT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "montoPago" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4) NOT NULL,
    "medioPagoId" BIGINT NOT NULL,
    "numeroOperacion" VARCHAR(50),
    "bancoId" BIGINT,
    "cuentaBancariaId" BIGINT,
    "movimientoCajaId" BIGINT,
    "observaciones" TEXT,
    "registradoPor" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoCuentaPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorPagar" (
    "id" BIGSERIAL NOT NULL,
    "ordenCompraId" BIGINT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "proveedorId" BIGINT NOT NULL,
    "numeroOrdenCompra" VARCHAR(30) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "numeroFacturaProveedor" VARCHAR(50),
    "fechaFacturaProveedor" TIMESTAMP(3),
    "monedaId" BIGINT NOT NULL,
    "esContado" BOOLEAN NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaPorPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCuentaPorPagar" (
    "id" BIGSERIAL NOT NULL,
    "cuentaPorPagarId" BIGINT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "montoPago" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "tipoCambio" DECIMAL(10,4) NOT NULL,
    "medioPagoId" BIGINT NOT NULL,
    "numeroOperacion" VARCHAR(50),
    "bancoId" BIGINT,
    "cuentaBancariaId" BIGINT,
    "movimientoCajaId" BIGINT,
    "observaciones" TEXT,
    "registradoPor" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoCuentaPorPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedioPago" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "requiereBanco" BOOLEAN NOT NULL DEFAULT false,
    "requiereNumOperacion" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MedioPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlujoCajaProyectado" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "periodo" VARCHAR(7) NOT NULL,
    "fechaProyeccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoId" BIGINT NOT NULL,
    "aprobadoPor" BIGINT,
    "fechaAprobacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,

    CONSTRAINT "FlujoCajaProyectado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleFlujoCajaProyectado" (
    "id" BIGSERIAL NOT NULL,
    "flujoCajaProyectadoId" BIGINT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipoMovimiento" VARCHAR(10) NOT NULL,
    "concepto" VARCHAR(200) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "cuentaPorCobrarId" BIGINT,
    "cuentaPorPagarId" BIGINT,
    "esRecurrente" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,

    CONSTRAINT "DetalleFlujoCajaProyectado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConciliacionBancaria" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "cuentaCorrienteId" BIGINT NOT NULL,
    "periodo" VARCHAR(7) NOT NULL,
    "fechaConciliacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saldoInicialLibros" DECIMAL(18,2) NOT NULL,
    "saldoFinalLibros" DECIMAL(18,2) NOT NULL,
    "saldoInicialBanco" DECIMAL(18,2) NOT NULL,
    "saldoFinalBanco" DECIMAL(18,2) NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "conciliadoPor" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConciliacionBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleConciliacionBancaria" (
    "id" BIGSERIAL NOT NULL,
    "conciliacionBancariaId" BIGINT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipoMovimiento" VARCHAR(10) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "enLibros" BOOLEAN NOT NULL DEFAULT false,
    "enBanco" BOOLEAN NOT NULL DEFAULT false,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "movimientoCajaId" BIGINT,
    "numeroOperacionBanco" VARCHAR(50),
    "observaciones" TEXT,

    CONSTRAINT "DetalleConciliacionBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UbicacionLetra" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "esUbicacionBanco" BOOLEAN NOT NULL DEFAULT false,
    "bancoId" BIGINT,
    "responsableId" BIGINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UbicacionLetra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LetraCambio" (
    "id" BIGSERIAL NOT NULL,
    "tipoLetra" VARCHAR(10) NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "serieDocId" BIGINT,
    "numSerieDoc" VARCHAR(40),
    "numCorreDoc" VARCHAR(40),
    "numeroDocumento" VARCHAR(40),
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "fechaAceptacion" TIMESTAMP(3),
    "giradoId" BIGINT NOT NULL,
    "beneficiarioId" BIGINT NOT NULL,
    "avalId" BIGINT,
    "monedaId" BIGINT NOT NULL,
    "montoOriginal" DECIMAL(18,2) NOT NULL,
    "cuentaPorCobrarId" BIGINT,
    "cuentaPorPagarId" BIGINT,
    "estadoId" BIGINT NOT NULL,
    "descontada" BOOLEAN NOT NULL DEFAULT false,
    "bancoDescontoId" BIGINT,
    "fechaDescuento" TIMESTAMP(3),
    "montoDescuento" DECIMAL(18,2),
    "tasaDescuento" DECIMAL(5,2),
    "renovada" BOOLEAN NOT NULL DEFAULT false,
    "letraRenovadaId" BIGINT,
    "protestada" BOOLEAN NOT NULL DEFAULT false,
    "fechaProtesto" TIMESTAMP(3),
    "motivoProtesto" TEXT,
    "ubicacionLetraId" BIGINT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,
    "actualizadoPor" BIGINT,

    CONSTRAINT "LetraCambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoLetraCambio" (
    "id" BIGSERIAL NOT NULL,
    "letraCambioId" BIGINT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "montoPago" DECIMAL(18,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "medioPagoId" BIGINT NOT NULL,
    "numeroOperacion" VARCHAR(50),
    "bancoId" BIGINT,
    "movimientoCajaId" BIGINT,
    "observaciones" TEXT,
    "registradoPor" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoLetraCambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndosoLetraCambio" (
    "id" BIGSERIAL NOT NULL,
    "letraCambioId" BIGINT NOT NULL,
    "fechaEndoso" TIMESTAMP(3) NOT NULL,
    "endosanteId" BIGINT NOT NULL,
    "endosatarioId" BIGINT NOT NULL,
    "tipoEndoso" "TipoEndosoLetra" NOT NULL,
    "observaciones" TEXT,
    "registradoPor" BIGINT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EndosoLetraCambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoRetencionPercepcion" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(15) NOT NULL,
    "tasa" DECIMAL(5,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoRetencionPercepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retencion" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "serieDocId" BIGINT,
    "numSerieDoc" VARCHAR(40),
    "numCorreDoc" VARCHAR(40),
    "numeroDocumento" VARCHAR(40),
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "proveedorId" BIGINT NOT NULL,
    "tipoDocProveedorId" BIGINT NOT NULL,
    "numeroDocProveedor" VARCHAR(20) NOT NULL,
    "razonSocialProveedor" VARCHAR(255) NOT NULL,
    "tipoRetencionId" BIGINT NOT NULL,
    "tasaRetencion" DECIMAL(5,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "importeTotal" DECIMAL(18,2) NOT NULL,
    "importeRetenido" DECIMAL(18,2) NOT NULL,
    "importeNeto" DECIMAL(18,2) NOT NULL,
    "cuentaPorPagarId" BIGINT,
    "movimientoCajaId" BIGINT,
    "nubefactEnviado" BOOLEAN NOT NULL DEFAULT false,
    "nubefactAceptado" BOOLEAN,
    "nubefactEnlacePDF" VARCHAR(500),
    "nubefactEnlaceXML" VARCHAR(500),
    "nubefactRespuesta" TEXT,
    "estadoId" BIGINT NOT NULL,
    "periodoDeclaracion" VARCHAR(6),
    "declarado" BOOLEAN NOT NULL DEFAULT false,
    "fechaDeclaracion" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,

    CONSTRAINT "Retencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleRetencion" (
    "id" BIGSERIAL NOT NULL,
    "retencionId" BIGINT NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "numeroDocumento" VARCHAR(30) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "importeTotal" DECIMAL(18,2) NOT NULL,
    "importeRetenido" DECIMAL(18,2) NOT NULL,
    "importeNeto" DECIMAL(18,2) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "numeroPago" VARCHAR(30),

    CONSTRAINT "DetalleRetencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Percepcion" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "serieDocId" BIGINT,
    "numSerieDoc" VARCHAR(40),
    "numCorreDoc" VARCHAR(40),
    "numeroDocumento" VARCHAR(40),
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaCobro" TIMESTAMP(3) NOT NULL,
    "proveedorId" BIGINT NOT NULL,
    "tipoDocProveedorId" BIGINT NOT NULL,
    "numeroDocProveedor" VARCHAR(20) NOT NULL,
    "razonSocialProveedor" VARCHAR(255) NOT NULL,
    "tipoPercepcionId" BIGINT NOT NULL,
    "tasaPercepcion" DECIMAL(5,2) NOT NULL,
    "monedaId" BIGINT NOT NULL,
    "importeTotal" DECIMAL(18,2) NOT NULL,
    "importePercibido" DECIMAL(18,2) NOT NULL,
    "importePagado" DECIMAL(18,2) NOT NULL,
    "ordenCompraId" BIGINT,
    "cuentaPorPagarId" BIGINT,
    "estadoId" BIGINT NOT NULL,
    "aplicadaCredito" BOOLEAN NOT NULL DEFAULT false,
    "fechaAplicacion" TIMESTAMP(3),
    "periodoAplicacion" VARCHAR(6),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,

    CONSTRAINT "Percepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetallePercepcion" (
    "id" BIGSERIAL NOT NULL,
    "percepcionId" BIGINT NOT NULL,
    "tipoDocumentoId" BIGINT NOT NULL,
    "numeroDocumento" VARCHAR(30) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "importeTotal" DECIMAL(18,2) NOT NULL,
    "importePercibido" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "DetallePercepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoAnual" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "ejercicio" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "monedaId" BIGINT NOT NULL,
    "estadoId" BIGINT NOT NULL,
    "aprobadoPor" BIGINT,
    "fechaAprobacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" BIGINT,

    CONSTRAINT "PresupuestoAnual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaPresupuesto" (
    "id" BIGSERIAL NOT NULL,
    "presupuestoAnualId" BIGINT NOT NULL,
    "cuentaContableId" BIGINT NOT NULL,
    "centroCostoId" BIGINT,
    "montoEnero" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoFebrero" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoMarzo" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoAbril" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoMayo" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoJunio" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoJulio" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoAgosto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoSetiembre" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoOctubre" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoNoviembre" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoDiciembre" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,

    CONSTRAINT "LineaPresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EjecucionPresupuestal" (
    "id" BIGSERIAL NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "ejercicio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "cuentaContableId" BIGINT NOT NULL,
    "centroCostoId" BIGINT,
    "montoPresupuestado" DECIMAL(18,2) NOT NULL,
    "montoEjecutado" DECIMAL(18,2) NOT NULL,
    "montoDiferencia" DECIMAL(18,2) NOT NULL,
    "porcentajeEjecucion" DECIMAL(5,2) NOT NULL,
    "sobregiro" BOOLEAN NOT NULL DEFAULT false,
    "fechaCalculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EjecucionPresupuestal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanCuentasContable_codigoCuenta_idx" ON "PlanCuentasContable"("codigoCuenta");

-- CreateIndex
CREATE INDEX "PlanCuentasContable_nivel_idx" ON "PlanCuentasContable"("nivel");

-- CreateIndex
CREATE INDEX "PlanCuentasContable_esImputable_idx" ON "PlanCuentasContable"("esImputable");

-- CreateIndex
CREATE INDEX "PlanCuentasContable_activo_idx" ON "PlanCuentasContable"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "PlanCuentasContable_codigoCuenta_key" ON "PlanCuentasContable"("codigoCuenta");

-- CreateIndex
CREATE INDEX "PeriodoContable_empresaId_idx" ON "PeriodoContable"("empresaId");

-- CreateIndex
CREATE INDEX "PeriodoContable_anio_mes_idx" ON "PeriodoContable"("anio", "mes");

-- CreateIndex
CREATE INDEX "PeriodoContable_estadoId_idx" ON "PeriodoContable"("estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoContable_empresaId_anio_mes_key" ON "PeriodoContable"("empresaId", "anio", "mes");

-- CreateIndex
CREATE INDEX "AsientoContable_empresaId_idx" ON "AsientoContable"("empresaId");

-- CreateIndex
CREATE INDEX "AsientoContable_periodoContableId_idx" ON "AsientoContable"("periodoContableId");

-- CreateIndex
CREATE INDEX "AsientoContable_numeroAsiento_idx" ON "AsientoContable"("numeroAsiento");

-- CreateIndex
CREATE INDEX "AsientoContable_fechaAsiento_idx" ON "AsientoContable"("fechaAsiento");

-- CreateIndex
CREATE INDEX "AsientoContable_estadoId_idx" ON "AsientoContable"("estadoId");

-- CreateIndex
CREATE INDEX "AsientoContable_tipoLibro_idx" ON "AsientoContable"("tipoLibro");

-- CreateIndex
CREATE INDEX "AsientoContable_origenAsiento_idx" ON "AsientoContable"("origenAsiento");

-- CreateIndex
CREATE INDEX "AsientoContable_submoduloOrigenId_procesoOrigenId_idx" ON "AsientoContable"("submoduloOrigenId", "procesoOrigenId");

-- CreateIndex
CREATE INDEX "AsientoContable_empresaId_tipoLibro_estadoId_idx" ON "AsientoContable"("empresaId", "tipoLibro", "estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "AsientoContable_empresaId_periodoContableId_correlativo_key" ON "AsientoContable"("empresaId", "periodoContableId", "correlativo");

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_asientoContableId_idx" ON "DetalleAsientoContable"("asientoContableId");

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_planCuentaId_idx" ON "DetalleAsientoContable"("planCuentaId");

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_codigoCuenta_idx" ON "DetalleAsientoContable"("codigoCuenta");

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_centroCostoId_idx" ON "DetalleAsientoContable"("centroCostoId");

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_entidadComercialId_idx" ON "DetalleAsientoContable"("entidadComercialId");

-- CreateIndex
CREATE INDEX "DetalleAsientoContable_monedaId_idx" ON "DetalleAsientoContable"("monedaId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAfectacionIGV_codigoSunat_key" ON "TipoAfectacionIGV"("codigoSunat");

-- CreateIndex
CREATE INDEX "TipoAfectacionIGV_codigoSunat_idx" ON "TipoAfectacionIGV"("codigoSunat");

-- CreateIndex
CREATE INDEX "TipoAfectacionIGV_activo_idx" ON "TipoAfectacionIGV"("activo");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_preFacturaId_idx" ON "ComprobanteElectronico"("preFacturaId");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_empresaId_fechaEmision_idx" ON "ComprobanteElectronico"("empresaId", "fechaEmision");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_entidadComercialId_idx" ON "ComprobanteElectronico"("entidadComercialId");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_numeroCompleto_idx" ON "ComprobanteElectronico"("numeroCompleto");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_estadoOSEId_idx" ON "ComprobanteElectronico"("estadoOSEId");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_estadoSUNATId_idx" ON "ComprobanteElectronico"("estadoSUNATId");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_fechaEmision_idx" ON "ComprobanteElectronico"("fechaEmision");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_tipoComprobanteId_idx" ON "ComprobanteElectronico"("tipoComprobanteId");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_nubefactAceptadoPorSunat_idx" ON "ComprobanteElectronico"("nubefactAceptadoPorSunat");

-- CreateIndex
CREATE INDEX "ComprobanteElectronico_contabilizado_idx" ON "ComprobanteElectronico"("contabilizado");

-- CreateIndex
CREATE UNIQUE INDEX "ComprobanteElectronico_serieDocId_numeroCorrelativo_key" ON "ComprobanteElectronico"("serieDocId", "numeroCorrelativo");

-- CreateIndex
CREATE INDEX "DetalleComprobante_comprobanteElectronicoId_idx" ON "DetalleComprobante"("comprobanteElectronicoId");

-- CreateIndex
CREATE INDEX "DetalleComprobante_productoId_idx" ON "DetalleComprobante"("productoId");

-- CreateIndex
CREATE INDEX "DetalleComprobante_tipoAfectacionIGVId_idx" ON "DetalleComprobante"("tipoAfectacionIGVId");

-- CreateIndex
CREATE INDEX "CuotaPagoComprobante_comprobanteElectronicoId_idx" ON "CuotaPagoComprobante"("comprobanteElectronicoId");

-- CreateIndex
CREATE INDEX "CuotaPagoComprobante_fechaVencimiento_idx" ON "CuotaPagoComprobante"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "CuotaPagoComprobante_pagado_idx" ON "CuotaPagoComprobante"("pagado");

-- CreateIndex
CREATE INDEX "EnvioOSE_comprobanteElectronicoId_idx" ON "EnvioOSE"("comprobanteElectronicoId");

-- CreateIndex
CREATE INDEX "EnvioOSE_fechaEnvio_idx" ON "EnvioOSE"("fechaEnvio");

-- CreateIndex
CREATE INDEX "EnvioOSE_estadoEnvio_idx" ON "EnvioOSE"("estadoEnvio");

-- CreateIndex
CREATE INDEX "EnvioOSE_aceptadoPorSunat_idx" ON "EnvioOSE"("aceptadoPorSunat");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaPorCobrar_preFacturaId_key" ON "CuentaPorCobrar"("preFacturaId");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_empresaId_fechaVencimiento_idx" ON "CuentaPorCobrar"("empresaId", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_clienteId_idx" ON "CuentaPorCobrar"("clienteId");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_estadoId_idx" ON "CuentaPorCobrar"("estadoId");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_fechaVencimiento_idx" ON "CuentaPorCobrar"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_esContado_idx" ON "CuentaPorCobrar"("esContado");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_cuentaPorCobrarId_idx" ON "PagoCuentaPorCobrar"("cuentaPorCobrarId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_fechaPago_idx" ON "PagoCuentaPorCobrar"("fechaPago");

-- CreateIndex
CREATE INDEX "PagoCuentaPorCobrar_movimientoCajaId_idx" ON "PagoCuentaPorCobrar"("movimientoCajaId");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaPorPagar_ordenCompraId_key" ON "CuentaPorPagar"("ordenCompraId");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_empresaId_fechaVencimiento_idx" ON "CuentaPorPagar"("empresaId", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_proveedorId_idx" ON "CuentaPorPagar"("proveedorId");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_estadoId_idx" ON "CuentaPorPagar"("estadoId");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_fechaVencimiento_idx" ON "CuentaPorPagar"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_esContado_idx" ON "CuentaPorPagar"("esContado");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_cuentaPorPagarId_idx" ON "PagoCuentaPorPagar"("cuentaPorPagarId");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_fechaPago_idx" ON "PagoCuentaPorPagar"("fechaPago");

-- CreateIndex
CREATE INDEX "PagoCuentaPorPagar_movimientoCajaId_idx" ON "PagoCuentaPorPagar"("movimientoCajaId");

-- CreateIndex
CREATE UNIQUE INDEX "MedioPago_codigo_key" ON "MedioPago"("codigo");

-- CreateIndex
CREATE INDEX "MedioPago_activo_idx" ON "MedioPago"("activo");

-- CreateIndex
CREATE INDEX "FlujoCajaProyectado_empresaId_periodo_idx" ON "FlujoCajaProyectado"("empresaId", "periodo");

-- CreateIndex
CREATE INDEX "FlujoCajaProyectado_estadoId_idx" ON "FlujoCajaProyectado"("estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "FlujoCajaProyectado_empresaId_periodo_key" ON "FlujoCajaProyectado"("empresaId", "periodo");

-- CreateIndex
CREATE INDEX "DetalleFlujoCajaProyectado_flujoCajaProyectadoId_idx" ON "DetalleFlujoCajaProyectado"("flujoCajaProyectadoId");

-- CreateIndex
CREATE INDEX "DetalleFlujoCajaProyectado_fecha_idx" ON "DetalleFlujoCajaProyectado"("fecha");

-- CreateIndex
CREATE INDEX "ConciliacionBancaria_empresaId_periodo_idx" ON "ConciliacionBancaria"("empresaId", "periodo");

-- CreateIndex
CREATE INDEX "ConciliacionBancaria_estadoId_idx" ON "ConciliacionBancaria"("estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "ConciliacionBancaria_cuentaCorrienteId_periodo_key" ON "ConciliacionBancaria"("cuentaCorrienteId", "periodo");

-- CreateIndex
CREATE INDEX "DetalleConciliacionBancaria_conciliacionBancariaId_idx" ON "DetalleConciliacionBancaria"("conciliacionBancariaId");

-- CreateIndex
CREATE INDEX "DetalleConciliacionBancaria_fecha_idx" ON "DetalleConciliacionBancaria"("fecha");

-- CreateIndex
CREATE INDEX "DetalleConciliacionBancaria_conciliado_idx" ON "DetalleConciliacionBancaria"("conciliado");

-- CreateIndex
CREATE UNIQUE INDEX "UbicacionLetra_codigo_key" ON "UbicacionLetra"("codigo");

-- CreateIndex
CREATE INDEX "UbicacionLetra_activo_idx" ON "UbicacionLetra"("activo");

-- CreateIndex
CREATE INDEX "UbicacionLetra_esUbicacionBanco_idx" ON "UbicacionLetra"("esUbicacionBanco");

-- CreateIndex
CREATE INDEX "LetraCambio_empresaId_fechaVencimiento_idx" ON "LetraCambio"("empresaId", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "LetraCambio_tipoLetra_idx" ON "LetraCambio"("tipoLetra");

-- CreateIndex
CREATE INDEX "LetraCambio_estadoId_idx" ON "LetraCambio"("estadoId");

-- CreateIndex
CREATE INDEX "LetraCambio_giradoId_idx" ON "LetraCambio"("giradoId");

-- CreateIndex
CREATE INDEX "LetraCambio_beneficiarioId_idx" ON "LetraCambio"("beneficiarioId");

-- CreateIndex
CREATE INDEX "LetraCambio_fechaVencimiento_idx" ON "LetraCambio"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "LetraCambio_descontada_idx" ON "LetraCambio"("descontada");

-- CreateIndex
CREATE INDEX "LetraCambio_protestada_idx" ON "LetraCambio"("protestada");

-- CreateIndex
CREATE INDEX "LetraCambio_tipoDocumentoId_idx" ON "LetraCambio"("tipoDocumentoId");

-- CreateIndex
CREATE INDEX "LetraCambio_serieDocId_idx" ON "LetraCambio"("serieDocId");

-- CreateIndex
CREATE INDEX "LetraCambio_ubicacionLetraId_idx" ON "LetraCambio"("ubicacionLetraId");

-- CreateIndex
CREATE INDEX "PagoLetraCambio_letraCambioId_idx" ON "PagoLetraCambio"("letraCambioId");

-- CreateIndex
CREATE INDEX "PagoLetraCambio_fechaPago_idx" ON "PagoLetraCambio"("fechaPago");

-- CreateIndex
CREATE INDEX "PagoLetraCambio_movimientoCajaId_idx" ON "PagoLetraCambio"("movimientoCajaId");

-- CreateIndex
CREATE INDEX "EndosoLetraCambio_letraCambioId_idx" ON "EndosoLetraCambio"("letraCambioId");

-- CreateIndex
CREATE INDEX "EndosoLetraCambio_fechaEndoso_idx" ON "EndosoLetraCambio"("fechaEndoso");

-- CreateIndex
CREATE INDEX "EndosoLetraCambio_tipoEndoso_idx" ON "EndosoLetraCambio"("tipoEndoso");

-- CreateIndex
CREATE UNIQUE INDEX "TipoRetencionPercepcion_codigo_key" ON "TipoRetencionPercepcion"("codigo");

-- CreateIndex
CREATE INDEX "TipoRetencionPercepcion_tipo_idx" ON "TipoRetencionPercepcion"("tipo");

-- CreateIndex
CREATE INDEX "TipoRetencionPercepcion_activo_idx" ON "TipoRetencionPercepcion"("activo");

-- CreateIndex
CREATE INDEX "Retencion_empresaId_fechaEmision_idx" ON "Retencion"("empresaId", "fechaEmision");

-- CreateIndex
CREATE INDEX "Retencion_proveedorId_idx" ON "Retencion"("proveedorId");

-- CreateIndex
CREATE INDEX "Retencion_estadoId_idx" ON "Retencion"("estadoId");

-- CreateIndex
CREATE INDEX "Retencion_periodoDeclaracion_idx" ON "Retencion"("periodoDeclaracion");

-- CreateIndex
CREATE INDEX "Retencion_declarado_idx" ON "Retencion"("declarado");

-- CreateIndex
CREATE INDEX "Retencion_nubefactEnviado_idx" ON "Retencion"("nubefactEnviado");

-- CreateIndex
CREATE INDEX "DetalleRetencion_retencionId_idx" ON "DetalleRetencion"("retencionId");

-- CreateIndex
CREATE INDEX "Percepcion_empresaId_fechaEmision_idx" ON "Percepcion"("empresaId", "fechaEmision");

-- CreateIndex
CREATE INDEX "Percepcion_proveedorId_idx" ON "Percepcion"("proveedorId");

-- CreateIndex
CREATE INDEX "Percepcion_estadoId_idx" ON "Percepcion"("estadoId");

-- CreateIndex
CREATE INDEX "Percepcion_aplicadaCredito_idx" ON "Percepcion"("aplicadaCredito");

-- CreateIndex
CREATE INDEX "Percepcion_periodoAplicacion_idx" ON "Percepcion"("periodoAplicacion");

-- CreateIndex
CREATE INDEX "DetallePercepcion_percepcionId_idx" ON "DetallePercepcion"("percepcionId");

-- CreateIndex
CREATE INDEX "PresupuestoAnual_empresaId_ejercicio_idx" ON "PresupuestoAnual"("empresaId", "ejercicio");

-- CreateIndex
CREATE INDEX "PresupuestoAnual_estadoId_idx" ON "PresupuestoAnual"("estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoAnual_empresaId_ejercicio_key" ON "PresupuestoAnual"("empresaId", "ejercicio");

-- CreateIndex
CREATE INDEX "LineaPresupuesto_presupuestoAnualId_idx" ON "LineaPresupuesto"("presupuestoAnualId");

-- CreateIndex
CREATE INDEX "LineaPresupuesto_cuentaContableId_idx" ON "LineaPresupuesto"("cuentaContableId");

-- CreateIndex
CREATE INDEX "LineaPresupuesto_centroCostoId_idx" ON "LineaPresupuesto"("centroCostoId");

-- CreateIndex
CREATE UNIQUE INDEX "LineaPresupuesto_presupuestoAnualId_cuentaContableId_centro_key" ON "LineaPresupuesto"("presupuestoAnualId", "cuentaContableId", "centroCostoId");

-- CreateIndex
CREATE INDEX "EjecucionPresupuestal_empresaId_ejercicio_mes_idx" ON "EjecucionPresupuestal"("empresaId", "ejercicio", "mes");

-- CreateIndex
CREATE INDEX "EjecucionPresupuestal_cuentaContableId_idx" ON "EjecucionPresupuestal"("cuentaContableId");

-- CreateIndex
CREATE INDEX "EjecucionPresupuestal_sobregiro_idx" ON "EjecucionPresupuestal"("sobregiro");

-- CreateIndex
CREATE UNIQUE INDEX "EjecucionPresupuestal_empresaId_ejercicio_mes_cuentaContabl_key" ON "EjecucionPresupuestal"("empresaId", "ejercicio", "mes", "cuentaContableId", "centroCostoId");

-- CreateIndex
CREATE INDEX "AccesosUsuario_esUsuarioSunat_idx" ON "AccesosUsuario"("esUsuarioSunat");

-- CreateIndex
CREATE INDEX "AccesosUsuario_accesoLibroFiscal_idx" ON "AccesosUsuario"("accesoLibroFiscal");

-- CreateIndex
CREATE INDEX "AccesosUsuario_accesoLibroGerencial_idx" ON "AccesosUsuario"("accesoLibroGerencial");

-- CreateIndex
CREATE INDEX "AsientoContableInterfaz_submoduloId_procesoOrigenId_idx" ON "AsientoContableInterfaz"("submoduloId", "procesoOrigenId");

-- CreateIndex
CREATE INDEX "AsientoContableInterfaz_empresaId_idx" ON "AsientoContableInterfaz"("empresaId");

-- CreateIndex
CREATE INDEX "AsientoContableInterfaz_centroCostoId_idx" ON "AsientoContableInterfaz"("centroCostoId");

-- CreateIndex
CREATE INDEX "ConfiguracionCuentaContable_cuentaContableDebeId_idx" ON "ConfiguracionCuentaContable"("cuentaContableDebeId");

-- CreateIndex
CREATE INDEX "ConfiguracionCuentaContable_cuentaContableHaberId_idx" ON "ConfiguracionCuentaContable"("cuentaContableHaberId");

-- CreateIndex
CREATE INDEX "OrdenCompra_comprobanteRecibido_idx" ON "OrdenCompra"("comprobanteRecibido");

-- CreateIndex
CREATE INDEX "OrdenCompra_tipoDocumentoFinalId_idx" ON "OrdenCompra"("tipoDocumentoFinalId");

-- CreateIndex
CREATE INDEX "OrdenCompra_serieDocFinalId_idx" ON "OrdenCompra"("serieDocFinalId");

-- CreateIndex
CREATE INDEX "PreFactura_estadoId_idx" ON "PreFactura"("estadoId");

-- CreateIndex
CREATE INDEX "PreFactura_cotizacionVentaId_idx" ON "PreFactura"("cotizacionVentaId");

-- CreateIndex
CREATE INDEX "PreFactura_facturado_idx" ON "PreFactura"("facturado");

-- CreateIndex
CREATE INDEX "PreFactura_tipoDocumentoFinalId_idx" ON "PreFactura"("tipoDocumentoFinalId");

-- CreateIndex
CREATE INDEX "PreFactura_serieDocFinalId_idx" ON "PreFactura"("serieDocFinalId");

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_submoduloId_fkey" FOREIGN KEY ("submoduloId") REFERENCES "SubmoduloSistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContableInterfaz" ADD CONSTRAINT "AsientoContableInterfaz_tipoReferenciaId_fkey" FOREIGN KEY ("tipoReferenciaId") REFERENCES "TipoReferenciaMovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_contactoClienteId_fkey" FOREIGN KEY ("contactoClienteId") REFERENCES "ContactoEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_dirEntregaId_fkey" FOREIGN KEY ("dirEntregaId") REFERENCES "DireccionEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_dirFiscalId_fkey" FOREIGN KEY ("dirFiscalId") REFERENCES "DireccionEntidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_respVentasId_fkey" FOREIGN KEY ("respVentasId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_autorizaVentaId_fkey" FOREIGN KEY ("autorizaVentaId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_tipoProductoId_fkey" FOREIGN KEY ("tipoProductoId") REFERENCES "TipoProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_cotizacionVentaId_fkey" FOREIGN KEY ("cotizacionVentaId") REFERENCES "CotizacionVentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_tipoDocumentoFinalId_fkey" FOREIGN KEY ("tipoDocumentoFinalId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreFactura" ADD CONSTRAINT "PreFactura_serieDocFinalId_fkey" FOREIGN KEY ("serieDocFinalId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCuentasContable" ADD CONSTRAINT "PlanCuentasContable_cuentaPadreId_fkey" FOREIGN KEY ("cuentaPadreId") REFERENCES "PlanCuentasContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoContable" ADD CONSTRAINT "PeriodoContable_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoContable" ADD CONSTRAINT "PeriodoContable_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoContable" ADD CONSTRAINT "PeriodoContable_cerradoPor_fkey" FOREIGN KEY ("cerradoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoContable" ADD CONSTRAINT "PeriodoContable_reabiertoPor_fkey" FOREIGN KEY ("reabiertoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoContable" ADD CONSTRAINT "PeriodoContable_bloqueadoPor_fkey" FOREIGN KEY ("bloqueadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_periodoContableId_fkey" FOREIGN KEY ("periodoContableId") REFERENCES "PeriodoContable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_submoduloOrigenId_fkey" FOREIGN KEY ("submoduloOrigenId") REFERENCES "SubmoduloSistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_aprobadoPor_fkey" FOREIGN KEY ("aprobadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoContable" ADD CONSTRAINT "AsientoContable_anuladoPor_fkey" FOREIGN KEY ("anuladoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_planCuentaId_fkey" FOREIGN KEY ("planCuentaId") REFERENCES "PlanCuentasContable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleAsientoContable" ADD CONSTRAINT "DetalleAsientoContable_tipoDocumentoOrigenId_fkey" FOREIGN KEY ("tipoDocumentoOrigenId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "SedesEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_tipoComprobanteId_fkey" FOREIGN KEY ("tipoComprobanteId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_entidadComercialId_fkey" FOREIGN KEY ("entidadComercialId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_tipoDocumentoClienteId_fkey" FOREIGN KEY ("tipoDocumentoClienteId") REFERENCES "TiposDocIdentidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_estadoOSEId_fkey" FOREIGN KEY ("estadoOSEId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_estadoSUNATId_fkey" FOREIGN KEY ("estadoSUNATId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_asientoContableId_fkey" FOREIGN KEY ("asientoContableId") REFERENCES "AsientoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteElectronico" ADD CONSTRAINT "ComprobanteElectronico_comprobanteModificaId_fkey" FOREIGN KEY ("comprobanteModificaId") REFERENCES "ComprobanteElectronico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleComprobante" ADD CONSTRAINT "DetalleComprobante_comprobanteElectronicoId_fkey" FOREIGN KEY ("comprobanteElectronicoId") REFERENCES "ComprobanteElectronico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleComprobante" ADD CONSTRAINT "DetalleComprobante_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleComprobante" ADD CONSTRAINT "DetalleComprobante_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "UnidadMedida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleComprobante" ADD CONSTRAINT "DetalleComprobante_tipoAfectacionIGVId_fkey" FOREIGN KEY ("tipoAfectacionIGVId") REFERENCES "TipoAfectacionIGV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPagoComprobante" ADD CONSTRAINT "CuotaPagoComprobante_comprobanteElectronicoId_fkey" FOREIGN KEY ("comprobanteElectronicoId") REFERENCES "ComprobanteElectronico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioOSE" ADD CONSTRAINT "EnvioOSE_comprobanteElectronicoId_fkey" FOREIGN KEY ("comprobanteElectronicoId") REFERENCES "ComprobanteElectronico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_preFacturaId_fkey" FOREIGN KEY ("preFacturaId") REFERENCES "PreFactura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorCobrar" ADD CONSTRAINT "PagoCuentaPorCobrar_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "CuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaPorPagar" ADD CONSTRAINT "PagoCuentaPorPagar_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_tipoDocumentoFinalId_fkey" FOREIGN KEY ("tipoDocumentoFinalId") REFERENCES "TipoDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_serieDocFinalId_fkey" FOREIGN KEY ("serieDocFinalId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlujoCajaProyectado" ADD CONSTRAINT "FlujoCajaProyectado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlujoCajaProyectado" ADD CONSTRAINT "FlujoCajaProyectado_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlujoCajaProyectado" ADD CONSTRAINT "FlujoCajaProyectado_aprobadoPor_fkey" FOREIGN KEY ("aprobadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleFlujoCajaProyectado" ADD CONSTRAINT "DetalleFlujoCajaProyectado_flujoCajaProyectadoId_fkey" FOREIGN KEY ("flujoCajaProyectadoId") REFERENCES "FlujoCajaProyectado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleFlujoCajaProyectado" ADD CONSTRAINT "DetalleFlujoCajaProyectado_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleFlujoCajaProyectado" ADD CONSTRAINT "DetalleFlujoCajaProyectado_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleFlujoCajaProyectado" ADD CONSTRAINT "DetalleFlujoCajaProyectado_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionBancaria" ADD CONSTRAINT "ConciliacionBancaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionBancaria" ADD CONSTRAINT "ConciliacionBancaria_cuentaCorrienteId_fkey" FOREIGN KEY ("cuentaCorrienteId") REFERENCES "CuentaCorriente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionBancaria" ADD CONSTRAINT "ConciliacionBancaria_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionBancaria" ADD CONSTRAINT "ConciliacionBancaria_conciliadoPor_fkey" FOREIGN KEY ("conciliadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleConciliacionBancaria" ADD CONSTRAINT "DetalleConciliacionBancaria_conciliacionBancariaId_fkey" FOREIGN KEY ("conciliacionBancariaId") REFERENCES "ConciliacionBancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleConciliacionBancaria" ADD CONSTRAINT "DetalleConciliacionBancaria_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UbicacionLetra" ADD CONSTRAINT "UbicacionLetra_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UbicacionLetra" ADD CONSTRAINT "UbicacionLetra_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_giradoId_fkey" FOREIGN KEY ("giradoId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_avalId_fkey" FOREIGN KEY ("avalId") REFERENCES "EntidadComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "CuentaPorCobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_bancoDescontoId_fkey" FOREIGN KEY ("bancoDescontoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_letraRenovadaId_fkey" FOREIGN KEY ("letraRenovadaId") REFERENCES "LetraCambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetraCambio" ADD CONSTRAINT "LetraCambio_ubicacionLetraId_fkey" FOREIGN KEY ("ubicacionLetraId") REFERENCES "UbicacionLetra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLetraCambio" ADD CONSTRAINT "PagoLetraCambio_letraCambioId_fkey" FOREIGN KEY ("letraCambioId") REFERENCES "LetraCambio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLetraCambio" ADD CONSTRAINT "PagoLetraCambio_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLetraCambio" ADD CONSTRAINT "PagoLetraCambio_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLetraCambio" ADD CONSTRAINT "PagoLetraCambio_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLetraCambio" ADD CONSTRAINT "PagoLetraCambio_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLetraCambio" ADD CONSTRAINT "PagoLetraCambio_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndosoLetraCambio" ADD CONSTRAINT "EndosoLetraCambio_letraCambioId_fkey" FOREIGN KEY ("letraCambioId") REFERENCES "LetraCambio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndosoLetraCambio" ADD CONSTRAINT "EndosoLetraCambio_endosanteId_fkey" FOREIGN KEY ("endosanteId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndosoLetraCambio" ADD CONSTRAINT "EndosoLetraCambio_endosatarioId_fkey" FOREIGN KEY ("endosatarioId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndosoLetraCambio" ADD CONSTRAINT "EndosoLetraCambio_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_tipoDocProveedorId_fkey" FOREIGN KEY ("tipoDocProveedorId") REFERENCES "TiposDocIdentidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_tipoRetencionId_fkey" FOREIGN KEY ("tipoRetencionId") REFERENCES "TipoRetencionPercepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retencion" ADD CONSTRAINT "Retencion_movimientoCajaId_fkey" FOREIGN KEY ("movimientoCajaId") REFERENCES "MovimientoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleRetencion" ADD CONSTRAINT "DetalleRetencion_retencionId_fkey" FOREIGN KEY ("retencionId") REFERENCES "Retencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleRetencion" ADD CONSTRAINT "DetalleRetencion_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_serieDocId_fkey" FOREIGN KEY ("serieDocId") REFERENCES "SerieDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "EntidadComercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_tipoDocProveedorId_fkey" FOREIGN KEY ("tipoDocProveedorId") REFERENCES "TiposDocIdentidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_tipoPercepcionId_fkey" FOREIGN KEY ("tipoPercepcionId") REFERENCES "TipoRetencionPercepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Percepcion" ADD CONSTRAINT "Percepcion_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "CuentaPorPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePercepcion" ADD CONSTRAINT "DetallePercepcion_percepcionId_fkey" FOREIGN KEY ("percepcionId") REFERENCES "Percepcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePercepcion" ADD CONSTRAINT "DetallePercepcion_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "TipoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoAnual" ADD CONSTRAINT "PresupuestoAnual_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoAnual" ADD CONSTRAINT "PresupuestoAnual_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoAnual" ADD CONSTRAINT "PresupuestoAnual_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoMultiFuncion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoAnual" ADD CONSTRAINT "PresupuestoAnual_aprobadoPor_fkey" FOREIGN KEY ("aprobadoPor") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPresupuesto" ADD CONSTRAINT "LineaPresupuesto_presupuestoAnualId_fkey" FOREIGN KEY ("presupuestoAnualId") REFERENCES "PresupuestoAnual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPresupuesto" ADD CONSTRAINT "LineaPresupuesto_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPresupuesto" ADD CONSTRAINT "LineaPresupuesto_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EjecucionPresupuestal" ADD CONSTRAINT "EjecucionPresupuestal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EjecucionPresupuestal" ADD CONSTRAINT "EjecucionPresupuestal_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "PlanCuentasContable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EjecucionPresupuestal" ADD CONSTRAINT "EjecucionPresupuestal_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_cuentaContableDebeId_fkey" FOREIGN KEY ("cuentaContableDebeId") REFERENCES "PlanCuentasContable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCuentaContable" ADD CONSTRAINT "ConfiguracionCuentaContable_cuentaContableHaberId_fkey" FOREIGN KEY ("cuentaContableHaberId") REFERENCES "PlanCuentasContable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
