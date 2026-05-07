import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio para obtener documentos origen polimórficos
 * Soporta 15 modelos diferentes de origen para asientos contables
 * VALIDADO 100% CON SCHEMA.PRISMA
 * Documentado en español.
 */

/**
 * Obtiene documentos origen según el modelo especificado
 * @param {string} nombreModelo - Nombre del modelo (PreFactura, OrdenCompra, etc.)
 * @param {string} entidadComercialId - ID de la entidad comercial
 * @param {string} empresaId - ID de la empresa
 * @returns {Promise<Array>} Lista de documentos origen
 */
/**
 * Obtiene documentos origen según el modelo especificado
 * @param {string} nombreModelo - Nombre del modelo (PreFactura, OrdenCompra, etc.)
 * @param {string|null} entidadComercialId - ID de la entidad comercial (OPCIONAL)
 * @param {string} empresaId - ID de la empresa
 * @returns {Promise<Array>} Lista de documentos origen
 */
const obtenerPorModelo = async (
  nombreModelo,
  entidadComercialId,
  empresaId,
) => {
  try {
    if (!empresaId) {
      throw new ValidationError("Se requiere empresaId");
    }
    // entidadComercialId es OPCIONAL

    let registros = [];

    switch (nombreModelo) {
      // ========================================
      // GRUPO A: DOCUMENTOS COMERCIALES
      // ========================================

      case "PreFactura":
        {
          const wherePreFactura = {
            empresaId: Number(empresaId),
            // SIN FILTRO DE ESTADO - Cargar todas las prefacturas
          };

          if (entidadComercialId) {
            wherePreFactura.clienteId = Number(entidadComercialId);
          }

          registros = await prisma.preFactura.findMany({
            where: wherePreFactura,
            include: {
              tipoDocumento: true,
              cliente: true,
              moneda: true,
              // NO incluir estado - PreFactura no tiene esa relación en el schema
            },
            orderBy: {
              fechaDocumento: "desc",
            },
          });

          // Agregar estadoId manualmente al resultado para el frontend
          registros = registros.map((pf) => ({
            ...pf,
            estado: { id: pf.estadoId, descripcion: null }, // Solo incluir el ID
          }));
        }
        break;

      case "OrdenCompra":
        {
          const whereOrdenCompra = {
            empresaId: Number(empresaId),
            // SIN FILTRO DE ESTADO - Cargar todas las órdenes
          };

          if (entidadComercialId) {
            whereOrdenCompra.proveedorId = Number(entidadComercialId);
          }

          registros = await prisma.ordenCompra.findMany({
            where: whereOrdenCompra,
            include: {
              tipoDocumento: true,
              proveedor: true,
              moneda: true,
              estado: true, // INCLUIR ESTADO
            },
            orderBy: {
              fechaDocumento: "desc",
            },
          });
        }
        break;

      // ========================================
      // GRUPO B: CUENTAS POR COBRAR/PAGAR
      // ========================================

      case "CuentaPorCobrar":
        {
          const whereCxC = {
            empresaId: Number(empresaId),
            // SIN FILTRO DE ESTADO
          };

          if (entidadComercialId) {
            whereCxC.clienteId = Number(entidadComercialId);
          }

          registros = await prisma.cuentaPorCobrar.findMany({
            where: whereCxC,
            include: {
              tipoDocumento: true,
              cliente: true,
              moneda: true,
              estado: true, // INCLUIR ESTADO
            },
            orderBy: {
              fechaEmision: "desc",
            },
          });
        }
        break;

      case "CuentaPorPagar":
        {
          const whereCxP = {
            empresaId: Number(empresaId),
            // SIN FILTRO DE ESTADO
          };

          if (entidadComercialId) {
            whereCxP.proveedorId = Number(entidadComercialId);
          }

          registros = await prisma.cuentaPorPagar.findMany({
            where: whereCxP,
            include: {
              tipoDocumento: true,
              proveedor: true,
              moneda: true,
              estado: true, // INCLUIR ESTADO
            },
            orderBy: {
              fechaEmision: "desc",
            },
          });
        }
        break;

      // ========================================
      // GRUPO C: TESORERÍA
      // ========================================

      case "MovimientoCaja":
        {
          const whereMovCaja = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereMovCaja.entidadComercialId = Number(entidadComercialId);
          }

          registros = await prisma.movimientoCaja.findMany({
            where: whereMovCaja,
            include: {
              tipoDocumento: true,
              entidadComercial: true,
              moneda: true,
            },
            orderBy: {
              fechaMovimiento: "desc",
            },
          });
        }
        break;

      case "CuentaCorriente":
        {
          const whereCuentaCorriente = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereCuentaCorriente.entidadFinancieraId =
              Number(entidadComercialId);
          }

          registros = await prisma.cuentaCorriente.findMany({
            where: whereCuentaCorriente,
            include: {
              tipoDocumento: true,
              entidadFinanciera: true,
              moneda: true,
            },
            orderBy: {
              fechaMovimiento: "desc",
            },
          });
        }
        break;

      case "PrestamoBancario":
        {
          const wherePrestamo = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            wherePrestamo.entidadFinancieraId = Number(entidadComercialId);
          }

          registros = await prisma.prestamoBancario.findMany({
            where: wherePrestamo,
            include: {
              tipoDocumento: true,
              entidadFinanciera: true,
              moneda: true,
            },
            orderBy: {
              fechaDesembolso: "desc",
            },
          });
        }
        break;

      // ========================================
      // GRUPO D: ALMACÉN
      // ========================================

      case "MovimientoAlmacen":
        {
          const whereMovAlmacen = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereMovAlmacen.entidadComercialId = Number(entidadComercialId);
          }

          registros = await prisma.movimientoAlmacen.findMany({
            where: whereMovAlmacen,
            include: {
              tipoDocumento: true,
              entidadComercial: true,
            },
            orderBy: {
              fechaMovimiento: "desc",
            },
          });
        }
        break;

      // ========================================
      // GRUPO E: ENTREGAS A RENDIR
      // ========================================

      case "EntregaARendir":
        {
          const whereEntrega = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereEntrega.personalId = Number(entidadComercialId);
          }

          registros = await prisma.entregaARendir.findMany({
            where: whereEntrega,
            include: {
              tipoDocumento: true,
              personal: true,
              moneda: true,
            },
            orderBy: {
              fechaEntrega: "desc",
            },
          });
        }
        break;

      case "EntregaARendirPVentas":
        {
          const whereEntregaVentas = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereEntregaVentas.personalId = Number(entidadComercialId);
          }

          registros = await prisma.entregaARendirPVentas.findMany({
            where: whereEntregaVentas,
            include: {
              tipoDocumento: true,
              personal: true,
              moneda: true,
            },
            orderBy: {
              fechaEntrega: "desc",
            },
          });
        }
        break;

      case "EntregaARendirPCompras":
        {
          const whereEntregaCompras = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereEntregaCompras.personalId = Number(entidadComercialId);
          }

          registros = await prisma.entregaARendirPCompras.findMany({
            where: whereEntregaCompras,
            include: {
              tipoDocumento: true,
              personal: true,
              moneda: true,
            },
            orderBy: {
              fechaEntrega: "desc",
            },
          });
        }
        break;

      case "EntregaARendirMovAlmacen":
        {
          const whereEntregaAlmacen = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereEntregaAlmacen.personalId = Number(entidadComercialId);
          }

          registros = await prisma.entregaARendirMovAlmacen.findMany({
            where: whereEntregaAlmacen,
            include: {
              tipoDocumento: true,
              personal: true,
              moneda: true,
            },
            orderBy: {
              fechaEntrega: "desc",
            },
          });
        }
        break;

      case "EntregaARendirPescaConsumo":
        {
          const whereEntregaPesca = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereEntregaPesca.personalId = Number(entidadComercialId);
          }

          registros = await prisma.entregaARendirPescaConsumo.findMany({
            where: whereEntregaPesca,
            include: {
              tipoDocumento: true,
              personal: true,
              moneda: true,
            },
            orderBy: {
              fechaEntrega: "desc",
            },
          });
        }
        break;

      case "EntregaARendirContratoServicios":
        {
          const whereEntregaServicios = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereEntregaServicios.personalId = Number(entidadComercialId);
          }

          registros = await prisma.entregaARendirContratoServicios.findMany({
            where: whereEntregaServicios,
            include: {
              tipoDocumento: true,
              personal: true,
              moneda: true,
            },
            orderBy: {
              fechaEntrega: "desc",
            },
          });
        }
        break;

      case "EntregaARendirOTMantenimiento":
        {
          const whereEntregaOT = {
            empresaId: Number(empresaId),
          };

          if (entidadComercialId) {
            whereEntregaOT.personalId = Number(entidadComercialId);
          }

          registros = await prisma.entregaARendirOTMantenimiento.findMany({
            where: whereEntregaOT,
            include: {
              tipoDocumento: true,
              personal: true,
              moneda: true,
            },
            orderBy: {
              fechaEntrega: "desc",
            },
          });
        }
        break;

      default:
        throw new ValidationError(
          `Modelo "${nombreModelo}" no soportado. Modelos válidos: PreFactura, OrdenCompra, CuentaPorCobrar, CuentaPorPagar, MovimientoCaja, CuentaCorriente, PrestamoBancario, MovimientoAlmacen, EntregaARendir, EntregaARendirPVentas, EntregaARendirPCompras, EntregaARendirMovAlmacen, EntregaARendirPescaConsumo, EntregaARendirContratoServicios, EntregaARendirOTMantenimiento`,
        );
    }

    return registros;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

export default {
  obtenerPorModelo,
};
