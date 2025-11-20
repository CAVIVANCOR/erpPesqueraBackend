import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import fs from 'fs';
import path from 'path';

const incluirRelaciones = {
  cuentaCorrienteOrigen: {
    select: {
      id: true,
      numeroCuenta: true,
      banco: { select: { id: true, nombre: true } },
      moneda: { select: { id: true, simbolo: true } }
    }
  },
  cuentaCorrienteDestino: {
    select: {
      id: true,
      numeroCuenta: true,
      banco: { select: { id: true, nombre: true } },
      moneda: { select: { id: true, simbolo: true } }
    }
  },
  tipoReferencia: true,
  entidadComercial: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
    }
  },
  estadoMovimientoCaja: {
    select: {
      id: true,
      descripcion: true
    }
  },
  empresaOrigen: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
    }
  },
  empresaDestino: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
    }
  },
  moneda: {
    select: {
      id: true,
      simbolo: true,
      codigoSunat: true
    }
  },
  tipoMovimiento: {
    select: {
      id: true,
      nombre: true,
      esIngreso: true
    }
  },
  ctaCteEntidad: {
    select: {
      id: true,
      numeroCuenta: true,
      numeroCuentaCCI: true,
      numeroTelefonoBilletera: true,
      BilleteraDigital: true,
      banco: {
        select: {
          id: true,
          nombre: true
        }
      },
      moneda: {
        select: {
          id: true,
          simbolo: true,
          codigoSunat: true
        }
      },
      entidadComercial: {
        select: {
          id: true,
          razonSocial: true,
          numeroDocumento: true
        }
      }
    }
  },
  producto: {
    select: {
      id: true,
      descripcionArmada: true,
      codigo: true
    }
  }
};

/**
 * Copia un archivo PDF físicamente a la carpeta de MovimientoCaja.
 * @param {string} rutaOrigen - Ruta relativa del archivo origen (ej: /uploads/comprobantes-det-movs/2024/10/archivo.pdf)
 * @returns {Promise<string>} - Ruta relativa del archivo copiado
 */
async function copiarPdfAMovimientoCaja(rutaOrigen) {
  try {
    if (!rutaOrigen) return null;
    
    // Construir ruta absoluta del archivo origen
    const rutaAbsolutaOrigen = path.join(process.cwd(), rutaOrigen);
    
    // Verificar que el archivo origen existe
    if (!fs.existsSync(rutaAbsolutaOrigen)) {
      console.warn(`[MOVIMIENTO CAJA] Archivo origen no existe: ${rutaAbsolutaOrigen}`);
      return null;
    }
    
    // Crear carpeta destino para MovimientoCaja
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dia = String(now.getDate()).padStart(2, '0');
    
    const carpetaDestino = path.join(
      process.cwd(),
      'uploads',
      'comprobantes-movimiento-caja',
      String(year),
      month
    );
    
    // Crear directorios si no existen
    if (!fs.existsSync(carpetaDestino)) {
      fs.mkdirSync(carpetaDestino, { recursive: true });
    }
    
    // Generar nombre único para el archivo destino
    const timestamp = Date.now();
    const extension = path.extname(rutaOrigen);
    const nombreArchivo = `${timestamp}-${dia}${month}${year}${extension}`;
    
    const rutaAbsolutaDestino = path.join(carpetaDestino, nombreArchivo);
    
    // Copiar el archivo
    fs.copyFileSync(rutaAbsolutaOrigen, rutaAbsolutaDestino);
    
    // Construir ruta relativa para la BD
    const rutaRelativa = path.join(
      '/uploads/comprobantes-movimiento-caja',
      String(year),
      month,
      nombreArchivo
    ).replace(/\\/g, '/');
    
    
    return rutaRelativa;
  } catch (error) {
    console.error('[MOVIMIENTO CAJA] Error al copiar archivo:', error);
    return null;
  }
}

