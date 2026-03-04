import prisma from '../../config/prismaClient.js';
import { ValidationError } from '../../utils/errors.js';
import crearMovimientoAlmacenService from '../Almacen/crearMovimientoAlmacen.service.js';
import buscarPrecioProductoService from '../Ventas/buscarPrecioProducto.service.js';
import crearPreFacturaCompletaService from '../Ventas/crearPreFacturaCompleta.service.js';
import { validarTipoCambio } from '../../utils/tipoCambio.util.js';

/**
 * Servicio para finalizar una descarga individual y generar movimientos de almacén
 * 
 * Genera DOS movimientos automáticamente:
 * - INGRESO (Concepto 1): De Proveedor MEGUI a Almacén
 * - SALIDA (Concepto 3): De Almacén a Cliente
 * 
 * @param {BigInt} descargaId - ID de la descarga de faena pesca
 * @param {BigInt} temporadaPescaId - ID de la temporada de pesca
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Resultado con movimientos generados
 */
const finalizarDescargaConMovimientos = async (descargaId, temporadaPescaId, usuarioId) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // ============================================
      // PASO 1: VALIDAR Y OBTENER DATOS BASE
      // ============================================
      
      const temporada = await tx.temporadaPesca.findUnique({
        where: { id: temporadaPescaId }
      });
      if (!temporada) {
        throw new ValidationError('Temporada de pesca no encontrada');
      }

      const descarga = await tx.descargaFaenaPesca.findUnique({
        where: { id: descargaId },
        include: {
          faenaPesca: {
            include: {
              embarcacion: true
            }
          }
        }
      });

      if (!descarga) {
        throw new ValidationError('Descarga de faena no encontrada');
      }

      if (!descarga.faenaPesca) {
        throw new ValidationError('La descarga no tiene una faena asociada');
      }

      if (!descarga.clienteId) {
        throw new ValidationError('La descarga no tiene un cliente asociado');
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
            where: { movSalidaAlmacenId: descarga.movSalidaAlmacenId }
          });
          
          if (preFacturaVinculada) {
            
            // Eliminar detalles de PreFactura
            await tx.detallePreFactura.deleteMany({
              where: { preFacturaId: preFacturaVinculada.id }
            });
            
            // Eliminar PreFactura
            await tx.preFactura.delete({
              where: { id: preFacturaVinculada.id }
            });
            
          }
        }
        
        // PASO 2: Importar servicio de eliminación de movimientos
        const { default: eliminarMovimientoAlmacenService } = 
          await import('../Almacen/eliminarMovimientoAlmacen.service.js');
        
        // PASO 3: Eliminar movimiento de ingreso si existe
        if (descarga.movIngresoAlmacenId) {
          await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
            descarga.movIngresoAlmacenId,
            tx
          );
        }
        
        // PASO 4: Eliminar movimiento de salida si existe
        if (descarga.movSalidaAlmacenId) {
          await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
            descarga.movSalidaAlmacenId,
            tx
          );
        }
        
      }

      const parametroAprobador = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: temporada.empresaId,
          moduloSistemaId: BigInt(6),
          cesado: false
        }
      });

      if (!parametroAprobador) {
        throw new ValidationError(
          'No se encontró un responsable de almacén configurado para esta empresa en el módulo de Inventarios'
        );
      }

      const empresaMegui = await tx.empresa.findUnique({
        where: { id: temporada.empresaId },
        select: { entidadComercialId: true }
      });

      if (!empresaMegui || !empresaMegui.entidadComercialId) {
        throw new ValidationError('La empresa no tiene una entidad comercial asociada');
      }

      // ============================================
      // PASO 2: CALCULAR COSTO UNITARIO
      // ============================================
      
      const costoUnitario = await calcularCostoUnitario(tx, temporadaPescaId, [descarga]);

      // ============================================
      // PASO 3: BUSCAR PRODUCTO
      // ============================================
      
      // El producto es de MEGUI (empresaId), no del cliente
      const producto = await tx.producto.findFirst({
        where: {
          empresaId: temporada.empresaId,
          especieId: descarga.especieId,
          cesado: false
        }
      });

      if (!producto) {
        throw new ValidationError(
          `No se encontró un producto activo para la empresa ${temporada.empresaId} y especie ${descarga.especieId}`
        );
      }

      const fechaVencimiento = new Date(descarga.fechaHoraInicioDescarga);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      // ============================================
      // PASO 4: BUSCAR SERIE PARA INGRESO
      // ============================================
      
      const serieIngreso = await tx.serieDoc.findFirst({
        where: {
          empresaId: temporada.empresaId,
          tipoDocumentoId: BigInt(13), // INGRESO A ALMACÉN
          tipoAlmacenId: BigInt(2), // MATERIA PRIMA
          activo: true
        }
      });

      if (!serieIngreso) {
        throw new ValidationError(
          `No se encontró una serie activa para INGRESO A ALMACÉN (Materia Prima) en la empresa ${temporada.empresaId}. ` +
          `Por favor, configure una serie en el módulo de Series de Documentos con Tipo Documento=INGRESO y Tipo Almacén=MATERIA PRIMA.`
        );
      }

      // ============================================
      // PASO 5: GENERAR MOVIMIENTO DE INGRESO
      // ============================================
      
      const cabeceraIngreso = {
        empresaId: temporada.empresaId,
        tipoDocumentoId: BigInt(13),
        conceptoMovAlmacenId: BigInt(1),
        serieDocId: serieIngreso.id,
        fechaDocumento: new Date(),
        entidadComercialId: empresaMegui.entidadComercialId,
        estadoDocAlmacenId: BigInt(30),
        faenaPescaId: descarga.faenaPescaId,
        embarcacionId: descarga.faenaPesca.embarcacionId,
        personalRespAlmacen: parametroAprobador.personalRespId,
        esCustodia: false,
        unidadNegocioId: temporada.unidadNegocioId,
        observaciones: `Ingreso automático - Temporada ID: ${temporada.id} - Resolución: ${temporada.numeroResolucion || 'N/A'} - Fecha: ${temporada.fechaInicio ? new Date(temporada.fechaInicio).toLocaleDateString('es-PE') : 'N/A'} - Faena ID: ${descarga.faenaPescaId} - Fecha Faena: ${descarga.faenaPesca?.fechaSalida ? new Date(descarga.faenaPesca.fechaSalida).toLocaleDateString('es-PE') : 'N/A'} - Descarga ID: ${descarga.id} - Fecha Descarga: ${descarga.fechaHoraInicioDescarga ? new Date(descarga.fechaHoraInicioDescarga).toLocaleDateString('es-PE') : 'N/A'}`
      };

      const detallesIngreso = [{
        productoId: producto.id,
        cantidad: descarga.toneladas,
        peso: descarga.toneladas,
        lote: temporada.numeroResolucion || '',
        fechaProduccion: descarga.fechaHoraInicioDescarga,
        fechaVencimiento: fechaVencimiento,
        fechaIngreso: descarga.fechaHoraInicioDescarga,
        nroSerie: '',
        nroContenedor: '',
        estadoMercaderiaId: BigInt(6),
        estadoCalidadId: BigInt(10),
        entidadComercialId: descarga.clienteId,
        esCustodia: false,
        empresaId: temporada.empresaId,
        costoUnitario: costoUnitario,
        observaciones: null
      }];

      const movimientoIngreso = await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
        cabeceraIngreso,
        detallesIngreso,
        usuarioId,
        tx
      );

      // ============================================
      // PASO 6: BUSCAR SERIE PARA SALIDA
      // ============================================
      
      const serieSalida = await tx.serieDoc.findFirst({
        where: {
          empresaId: temporada.empresaId,
          tipoDocumentoId: BigInt(14), // SALIDA DE ALMACÉN
          tipoAlmacenId: BigInt(2), // MATERIA PRIMA
          activo: true
        }
      });

      if (!serieSalida) {
        throw new ValidationError(
          `No se encontró una serie activa para SALIDA DE ALMACÉN (Materia Prima) en la empresa ${temporada.empresaId}. ` +
          `Por favor, configure una serie en el módulo de Series de Documentos con Tipo Documento=SALIDA y Tipo Almacén=MATERIA PRIMA.`
        );
      }

      // ============================================
      // PASO 7: GENERAR MOVIMIENTO DE SALIDA
      // ============================================
      
      const cabeceraSalida = {
        empresaId: temporada.empresaId,
        tipoDocumentoId: BigInt(14),
        conceptoMovAlmacenId: BigInt(3),
        serieDocId: serieSalida.id,
        fechaDocumento: new Date(),
        entidadComercialId: descarga.clienteId,
        estadoDocAlmacenId: BigInt(30),
        faenaPescaId: descarga.faenaPescaId,
        embarcacionId: descarga.faenaPesca.embarcacionId,
        personalRespAlmacen: parametroAprobador.personalRespId,
        esCustodia: false,
        unidadNegocioId: temporada.unidadNegocioId,
        observaciones: `Salida automática - Temporada ID: ${temporada.id} - Resolución: ${temporada.numeroResolucion || 'N/A'} - Fecha: ${temporada.fechaInicio ? new Date(temporada.fechaInicio).toLocaleDateString('es-PE') : 'N/A'} - Faena ID: ${descarga.faenaPescaId} - Fecha Faena: ${descarga.faenaPesca?.fechaSalida ? new Date(descarga.faenaPesca.fechaSalida).toLocaleDateString('es-PE') : 'N/A'} - Descarga ID: ${descarga.id} - Fecha Descarga: ${descarga.fechaHoraInicioDescarga ? new Date(descarga.fechaHoraInicioDescarga).toLocaleDateString('es-PE') : 'N/A'}`
      };

      const detallesSalida = [{
        productoId: producto.id,
        cantidad: descarga.toneladas,
        peso: descarga.toneladas,
        lote: temporada.numeroResolucion || '',
        fechaProduccion: descarga.fechaHoraInicioDescarga,
        fechaVencimiento: fechaVencimiento,
        fechaIngreso: descarga.fechaHoraInicioDescarga,
        nroSerie: '',
        nroContenedor: '',
        estadoMercaderiaId: BigInt(6),
        estadoCalidadId: BigInt(10),
        entidadComercialId: descarga.clienteId,
        esCustodia: false,
        empresaId: temporada.empresaId,
        costoUnitario: costoUnitario,
        observaciones: null
      }];

      const movimientoSalida = await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
        cabeceraSalida,
        detallesSalida,
        usuarioId,
        tx
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
          tx
        );

        if (!precioInfo) {
          precioInfo = await buscarPrecioProductoService.buscarPrecioProducto(
            empresaMegui.entidadComercialId,
            producto.id,
            tx
          );
        }

        if (!precioInfo) {
          console.warn(`⚠️ No se encontró precio para producto ${producto.id}. PreFactura no será generada.`);
        } else {
          // 6.2: Obtener tipo de cambio
          const tipoCambio = await validarTipoCambio(null, new Date());

          // 6.4: Convertir precio si es necesario
          let precioUnitarioFinal = precioInfo.precio;
          const monedaPreFactura = BigInt(1); // PEN por defecto

          if (precioInfo.monedaId !== monedaPreFactura) {
            if (precioInfo.monedaId === BigInt(2) && monedaPreFactura === BigInt(1)) {
              // USD → PEN
              precioUnitarioFinal = precioInfo.precio * Number(tipoCambio);
            } else if (precioInfo.monedaId === BigInt(1) && monedaPreFactura === BigInt(2)) {
              // PEN → USD
              precioUnitarioFinal = precioInfo.precio / Number(tipoCambio);
            }
          }

          // 6.5: Calcular montos
          const cantidad = Number(descarga.toneladas);
          const subtotal = cantidad * precioUnitarioFinal;
          const exoneradoIgv = false; // Ajustar según cliente si es necesario
          const porcentajeIgv = exoneradoIgv ? 0 : 18.00;
          const totalIGV = exoneradoIgv ? 0 : (subtotal * 0.18);
          const total = subtotal + totalIGV;

          // 6.6: Obtener serie de PreFactura
          const seriePreFactura = await tx.serieDoc.findFirst({
            where: {
              empresaId: temporada.empresaId,
              tipoDocumentoId: BigInt(19), // PRE FACTURA
              tipoAlmacenId: BigInt(2), // MATERIA PRIMA
              activo: true
            }
          });

          if (!seriePreFactura) {
            console.warn(
              `⚠️ No se encontró serie activa para PRE FACTURA (Materia Prima) en empresa ${temporada.empresaId}. ` +
              `PreFactura no será generada. Configure una serie con Tipo Documento=PRE FACTURA y Tipo Almacén=MATERIA PRIMA.`
            );
          } else {
            // 6.7: Preparar cabecera de PreFactura
            const fechaDocumentoPreFactura = new Date();
            const cabeceraPreFactura = {
              empresaId: temporada.empresaId,
              tipoDocumentoId: BigInt(19),
              serieDocId: seriePreFactura.id,
              fechaDocumento: fechaDocumentoPreFactura,
              fechaVencimiento: fechaDocumentoPreFactura,
              clienteId: descarga.clienteId,
              respVentasId: parametroAprobador.personalRespId,
              tipoProductoId: BigInt(1),
              formaPagoId: BigInt(1),
              monedaId: monedaPreFactura,
              tipoCambio: Number(tipoCambio),
              subtotal: subtotal,
              totalDescuentos: 0,
              totalIGV: totalIGV,
              total: total,
              estadoId: BigInt(45),
              exoneradoIgv: exoneradoIgv,
              porcentajeIgv: porcentajeIgv,
              movSalidaAlmacenId: movimientoSalida.movimiento.id,
              unidadNegocioId: temporada.unidadNegocioId,
              centroCostoId: BigInt(24),
              observaciones: `PreFactura automática - Temporada ID: ${temporada.id} - Resolución: ${temporada.numeroResolucion || 'N/A'} - Faena ID: ${descarga.faenaPescaId} - Descarga ID: ${descarga.id}`
            };

            // 8.8: Preparar detalles de PreFactura
            const detallesPreFactura = [{
              productoId: producto.id,
              cantidad: cantidad,
              precioUnitario: precioUnitarioFinal
            }];

            // 8.9: Crear PreFactura
            preFacturaGenerada = await crearPreFacturaCompletaService.crearPreFacturaCompleta(
              cabeceraPreFactura,
              detallesPreFactura,
              usuarioId,
              tx
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
        console.error('⚠️ Error al generar PreFactura (no crítico):', errorPreFactura.message);
        console.error('Los movimientos de almacén se completaron exitosamente.');
      }

      // ============================================
      // PASO 9: ACTUALIZAR DESCARGA CON IDs DE MOVIMIENTOS
      // ============================================
      
      await tx.descargaFaenaPesca.update({
        where: { id: descargaId },
        data: {
          movIngresoAlmacenId: movimientoIngreso.movimiento.id,
          movSalidaAlmacenId: movimientoSalida.movimiento.id,
          actualizadoEn: new Date()
        }
      });

      // ============================================
      // PASO 10: RETORNAR RESULTADO
      // ============================================
      
      const resultado = {
        descarga: {
          id: descarga.id,
          faenaPescaId: descarga.faenaPescaId
        },
        movimientoIngreso: {
          id: movimientoIngreso.movimiento.id,
          numeroDocumento: movimientoIngreso.movimiento.numeroDocumento,
          cantidadDetalles: movimientoIngreso.movimiento.detalles?.length || 0
        },
        movimientoSalida: {
          id: movimientoSalida.movimiento.id,
          numeroDocumento: movimientoSalida.movimiento.numeroDocumento,
          cantidadDetalles: movimientoSalida.movimiento.detalles?.length || 0
        },
        mensaje: 'Descarga finalizada exitosamente. Se generaron 2 movimientos de almacén con sus kardex.'
      };

      // Agregar información de PreFactura si se generó
      if (preFacturaGenerada) {
        resultado.preFactura = {
          id: preFacturaGenerada.preFactura.id,
          codigo: preFacturaGenerada.preFactura.codigo,
          numeroDocumento: preFacturaGenerada.preFactura.numeroDocumento,
          total: preFacturaGenerada.preFactura.total
        };
        resultado.mensaje += ' PreFactura generada exitosamente.';
      }

      return resultado;

    } catch (error) {
      console.error('❌ Error en finalizarDescargaConMovimientos:', error);
      throw error;
    }
  });
};

