import prisma from "../../config/prismaClient.js";
import { ValidationError } from "../../utils/errors.js";
import crearMovimientoAlmacenService from "../Almacen/crearMovimientoAlmacen.service.js";
import buscarPrecioProductoService from "../Ventas/buscarPrecioProducto.service.js";
import crearPreFacturaCompletaService from "../Ventas/crearPreFacturaCompleta.service.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";

/**
 * Servicio para finalizar una descarga de consumo y generar movimientos de almacén
 *
 * Genera DOS movimientos automáticamente:
 * - INGRESO (Concepto 1): De Proveedor MEGUI a Almacén
 * - SALIDA (Concepto 3): De Almacén a Cliente
 *
 * @param {BigInt} descargaConsumoId - ID de la descarga de faena consumo
 * @param {BigInt} novedadPescaConsumoId - ID de la novedad de pesca consumo
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Resultado con movimientos generados
 */
const finalizarDescargaConsumoConMovimientos = async (
  descargaConsumoId,
  novedadPescaConsumoId,
  usuarioId,
) => {
  // ============================================
  // VALIDACIÓN INICIAL: usuarioId es obligatorio
  // ============================================
  if (!usuarioId) {
    throw new ValidationError(
      "usuarioId es obligatorio para finalizar la descarga. Debe estar autenticado.",
    );
  }

  return await prisma.$transaction(async (tx) => {
    try {
      // ============================================
      // PASO 1: VALIDAR Y OBTENER DATOS BASE
      // ============================================

      const novedad = await tx.novedadPescaConsumo.findUnique({
        where: { id: novedadPescaConsumoId },
      });
      if (!novedad) {
        throw new ValidationError("Novedad de pesca consumo no encontrada");
      }

      const descarga = await tx.descargaFaenaConsumo.findUnique({
        where: { id: descargaConsumoId },
        include: {
          faenaPescaConsumo: {
            include: {
              embarcacion: true,
            },
          },
        },
      });

      if (!descarga) {
        throw new ValidationError("Descarga de faena consumo no encontrada");
      }

      if (!descarga.faenaPescaConsumo) {
        throw new ValidationError("La descarga no tiene una faena asociada");
      }

      if (!descarga.clienteId) {
        throw new ValidationError("La descarga no tiene un cliente asociado");
      }

      // ============================================
      // ELIMINAR MOVIMIENTOS EXISTENTES SI LOS HAY (REGENERACIÓN)
      // ============================================

      let esRegeneracion = false;

      if (descarga.movIngresoAlmacenId || descarga.movSalidaAlmacenId) {
        esRegeneracion = true;

        // PASO 1: Buscar y eliminar PreFactura vinculada al movimiento de salida
        if (descarga.movSalidaAlmacenId) {
          const preFacturaVinculada = await tx.preFactura.findFirst({
            where: { movSalidaAlmacenId: descarga.movSalidaAlmacenId },
          });

          if (preFacturaVinculada) {

            // Eliminar detalles de PreFactura
            await tx.detallePreFactura.deleteMany({
              where: { preFacturaId: preFacturaVinculada.id },
            });

            // Eliminar PreFactura
            await tx.preFactura.delete({
              where: { id: preFacturaVinculada.id },
            });

          }
        }

        // PASO 2: Importar servicio de eliminación de movimientos
        const { default: eliminarMovimientoAlmacenService } =
          await import("../Almacen/eliminarMovimientoAlmacen.service.js");

        // PASO 3: Eliminar movimiento de ingreso si existe
        if (descarga.movIngresoAlmacenId) {
          await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
            descarga.movIngresoAlmacenId,
            tx,
          );
        }

        // PASO 4: Eliminar movimiento de salida si existe
        if (descarga.movSalidaAlmacenId) {
          await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
            descarga.movSalidaAlmacenId,
            tx,
          );
        }
      }

      const parametroAprobador = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: novedad.empresaId,
          moduloSistemaId: BigInt(6),
          cesado: false,
          vigenteDesde: { lte: new Date() },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date() } }],
        },
      });

      if (!parametroAprobador) {
        throw new ValidationError(
          `No se encontró un responsable de almacén vigente para la empresa ${novedad.empresaId} en el módulo de Inventarios. Por favor configure un ParametroAprobador con moduloSistemaId=6`,
        );
      }
      const empresaMegui = await tx.empresa.findUnique({
        where: { id: novedad.empresaId },
        select: { entidadComercialId: true },
      });

      if (!empresaMegui || !empresaMegui.entidadComercialId) {
        throw new ValidationError(
          "La empresa no tiene una entidad comercial asociada",
        );
      }

      // ============================================
      // PASO 2: CALCULAR COSTO UNITARIO
      // ============================================

      const costoUnitario = await calcularCostoUnitarioConsumo(
        tx,
        novedadPescaConsumoId,
        [descarga],
      );

      // ============================================
      // PASO 3: BUSCAR PRODUCTO
      // ============================================

      // El producto es de MEGUI (empresaId), no del cliente
      const producto = await tx.producto.findFirst({
        where: {
          empresaId: novedad.empresaId,
          especieId: descarga.especieId,
          cesado: false,
        },
      });

      if (!producto) {
        throw new ValidationError(
          `No se encontró un producto activo para la empresa ${novedad.empresaId} y especie ${descarga.especieId}`,
        );
      }

      const fechaVencimiento = new Date(descarga.fechaHoraInicioDescarga);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      // ============================================
      // PASO 4: BUSCAR SERIE PARA INGRESO
      // ============================================

      const serieIngreso = await tx.serieDoc.findFirst({
        where: {
          empresaId: novedad.empresaId,
          tipoDocumentoId: BigInt(13), // INGRESO A ALMACÉN
          tipoAlmacenId: BigInt(2), // MATERIA PRIMA
          activo: true,
        },
      });

      if (!serieIngreso) {
        throw new ValidationError(
          `No se encontró una serie activa para INGRESO A ALMACÉN (Materia Prima) en la empresa ${novedad.empresaId}. ` +
          `Por favor, configure una serie en el módulo de Series de Documentos con Tipo Documento=INGRESO y Tipo Almacén=MATERIA PRIMA.`,
        );
      }

      // ============================================
      // PASO 5: GENERAR MOVIMIENTO DE INGRESO
      // ============================================

      const cabeceraIngreso = {
        empresaId: novedad.empresaId,
        tipoDocumentoId: BigInt(13),
        conceptoMovAlmacenId: BigInt(4), // PESCA CONSUMO INGRESO
        serieDocId: serieIngreso.id,
        fechaDocumento: new Date(),
        entidadComercialId: empresaMegui.entidadComercialId,
        estadoDocAlmacenId: BigInt(30),
        faenaPescaId: descarga.faenaPescaConsumo?.id,
        embarcacionId: descarga.faenaPescaConsumo?.embarcacionId,
        personalRespAlmacen: parametroAprobador.personalRespId,
        esCustodia: false,
        unidadNegocioId: novedad.unidadNegocioId,
        observaciones: `Ingreso automático - Novedad Consumo ID: ${novedad.id} - Resolución: ${novedad.numeroResolucion || "N/A"} - Fecha: ${novedad.fechaInicio ? new Date(novedad.fechaInicio).toLocaleDateString("es-PE") : "N/A"} - Faena ID: ${descarga.faenaPescaConsumoId} - Descarga ID: ${descarga.id} - Fecha Descarga: ${descarga.fechaHoraInicioDescarga ? new Date(descarga.fechaHoraInicioDescarga).toLocaleDateString("es-PE") : "N/A"}`,
      };

      const detallesIngreso = [
        {
          productoId: producto.id,
          cantidad: descarga.toneladas,
          peso: descarga.toneladas,
          lote: novedad.numeroResolucion || "",
          fechaProduccion: descarga.fechaHoraInicioDescarga,
          fechaVencimiento: fechaVencimiento,
          fechaIngreso: descarga.fechaHoraInicioDescarga,
          nroSerie: "",
          nroContenedor: "",
          estadoMercaderiaId: BigInt(6),
          estadoCalidadId: BigInt(10),
          entidadComercialId: descarga.clienteId,
          esCustodia: false,
          empresaId: novedad.empresaId,
          costoUnitario: costoUnitario,
          observaciones: null,
        },
      ];

      const movimientoIngreso =
        await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
          cabeceraIngreso,
          detallesIngreso,
          usuarioId,
          tx,
        );

      // ============================================
      // PASO 6: BUSCAR SERIE PARA SALIDA
      // ============================================

      const serieSalida = await tx.serieDoc.findFirst({
        where: {
          empresaId: novedad.empresaId,
          tipoDocumentoId: BigInt(14), // SALIDA DE ALMACÉN
          tipoAlmacenId: BigInt(2), // MATERIA PRIMA
          activo: true,
        },
      });

      if (!serieSalida) {
        throw new ValidationError(
          `No se encontró una serie activa para SALIDA DE ALMACÉN (Materia Prima) en la empresa ${novedad.empresaId}. ` +
          `Por favor, configure una serie en el módulo de Series de Documentos con Tipo Documento=SALIDA y Tipo Almacén=MATERIA PRIMA.`,
        );
      }

      // ============================================
      // PASO 7: GENERAR MOVIMIENTO DE SALIDA
      // ============================================

      const cabeceraSalida = {
        empresaId: novedad.empresaId,
        tipoDocumentoId: BigInt(14),
        conceptoMovAlmacenId: BigInt(5), // PREFACTURA PESCA CONSUMO SALIDA
        serieDocId: serieSalida.id,
        fechaDocumento: new Date(),
        entidadComercialId: descarga.clienteId,
        estadoDocAlmacenId: BigInt(30),
        faenaPescaId: descarga.faenaPescaConsumo?.id,
        embarcacionId: descarga.faenaPescaConsumo?.embarcacionId,
        personalRespAlmacen: parametroAprobador.personalRespId,
        esCustodia: false,
        unidadNegocioId: novedad.unidadNegocioId,
        observaciones: `Salida automática - Novedad Consumo ID: ${novedad.id} - Resolución: ${novedad.numeroResolucion || "N/A"} - Fecha: ${novedad.fechaInicio ? new Date(novedad.fechaInicio).toLocaleDateString("es-PE") : "N/A"} - Faena ID: ${descarga.faenaPescaConsumoId} - Descarga ID: ${descarga.id} - Fecha Descarga: ${descarga.fechaHoraInicioDescarga ? new Date(descarga.fechaHoraInicioDescarga).toLocaleDateString("es-PE") : "N/A"}`,
      };

      const detallesSalida = [
        {
          productoId: producto.id,
          cantidad: descarga.toneladas,
          peso: descarga.toneladas,
          lote: novedad.numeroResolucion || "",
          fechaProduccion: descarga.fechaHoraInicioDescarga,
          fechaVencimiento: fechaVencimiento,
          fechaIngreso: descarga.fechaHoraInicioDescarga,
          nroSerie: "",
          nroContenedor: "",
          estadoMercaderiaId: BigInt(6),
          estadoCalidadId: BigInt(10),
          entidadComercialId: descarga.clienteId,
          esCustodia: false,
          empresaId: novedad.empresaId,
          costoUnitario: costoUnitario,
          observaciones: null,
        },
      ];

      const movimientoSalida =
        await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
          cabeceraSalida,
          detallesSalida,
          usuarioId,
          tx,
        );

      // ============================================
      // PASO 8: GENERAR PREFACTURA AUTOMÁTICAMENTE
      // ============================================

      let preFacturaGenerada = null;

      try {
        // 6.1: Buscar precio del producto (primero cliente, luego MEGUI)
        let precioInfo = await buscarPrecioProductoService.buscarPrecioProducto(
          descarga.clienteId,
          producto.id,
          tx,
        );

        if (!precioInfo) {
          precioInfo = await buscarPrecioProductoService.buscarPrecioProducto(
            empresaMegui.entidadComercialId,
            producto.id,
            tx,
          );
        }

        if (!precioInfo) {
          console.warn(
            `⚠️ No se encontró precio para producto ${producto.id}. PreFactura no será generada.`,
          );
        } else {
          // 6.2: Obtener tipo de cambio
          const tipoCambio = await validarTipoCambio(null, new Date());

          // 6.3: Convertir precio si es necesario
          let precioUnitarioFinal = precioInfo.precio;
          const monedaPreFactura = BigInt(1); // PEN por defecto

          if (precioInfo.monedaId !== monedaPreFactura) {
            if (
              precioInfo.monedaId === BigInt(2) &&
              monedaPreFactura === BigInt(1)
            ) {
              // USD → PEN
              precioUnitarioFinal = precioInfo.precio * Number(tipoCambio);
            } else if (
              precioInfo.monedaId === BigInt(1) &&
              monedaPreFactura === BigInt(2)
            ) {
              // PEN → USD
              precioUnitarioFinal = precioInfo.precio / Number(tipoCambio);
            }
          }

          // 6.4: Calcular montos
          const cantidad = Number(descarga.toneladas);
          const subtotal = cantidad * precioUnitarioFinal;
          const exoneradoIgv = false; // Ajustar según cliente si es necesario
          const porcentajeIgv = exoneradoIgv ? 0 : 18.0;
          const totalIGV = exoneradoIgv ? 0 : subtotal * 0.18;
          const total = subtotal + totalIGV;

          // 8.6: Obtener serie de PreFactura
          const seriePreFactura = await tx.serieDoc.findFirst({
            where: {
              empresaId: novedad.empresaId,
              tipoDocumentoId: BigInt(19), // PRE FACTURA
              tipoAlmacenId: BigInt(2), // MATERIA PRIMA
              activo: true,
            },
          });

          if (!seriePreFactura) {
            console.warn(
              `⚠️ No se encontró serie activa para PRE FACTURA (Materia Prima) en empresa ${novedad.empresaId}. ` +
              `PreFactura no será generada. Configure una serie con Tipo Documento=PRE FACTURA y Tipo Almacén=MATERIA PRIMA.`,
            );
          } else {
            // 8.7: Preparar cabecera de PreFactura
            const fechaDocumentoPreFactura = new Date();
            const cabeceraPreFactura = {
              empresaId: novedad.empresaId,
              tipoDocumentoId: BigInt(19),
              serieDocId: seriePreFactura.id,
              fechaDocumento: fechaDocumentoPreFactura,
              fechaVencimiento: fechaDocumentoPreFactura, // Misma fecha que fechaDocumento
              clienteId: descarga.clienteId,
              respVentasId: parametroAprobador.personalRespId,
              tipoProductoId: BigInt(1), // Tipo producto por defecto (Hidrobiológico)
              formaPagoId: BigInt(1), // Contado por defecto
              monedaId: monedaPreFactura,
              tipoCambio: Number(tipoCambio),
              subtotal: subtotal,
              totalDescuentos: 0,
              totalIGV: totalIGV,
              total: total,
              estadoId: BigInt(45), // Pendiente
              exoneradoIgv: exoneradoIgv,
              porcentajeIgv: porcentajeIgv,
              movSalidaAlmacenId: movimientoSalida.movimiento.id,
              unidadNegocioId: novedad.unidadNegocioId,
              centroCostoId: BigInt(24),
              observaciones: `PreFactura automática - Novedad Consumo ID: ${novedad.id} - Resolución: ${novedad.numeroResolucion || "N/A"} - Faena ID: ${descarga.faenaPescaConsumoId} - Descarga ID: ${descarga.id}`,
            };

            // 8.8: Preparar detalles de PreFactura
            const detallesPreFactura = [
              {
                productoId: producto.id,
                cantidad: cantidad,
                precioUnitario: precioUnitarioFinal,
              },
            ];

            // 8.9: Crear PreFactura
            preFacturaGenerada =
              await crearPreFacturaCompletaService.crearPreFacturaCompleta(
                cabeceraPreFactura,
                detallesPreFactura,
                usuarioId,
                tx,
              );
            
            // Actualizar movimiento de salida con pedidoVentaId
            await tx.movimientoAlmacen.update({
              where: { id: movimientoSalida.movimiento.id },
              data: { pedidoVentaId: preFacturaGenerada.preFactura.id }
            });
          }
        }
      } catch (errorPreFactura) {
        // ⚠️ Si falla la PreFactura, solo registrar el error pero NO detener el proceso
        console.error(
          "⚠️ Error al generar PreFactura (no crítico):",
          errorPreFactura.message,
        );
        console.error(
          "Los movimientos de almacén se completaron exitosamente.",
        );
      }

      // ============================================
      // PASO 9: ACTUALIZAR DESCARGA CON IDs DE MOVIMIENTOS
      // ============================================

      await tx.descargaFaenaConsumo.update({
        where: { id: descargaConsumoId },
        data: {
          movIngresoAlmacenId: movimientoIngreso.movimiento.id,
          movSalidaAlmacenId: movimientoSalida.movimiento.id,
          actualizadoEn: new Date(),
        },
      });

      // ============================================
      // PASO 10: RETORNAR RESULTADO
      // ============================================

      const resultado = {
        descarga: {
          id: descarga.id,
          faenaPescaConsumoId: descarga.faenaPescaConsumoId,
        },
        movimientoIngreso: {
          id: movimientoIngreso.movimiento.id,
          numeroDocumento: movimientoIngreso.movimiento.numeroDocumento,
          cantidadDetalles: movimientoIngreso.movimiento.detalles?.length || 0,
        },
        movimientoSalida: {
          id: movimientoSalida.movimiento.id,
          numeroDocumento: movimientoSalida.movimiento.numeroDocumento,
          cantidadDetalles: movimientoSalida.movimiento.detalles?.length || 0,
        },
        mensaje:
          "Descarga consumo finalizada exitosamente. Se generaron 2 movimientos de almacén con sus kardex.",
      };

      // Agregar información de PreFactura si se generó
      if (preFacturaGenerada) {
        resultado.preFactura = {
          id: preFacturaGenerada.preFactura.id,
          codigo: preFacturaGenerada.preFactura.codigo,
          numeroDocumento: preFacturaGenerada.preFactura.numeroDocumento,
          total: preFacturaGenerada.preFactura.total,
        };
        resultado.mensaje += " PreFactura generada exitosamente.";
      }

      return resultado;
    } catch (error) {
      console.error(
        "❌ Error en finalizarDescargaConsumoConMovimientos:",
        error,
      );
      throw error;
    }
  });
};