/**
 * Valida la existencia de todas las referencias necesarias antes de crear o actualizar un MovimientoCaja.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} data - Datos del movimiento a validar
 */
async function validarReferenciasMovimientoCaja(data) {
  const {
    cuentaCorrienteOrigenId,
    cuentaCorrienteDestinoId,
    empresaOrigenId,
    empresaDestinoId,
    tipoMovimientoId,
    monedaId,
    usuarioId,
    tipoReferenciaId,
    centroCostoId,
    moduloOrigenMotivoOperacionId,
    usuarioMotivoOperacionId,
    entidadComercialId
  } = data;

  // Valida existencia de cuenta corriente origen (OBLIGATORIO)
  if (!cuentaCorrienteOrigenId) {
    throw new ValidationError('Cuenta corriente origen es obligatoria');
  }
  const cuentaOrigen = await prisma.cuentaCorriente.findUnique({ where: { id: cuentaCorrienteOrigenId } });
  if (!cuentaOrigen) throw new ValidationError('Cuenta corriente origen no existente');
  
  // Valida existencia de cuenta corriente destino (OPCIONAL)
  if (cuentaCorrienteDestinoId) {
    const cuentaDestino = await prisma.cuentaCorriente.findUnique({ where: { id: cuentaCorrienteDestinoId } });
    if (!cuentaDestino) throw new ValidationError('Cuenta corriente destino no existente');
  }

  // Valida existencia de empresa origen (OBLIGATORIO)
  if (!empresaOrigenId) {
    throw new ValidationError('Empresa origen es obligatoria');
  }
  const empresaOrigen = await prisma.empresa.findUnique({ where: { id: empresaOrigenId } });
  if (!empresaOrigen) throw new ValidationError('Empresa origen no existente');
  
  // Valida existencia de empresa destino (OPCIONAL - solo para transferencias entre empresas)
  if (empresaDestinoId) {
    const empresaDestino = await prisma.empresa.findUnique({ where: { id: empresaDestinoId } });
    if (!empresaDestino) throw new ValidationError('Empresa destino no existente');
  }

  // Valida existencia de tipo de movimiento (OBLIGATORIO)
  if (!tipoMovimientoId) {
    throw new ValidationError('Tipo de movimiento es obligatorio');
  }
  const tipoMov = await prisma.tipoMovEntregaRendir.findUnique({ where: { id: tipoMovimientoId } });
  if (!tipoMov) throw new ValidationError('Tipo de movimiento no existente');

  // Valida existencia de entidad comercial (OPCIONAL - solo cuando hay proveedor/cliente)
  if (entidadComercialId) {
    const entidadComercial = await prisma.entidadComercial.findUnique({ where: { id: entidadComercialId } });
    if (!entidadComercial) throw new ValidationError('Entidad comercial no existente');
  }

  // Valida existencia de cuenta de entidad comercial (OPCIONAL - solo para pagos a proveedores)
  if (data.cuentaDestinoEntidadComercialId) {
    const ctaCteEntidad = await prisma.ctaCteEntidad.findUnique({ 
      where: { id: data.cuentaDestinoEntidadComercialId },
      include: { entidadComercial: true }
    });
    if (!ctaCteEntidad) throw new ValidationError('Cuenta de entidad comercial no existente');
    
    // Validar que la cuenta pertenezca a la entidad comercial especificada
    if (entidadComercialId && ctaCteEntidad.entidadComercialId !== entidadComercialId) {
      throw new ValidationError('La cuenta seleccionada no pertenece a la entidad comercial especificada');
    }
  }

  // Valida existencia de moneda (OBLIGATORIO)
  if (!monedaId) {
    throw new ValidationError('Moneda es obligatoria');
  }
  const moneda = await prisma.moneda.findUnique({ where: { id: monedaId } });
  if (!moneda) throw new ValidationError('Moneda no existente');

  // Valida existencia de usuario si se provee
  if (usuarioId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ValidationError('Usuario no existente');
  }

  // Valida existencia de tipo de referencia si se provee
  if (tipoReferenciaId) {
    const tipoRef = await prisma.tipoReferenciaMovimientoCaja.findUnique({ where: { id: tipoReferenciaId } });
    if (!tipoRef) throw new ValidationError('Tipo de referencia no existente');
  }

  // Valida existencia de centro de costo si se provee
  if (centroCostoId) {
    const centroCosto = await prisma.centroCosto.findUnique({ where: { id: centroCostoId } });
    if (!centroCosto) throw new ValidationError('Centro de costo no existente');
  }

  // Valida existencia de módulo origen si se provee
  if (moduloOrigenMotivoOperacionId) {
    const moduloOrigen = await prisma.moduloSistema.findUnique({ where: { id: moduloOrigenMotivoOperacionId } });
    if (!moduloOrigen) throw new ValidationError('Módulo origen no existente');
  }

  // Valida existencia de usuario motivo operación si se provee
  if (usuarioMotivoOperacionId) {
    const usuarioMotivo = await prisma.personal.findUnique({ where: { id: usuarioMotivoOperacionId } });
    if (!usuarioMotivo) throw new ValidationError('Usuario motivo operación no existente');
  }
}

