import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from './correlativoOperacionCaja.service.js';

/**
 * ════════════════════════════════════════════════════════════
 * SERVICIO PROFESIONAL: TRANSFERENCIA INTERNA
 * ════════════════════════════════════════════════════════════
 * 
 * Procesa transferencias entre cuentas propias:
 * - Genera correlativo único de operación
 * - Crea múltiples MovimientoCaja (Salida, ITF, Comisión, Entrada)
 * - Vincula movimientos con relación bidireccional
 * - Transacción atómica
 * 
 * Documentado en español.
 */

// ════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES: OBTENCIÓN DE CATÁLOGOS
// ════════════════════════════════════════════════════════════

/**
 * Obtener estado VALIDADO de MovimientoCaja desde EstadoMultiFuncion
 */
async function obtenerEstadoValidado(tx = prisma) {
  const estado = await tx.estadoMultiFuncion.findFirst({
    where: {
      tipoProvieneDeId: 6, // Movimiento Caja
      nombre: 'VALIDADO'
    }
  });

  if (!estado) {
    throw new NotFoundError('Estado VALIDADO no encontrado en EstadoMultiFuncion');
  }

  return Number(estado.id);
}

/**
 * Obtener tipo de movimiento ITF desde TipoMovEntregaRendir
 */
async function obtenerTipoMovimientoITF(tx = prisma) {
  const tipo = await tx.tipoMovEntregaRendir.findFirst({
    where: {
      nombre: 'ITF'
    }
  });

  if (!tipo) {
    throw new NotFoundError('Tipo de movimiento ITF no encontrado en TipoMovEntregaRendir');
  }

  return Number(tipo.id);
}

/**
 * Obtener tipo de movimiento COMISION_BANCARIA desde TipoMovEntregaRendir
 */
async function obtenerTipoMovimientoComision(tx = prisma) {
  const tipo = await tx.tipoMovEntregaRendir.findFirst({
    where: {
      nombre: 'COMISION_BANCARIA'
    }
  });

  if (!tipo) {
    throw new NotFoundError('Tipo de movimiento COMISION_BANCARIA no encontrado en TipoMovEntregaRendir');
  }

  return Number(tipo.id);
}

// ════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════