/**
 * Calcula el costo unitario desde las entregas a rendir de consumo
 */
/**
 * Calcula el costo unitario para NovedadPescaConsumo (Consumo Humano Directo)
 * 
 * IMPORTANTE: Usa las TONELADAS DESCARGADAS como base de cálculo, NO una cuota.
 * Esto es porque en pesca de consumo humano directo NO hay límite de cuota asignada
 * por PRODUCE. Los gastos se distribuyen solo sobre lo que realmente se capturó.
 * 
 * Fórmula: Costo Unitario = Total Egresos ÷ Total Toneladas Descargadas
 * 
 * DIFERENCIA CON TEMPORADA PESCA:
 * - TemporadaPesca: Usa cuota asignada (fija, establecida por PRODUCE)
 * - NovedadPescaConsumo: Usa toneladas descargadas (variable, sin límite)
 */
async function calcularCostoUnitarioConsumo(
  tx,
  novedadPescaConsumoId,
  descargas,
) {
  try {
    // 1. Obtener entregas a rendir (egresos)
    const entregaRendir = await tx.entregaARendirPescaConsumo.findFirst({
      where: { novedadPescaConsumoId: novedadPescaConsumoId },
      include: {
        movimientos: {
          where: {
            tipoMovimientoId: BigInt(2), // Egresos
          },
        },
      },
    });

    if (
      !entregaRendir ||
      !entregaRendir.movimientos ||
      entregaRendir.movimientos.length === 0
    ) {
      return 0;
    }

    // 2. Calcular total de egresos
    const totalEgresos = entregaRendir.movimientos.reduce((sum, detalle) => {
      return sum + Number(detalle.monto || 0);
    }, 0);

    // 3. BASE DE CÁLCULO: TONELADAS DESCARGADAS (no hay cuota asignada)
    const totalToneladas = descargas.reduce((sum, descarga) => {
      return sum + Number(descarga.toneladas || 0);
    }, 0);

    if (totalToneladas === 0) {
      return 0;
    }

    // 4. Calcular costo unitario
    const costoUnitario = totalEgresos / totalToneladas;

    return costoUnitario;
  } catch (error) {
    console.error("❌ Error calculando costo unitario consumo:", error);
    return 0;
  }
}

export default {
  finalizarDescargaConsumoConMovimientos,
};
