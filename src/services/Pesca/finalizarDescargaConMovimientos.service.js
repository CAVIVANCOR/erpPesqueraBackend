import prisma from '../../config/prismaClient.js';
import { ValidationError } from '../../utils/errors.js';
import crearMovimientoAlmacenService from '../Almacen/crearMovimientoAlmacen.service.js';

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

      // Validar que no tenga movimientos ya generados
      if (descarga.movIngresoAlmacenId || descarga.movSalidaAlmacenId) {
        throw new ValidationError('Esta descarga ya tiene movimientos de almacén generados. Use la función de regenerar si necesita crear nuevos movimientos.');
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
      
      let producto = await tx.producto.findFirst({
        where: {
          empresaId: temporada.empresaId,
          clienteId: descarga.clienteId,
          especieId: descarga.especieId,
          cesado: false
        }
      });

      if (!producto) {
        producto = await tx.producto.findFirst({
          where: {
            empresaId: temporada.empresaId,
            especieId: descarga.especieId,
            cesado: false
          }
        });
      }

      if (!producto) {
        throw new ValidationError(
          `No se encontró un producto activo para la empresa ${temporada.empresaId} y especie ${descarga.especieId}`
        );
      }

      const fechaVencimiento = new Date(descarga.fechaHoraInicioDescarga);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      // ============================================
      // PASO 4: GENERAR MOVIMIENTO DE INGRESO
      // ============================================
      
      const dataMovimientoIngreso = {
        empresaId: temporada.empresaId,
        tipoDocumentoId: BigInt(13),
        conceptoMovAlmacenId: BigInt(1),
        serieDocId: BigInt(1),
        fechaDocumento: new Date(),
        entidadComercialId: empresaMegui.entidadComercialId,
        faenaPescaId: descarga.faenaPescaId,
        embarcacionId: descarga.faenaPesca.embarcacionId,
        personalRespAlmacen: parametroAprobador.personalRespId,
        esCustodia: false,
        observaciones: `Ingreso automático - Descarga ID: ${descarga.id}`,
        detalles: [{
          productoId: producto.id,
          cantidad: descarga.toneladas,
          peso: descarga.toneladas,
          lote: temporada.numeroResolucion || '',
          fechaProduccion: descarga.fechaHoraInicioDescarga,
          fechaVencimiento: fechaVencimiento,
          fechaIngreso: descarga.fechaHoraInicioDescarga,
          estadoMercaderiaId: BigInt(6),
          estadoCalidadId: BigInt(10),
          entidadComercialId: descarga.clienteId,
          esCustodia: false,
          empresaId: temporada.empresaId,
          costoUnitario: costoUnitario
        }]
      };

      const movimientoIngreso = await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
        dataMovimientoIngreso,
        usuarioId,
        tx
      );

      // ============================================
      // PASO 5: GENERAR MOVIMIENTO DE SALIDA
      // ============================================
      
      const dataMovimientoSalida = {
        empresaId: temporada.empresaId,
        tipoDocumentoId: BigInt(14),
        conceptoMovAlmacenId: BigInt(3),
        serieDocId: BigInt(2),
        fechaDocumento: new Date(),
        entidadComercialId: descarga.clienteId,
        faenaPescaId: descarga.faenaPescaId,
        embarcacionId: descarga.faenaPesca.embarcacionId,
        personalRespAlmacen: parametroAprobador.personalRespId,
        esCustodia: false,
        observaciones: `Salida automática - Descarga ID: ${descarga.id}`,
        detalles: [{
          productoId: producto.id,
          cantidad: descarga.toneladas,
          peso: descarga.toneladas,
          lote: temporada.numeroResolucion || '',
          fechaProduccion: descarga.fechaHoraInicioDescarga,
          fechaVencimiento: fechaVencimiento,
          fechaIngreso: descarga.fechaHoraInicioDescarga,
          estadoMercaderiaId: BigInt(6),
          estadoCalidadId: BigInt(10),
          entidadComercialId: descarga.clienteId,
          esCustodia: false,
          empresaId: temporada.empresaId,
          costoUnitario: costoUnitario
        }]
      };

      const movimientoSalida = await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
        dataMovimientoSalida,
        usuarioId,
        tx
      );

      // ============================================
      // PASO 6: ACTUALIZAR DESCARGA CON IDs DE MOVIMIENTOS
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
      // PASO 7: RETORNAR RESULTADO
      // ============================================
      
      return {
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

    } catch (error) {
      console.error('❌ Error en finalizarDescargaConMovimientos:', error);
      throw error;
    }
  });
};

/**
 * Calcula el costo unitario desde las entregas a rendir
 */
async function calcularCostoUnitario(tx, temporadaPescaId, descargas) {
  try {
    const entregaRendir = await tx.entregaARendir.findFirst({
      where: { temporadaPescaId: temporadaPescaId },
      include: {
        movimientos: {
          where: {
            tipoMovimientoId: BigInt(2)
          }
        }
      }
    });

    if (!entregaRendir || !entregaRendir.movimientos || entregaRendir.movimientos.length === 0) {
      return 0;
    }

    const totalEgresos = entregaRendir.movimientos.reduce((sum, detalle) => {
      return sum + Number(detalle.monto || 0);
    }, 0);

    const totalToneladas = descargas.reduce((sum, descarga) => {
      return sum + Number(descarga.toneladas || 0);
    }, 0);

    if (totalToneladas === 0) {
      return 0;
    }

    return totalEgresos / totalToneladas;
  } catch (error) {
    console.error('❌ Error calculando costo unitario:', error);
    return 0;
  }
}

export default {
  finalizarDescargaConMovimientos
};