async function validarDatosTransferencia(data) {
  const camposRequeridos = [
    'empresaId',
    'cuentaOrigenId',
    'cuentaDestinoId',
    'montoTransferencia',
    'monedaId',
    'fechaOperacion',
    'tipoMovimientoSalidaId',
    'tipoMovimientoEntradaId'
  ];

  const camposFaltantes = camposRequeridos.filter(campo => !data[campo]);

  if (camposFaltantes.length > 0) {
    throw new ValidationError(
      `Faltan campos obligatorios: ${camposFaltantes.join(', ')}`
    );
  }

  if (Number(data.montoTransferencia) <= 0) {
    throw new ValidationError('El monto debe ser mayor a cero.');
  }

  if (Number(data.cuentaOrigenId) === Number(data.cuentaDestinoId)) {
    throw new ValidationError('La cuenta origen y destino no pueden ser la misma.');
  }

  if (data.montoComision && Number(data.montoComision) < 0) {
    throw new ValidationError('La comisión no puede ser negativa.');
  }

  if (data.montoITF && Number(data.montoITF) < 0) {
    throw new ValidationError('El ITF no puede ser negativo.');
  }

  const cuentaOrigen = await prisma.cuentaCorriente.findUnique({
    where: { id: Number(data.cuentaOrigenId) },
    include: {
      banco: true,
      moneda: true
    }
  });

  if (!cuentaOrigen) {
    throw new NotFoundError('Cuenta origen no encontrada.');
  }

  if (Number(cuentaOrigen.empresaId) !== Number(data.empresaId)) {
    throw new ValidationError('La cuenta origen no pertenece a la empresa.');
  }

  const cuentaDestino = await prisma.cuentaCorriente.findUnique({
    where: { id: Number(data.cuentaDestinoId) },
    include: {
      banco: true,
      moneda: true
    }
  });

  if (!cuentaDestino) {
    throw new NotFoundError('Cuenta destino no encontrada.');
  }

  if (Number(cuentaDestino.empresaId) !== Number(data.empresaId)) {
    throw new ValidationError('La cuenta destino no pertenece a la empresa.');
  }

  return { cuentaOrigen, cuentaDestino };
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: PROCESAR TRANSFERENCIA INTERNA
// ════════════════════════════════════════════════════════════

const procesarTransferenciaInterna = async (data) => {
  const { cuentaOrigen, cuentaDestino } = await validarDatosTransferencia(data);

  try {
    return await prisma.$transaction(async (tx) => {
      // ════════════════════════════════════════════════════════════
      // PASO 1: OBTENER CATÁLOGOS DINÁMICOS
      // ════════════════════════════════════════════════════════════
      const estadoValidado = await obtenerEstadoValidado(tx);
      const tipoMovimientoITF = await obtenerTipoMovimientoITF(tx);
      const tipoMovimientoComision = await obtenerTipoMovimientoComision(tx);

      // ════════════════════════════════════════════════════════════
      // PASO 2: GENERAR CORRELATIVO DE OPERACIÓN
      // ════════════════════════════════════════════════════════════
      const correlativo = await correlativoService.generarCorrelativo(data.empresaId, tx);

      // ════════════════════════════════════════════════════════════
      // PASO 3: CREAR MOVIMIENTO DE CAJA - SALIDA
      // ════════════════════════════════════════════════════════════
      const movimientoSalida = await tx.movimientoCaja.create({
        data: {
          refOperacionEspecializadaMovCaja: correlativo,
          tipoMovimientoId: Number(data.tipoMovimientoSalidaId),
          empresaOrigenId: Number(data.empresaId),
          cuentaCorrienteOrigenId: Number(data.cuentaOrigenId),
          monto: -Number(data.montoTransferencia),
          monedaId: Number(data.monedaId),
          fechaOperacionMovCaja: new Date(data.fechaOperacion),
          descripcion: data.descripcion || `Transferencia a ${cuentaDestino.numeroCuenta}`,
          estadoId: estadoValidado,
          esTransferencia: true,
          movimientoRelacionadoId: null
        }
      });

      // ════════════════════════════════════════════════════════════
      // PASO 4: CREAR MOVIMIENTO DE CAJA - COMISIÓN (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoComision = null;
      if (data.montoComision && Number(data.montoComision) > 0) {
        movimientoComision = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: tipoMovimientoComision,
            empresaOrigenId: Number(data.empresaId),
            cuentaCorrienteOrigenId: Number(data.cuentaOrigenId),
            monto: -Number(data.montoComision),
            monedaId: Number(data.monedaId),
            fechaOperacionMovCaja: new Date(data.fechaOperacion),
            descripcion: `Comisión transferencia - Op #${correlativo}`,
            estadoId: estadoValidado
          }
        });
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5: CREAR MOVIMIENTO DE CAJA - ITF (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoITF = null;
      if (data.montoITF && Number(data.montoITF) > 0) {
        movimientoITF = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: tipoMovimientoITF,
            empresaOrigenId: Number(data.empresaId),
            cuentaCorrienteOrigenId: Number(data.cuentaOrigenId),
            monto: -Number(data.montoITF),
            monedaId: Number(data.monedaId),
            fechaOperacionMovCaja: new Date(data.fechaOperacion),
            descripcion: `ITF - Op #${correlativo}`,
            estadoId: estadoValidado
          }
        });
      }

      // ════════════════════════════════════════════════════════════
      // PASO 6: CREAR MOVIMIENTO DE CAJA - ENTRADA
      // ════════════════════════════════════════════════════════════
      const movimientoEntrada = await tx.movimientoCaja.create({
        data: {
          refOperacionEspecializadaMovCaja: correlativo,
          tipoMovimientoId: Number(data.tipoMovimientoEntradaId),
          empresaOrigenId: Number(data.empresaId),
          cuentaCorrienteDestinoId: Number(data.cuentaDestinoId),
          monto: Number(data.montoTransferencia),
          monedaId: Number(data.monedaId),
          fechaOperacionMovCaja: new Date(data.fechaOperacion),
          descripcion: `Recepción desde ${cuentaOrigen.numeroCuenta}`,
          estadoId: estadoValidado,
          esTransferencia: true,
          movimientoRelacionadoId: movimientoSalida.id
        }
      });

      // ════════════════════════════════════════════════════════════
      // PASO 7: ACTUALIZAR RELACIÓN BIDIRECCIONAL
      // ════════════════════════════════════════════════════════════
      await tx.movimientoCaja.update({
        where: { id: movimientoSalida.id },
        data: { movimientoRelacionadoId: movimientoEntrada.id }
      });

      // ════════════════════════════════════════════════════════════
      // PASO 8: PREPARAR RESPUESTA
      // ════════════════════════════════════════════════════════════
      return {
        success: true,
        correlativo: correlativo,
        movimientos: {
          salida: movimientoSalida,
          comision: movimientoComision,
          itf: movimientoITF,
          entrada: movimientoEntrada
        },
        resumen: {
          montoTransferido: Number(data.montoTransferencia),
          comision: movimientoComision ? Number(data.montoComision) : 0,
          itf: movimientoITF ? Number(data.montoITF) : 0,
          totalDebitado: Number(data.montoTransferencia) +
            (movimientoComision ? Number(data.montoComision) : 0) +
            (movimientoITF ? Number(data.montoITF) : 0)
        }
      };
    });
  } catch (err) {
    console.error('❌ Error en procesarTransferenciaInterna:', err);

    if (err instanceof ValidationError || err instanceof NotFoundError) {
      throw err;
    }

    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al procesar transferencia', err.message);
    }

    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES: CONSULTA Y OBTENCIÓN DE DATOS
// ════════════════════════════════════════════════════════════

/**
 * Obtener movimientos de una transferencia por correlativo
 */
const obtenerMovimientosPorCorrelativo = async (empresaId, correlativo) => {
  try {
    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        empresaId: Number(empresaId),
        refOperacionEspecializadaMovCaja: Number(correlativo)
      },
      include: {
        tipoMovimiento: true,
        moneda: true,
        cuentaCorrienteOrigen: {
          include: {
            banco: true
          }
        },
        cuentaCorrienteDestino: {
          include: {
            banco: true
          }
        },
        estadoMovimientoCaja: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    return movimientos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener movimientos', err.message);
    }
    throw err;
  }
};

export default {
  procesarTransferenciaInterna,
  obtenerMovimientosPorCorrelativo
};