/**
 * Lista todos los movimientos de caja.
 * @returns {Promise<Array<Object>>} - Lista de movimientos de caja
 */
const listar = async () => {
  return prisma.movimientoCaja.findMany({ include: incluirRelaciones });
};

/**
 * Obtiene un movimiento de caja por ID.
 * @param {BigInt|number} id - ID del movimiento de caja
 * @returns {Promise<Object>} - Movimiento de caja
 */
const obtenerPorId = async (id) => {
  try {
    const movimiento = await prisma.movimientoCaja.findUnique({ where: { id }, include: incluirRelaciones });
    if (!movimiento) throw new NotFoundError('Movimiento de caja no encontrado');
    return movimiento;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo movimiento de caja.
 * Si proviene de DetMovsEntregaRendir o DetMovsEntRendirPescaConsumo,
 * copia automáticamente el urlComprobanteMovimiento al urlDocumentoMovCaja.
 * @param {Object} data - Datos del movimiento de caja
 * @returns {Promise<Object>} - Movimiento de caja creado
 */
const crear = async (data) => {
  try {
    await validarReferenciasMovimientoCaja(data);
    
    // Si viene de un módulo origen, copiar físicamente el comprobante del detalle
    const moduloOrigen = data.moduloOrigenMotivoOperacionId ? Number(data.moduloOrigenMotivoOperacionId) : null;
    const origenId = data.origenMotivoOperacionId;
    
    if (moduloOrigen === 2 && origenId) {
      // PESCA INDUSTRIAL - Buscar en DetMovsEntregaRendir
      const detMov = await prisma.detMovsEntregaRendir.findUnique({
        where: { id: BigInt(origenId) },
        select: { 
          urlComprobanteMovimiento: true,
          productoId: true
        }
      });
      
      if (detMov) {
        // Copiar el productoId si existe
        if (detMov.productoId) {
          data.productoId = detMov.productoId;
        }
        
        // Copiar físicamente el archivo PDF
        if (detMov.urlComprobanteMovimiento) {
          const nuevaRuta = await copiarPdfAMovimientoCaja(detMov.urlComprobanteMovimiento);
          if (nuevaRuta) {
            data.urlDocumentoMovCaja = nuevaRuta;
          } else {
            data.urlDocumentoMovCaja = detMov.urlComprobanteMovimiento;
          }
        }
      }
    } else if (moduloOrigen === 3 && origenId) {
      // PESCA CONSUMO - Buscar en DetMovsEntRendirPescaConsumo
      const detMovConsumo = await prisma.detMovsEntRendirPescaConsumo.findUnique({
        where: { id: BigInt(origenId) },
        select: { urlComprobanteMovimiento: true }
      });
      
      if (detMovConsumo && detMovConsumo.urlComprobanteMovimiento) {
        // Copiar físicamente el archivo PDF
        const nuevaRuta = await copiarPdfAMovimientoCaja(detMovConsumo.urlComprobanteMovimiento);
        if (nuevaRuta) {
          data.urlDocumentoMovCaja = nuevaRuta;
        } else {
          data.urlDocumentoMovCaja = detMovConsumo.urlComprobanteMovimiento;
        }
      }
    }
    
    return await prisma.movimientoCaja.create({ data });
  } catch (err) {
    // Manejar errores de validación de Prisma
    if (err.name === 'PrismaClientValidationError') {
      // Extraer el campo faltante del mensaje de error
      const match = err.message.match(/Argument `(\w+)` is missing/);
      if (match) {
        const campoFaltante = match[1];
        const nombresCampos = {
          'cuentaCorrienteOrigenId': 'Cuenta Corriente Origen',
          'empresaOrigenId': 'Empresa Origen',
          'tipoMovimientoId': 'Tipo de Movimiento',
          'monedaId': 'Moneda',
          'monto': 'Monto',
          'estadoId': 'Estado'
        };
        const nombreAmigable = nombresCampos[campoFaltante] || campoFaltante;
        throw new ValidationError(`El campo "${nombreAmigable}" es obligatorio para crear el movimiento de caja.`);
      }
      throw new ValidationError('Faltan campos obligatorios para crear el movimiento de caja. Por favor, complete todos los campos requeridos.');
    }
    
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento de caja existente, validando primero la existencia del ID.
 * Si solo se actualizan URLs de PDFs, no valida referencias.
 * @param {BigInt|number} id - ID del movimiento de caja a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Movimiento de caja actualizado
 */
const actualizar = async (id, data) => {
  try {
    // Primero valida existencia del movimiento de caja
    const existente = await prisma.movimientoCaja.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Movimiento de Caja No Encontrado');

    // Detectar si solo se están actualizando URLs de PDFs
    const soloActualizacionPDF = 
      Object.keys(data).length <= 2 && 
      (data.urlComprobanteOperacionMovCaja !== undefined || data.urlDocumentoMovCaja !== undefined);

    // Solo valida referencias si NO es una actualización exclusiva de PDFs
    if (!soloActualizacionPDF) {
      await validarReferenciasMovimientoCaja(data);
    }

    // Realiza la actualización
    const actualizado = await prisma.movimientoCaja.update({ where: { id }, data });
    return actualizado;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Movimiento de caja no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento de caja por ID.
 * @param {BigInt|number} id - ID del movimiento de caja
 * @returns {Promise<boolean>} - True si se eliminó correctamente
 */
const eliminar = async (id) => {
  try {
    await prisma.movimientoCaja.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Movimiento de caja no encontrado');
    if (err.code === 'P2003') throw new ConflictError('No se puede eliminar el movimiento de caja porque está asociado a otros registros.');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Valida un movimiento de caja y actualiza el origen correspondiente.
 * Implementa la lógica completa de validación según el módulo de origen.
 * @param {BigInt|number} id - ID del movimiento de caja a validar
 * @returns {Promise<Object>} - Movimiento de caja validado
 */
const validarMovimiento = async (id) => {
  try {
    // 1. Obtener el movimiento de caja
    const movimiento = await prisma.movimientoCaja.findUnique({ where: { id } });
    if (!movimiento) throw new NotFoundError('Movimiento de caja no encontrado');

    // 2. Verificar que el estado actual sea PENDIENTE (id=20)
    if (Number(movimiento.estadoId) !== 20) {
      throw new ValidationError('Solo se pueden validar movimientos en estado PENDIENTE');
    }

    // 3. Actualizar MovimientoCaja a estado VALIDADO (id=21)
    const fechaActual = new Date();
    const movimientoActualizado = await prisma.movimientoCaja.update({
      where: { id },
      data: {
        estadoId: BigInt(21), // VALIDADO
        fechaActualizacion: fechaActual
      }
    });

    // 4. Buscar y actualizar el origen según moduloOrigenMotivoOperacionId
    const moduloOrigen = Number(movimiento.moduloOrigenMotivoOperacionId);
    const origenId = movimiento.origenMotivoOperacionId;

    if (moduloOrigen === 2) {
      // PESCA INDUSTRIAL - Buscar en DetMovsEntregaRendir
      const detMov = await prisma.detMovsEntregaRendir.findUnique({
        where: { id: origenId }
      });

      if (!detMov) {
        throw new ValidationError('La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntregaRendir');
      }

      // Actualizar DetMovsEntregaRendir
      await prisma.detMovsEntregaRendir.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          entidadComercialId: movimiento.entidadComercialId,
          monedaId: movimiento.monedaId,
          operacionSinFactura: movimiento.operacionSinFactura,
          urlComprobanteOperacionMovCaja: movimiento.urlComprobanteOperacionMovCaja,
          urlComprobanteMovimiento: movimiento.urlDocumentoMovCaja,
          productoId: movimiento.productoId, // Sincronizar productoId de vuelta
          actualizadoEn: fechaActual
        }
      });

    } else if (moduloOrigen === 3) {
      // PESCA CONSUMO - Buscar en DetMovsEntRendirPescaConsumo
      const detMovConsumo = await prisma.detMovsEntRendirPescaConsumo.findUnique({
        where: { id: origenId }
      });

      if (!detMovConsumo) {
        throw new ValidationError('La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntRendirPescaConsumo');
      }

      // Actualizar DetMovsEntRendirPescaConsumo
      await prisma.detMovsEntRendirPescaConsumo.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          entidadComercialId: movimiento.entidadComercialId,
          monedaId: movimiento.monedaId,
          operacionSinFactura: movimiento.operacionSinFactura,
          actualizadoEn: fechaActual
        }
      });
    } else if (moduloOrigen === 4) {
      // COMPRAS - Buscar en DetMovsEntregaRendirPCompras
      const detMovCompras = await prisma.detMovsEntregaRendirPCompras.findUnique({
        where: { id: origenId }
      });

      if (!detMovCompras) {
        throw new ValidationError('La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntregaRendirPCompras');
      }

      // Actualizar DetMovsEntregaRendirPCompras
      await prisma.detMovsEntregaRendirPCompras.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          operacionSinFactura: movimiento.operacionSinFactura,
          urlComprobanteOperacionMovCaja: movimiento.urlComprobanteOperacionMovCaja,
          urlComprobanteMovimiento: movimiento.urlDocumentoMovCaja,
          actualizadoEn: fechaActual
        }
      });
    } else if (moduloOrigen === 5) {
      // VENTAS - Buscar en DetMovsEntregaRendirPVentas
      const detMovVentas = await prisma.detMovsEntregaRendirPVentas.findUnique({
        where: { id: origenId }
      });

      if (!detMovVentas) {
        throw new ValidationError('La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntregaRendirPVentas');
      }

      // Actualizar DetMovsEntregaRendirPVentas
      await prisma.detMovsEntregaRendirPVentas.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          operacionSinFactura: movimiento.operacionSinFactura,
          urlComprobanteOperacionMovCaja: movimiento.urlComprobanteOperacionMovCaja,
          urlComprobanteMovimiento: movimiento.urlDocumentoMovCaja,
          fechaActualizacion: fechaActual
        }
      });
    } else {
      throw new ValidationError(`Módulo origen no soportado: ${moduloOrigen}`);
    }

    return movimientoActualizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code === 'P2025') throw new NotFoundError('Registro no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  validarMovimiento
};