/**
 * Calcula el costo unitario para TemporadaPesca
 * 
 * IMPORTANTE: Usa la CUOTA ASIGNADA como base de cálculo, NO las toneladas descargadas.
 * Esto es porque en pesca industrial los gastos se planifican para la cuota completa
 * autorizada por PRODUCE, independientemente de cuánto se pesque realmente.
 * 
 * Fórmula: Costo Unitario = Total Egresos ÷ Cuota Asignada
 */
async function calcularCostoUnitario(tx, temporadaPescaId, descargas) {
  try {
    // 1. Obtener la temporada con su cuota asignada
    const temporada = await tx.temporadaPesca.findUnique({
      where: { id: temporadaPescaId }
    });

    if (!temporada || !temporada.cuotaAsignada) {
      console.warn('⚠️ No se encontró cuota asignada para la temporada');
      return 0;
    }

    // 2. Obtener entregas a rendir (egresos)
    const entregaRendir = await tx.entregaARendir.findFirst({
      where: { temporadaPescaId: temporadaPescaId },
      include: {
        movimientos: {
          where: {
            tipoMovimientoId: BigInt(2) // Egreso
          }
        }
      }
    });

    if (!entregaRendir || !entregaRendir.movimientos || entregaRendir.movimientos.length === 0) {
      return 0;
    }

    // 3. Calcular total de egresos
    const totalEgresos = entregaRendir.movimientos.reduce((sum, detalle) => {
      return sum + Number(detalle.monto || 0);
    }, 0);

    // 4. BASE DE CÁLCULO: CUOTA ASIGNADA (no toneladas descargadas)
    const cuotaAsignada = Number(temporada.cuotaAsignada);

    if (cuotaAsignada === 0) {
      console.warn('⚠️ Cuota asignada es 0');
      return 0;
    }
    // 5. Calcular costo unitario
    const costoUnitario = totalEgresos / cuotaAsignada;
    return costoUnitario;
  } catch (error) {
    console.error('❌ Error calculando costo unitario:', error);
    return 0;
  }
}

export default {
  finalizarDescargaConMovimientos
};