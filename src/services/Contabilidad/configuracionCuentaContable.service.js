import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ConfiguracionCuentaContable
 * Gestiona las configuraciones automáticas de cuentas contables para diferentes operaciones.
 * Documentado en español.
 */

/**
 * Valida los datos de una configuración de cuenta contable.
 * @param {Object} data - Datos de la configuración
 */
async function validarConfiguracionCuentaContable(data) {
  // Validar empresaId
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) {
      throw new ValidationError('La empresa referenciada no existe.');
    }
  }

  // Validar cuentaDebeId
  if (data.cuentaDebeId) {
    const cuentaDebe = await prisma.planCuentasContable.findUnique({ 
      where: { id: data.cuentaDebeId } 
    });
    if (!cuentaDebe) {
      throw new ValidationError('La cuenta del debe referenciada no existe.');
    }
    if (!cuentaDebe.esCuentaMovimiento) {
      throw new ValidationError('La cuenta del debe debe ser una cuenta de movimiento (nivel 5).');
    }
  }

  // Validar cuentaHaberId
  if (data.cuentaHaberId) {
    const cuentaHaber = await prisma.planCuentasContable.findUnique({ 
      where: { id: data.cuentaHaberId } 
    });
    if (!cuentaHaber) {
      throw new ValidationError('La cuenta del haber referenciada no existe.');
    }
    if (!cuentaHaber.esCuentaMovimiento) {
      throw new ValidationError('La cuenta del haber debe ser una cuenta de movimiento (nivel 5).');
    }
  }

  // Validar que al menos una cuenta esté definida
  if (!data.cuentaDebeId && !data.cuentaHaberId) {
    throw new ValidationError('Debe definir al menos una cuenta (debe o haber).');
  }

  // Validar tipoOperacion
  if (data.tipoOperacion && !['COMPRA', 'VENTA', 'COBRO', 'PAGO', 'INGRESO_CAJA', 'EGRESO_CAJA', 'TRANSFERENCIA', 'AJUSTE'].includes(data.tipoOperacion)) {
    throw new ValidationError('El tipo de operación debe ser: COMPRA, VENTA, COBRO, PAGO, INGRESO_CAJA, EGRESO_CAJA, TRANSFERENCIA o AJUSTE.');
  }

  // Validar unicidad de configuración (empresaId + tipoOperacion + concepto)
  if (data.empresaId && data.tipoOperacion && data.concepto) {
    const existente = await prisma.configuracionCuentaContable.findFirst({
      where: {
        empresaId: data.empresaId,
        tipoOperacion: data.tipoOperacion,
        concepto: data.concepto,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`Ya existe una configuración para ${data.tipoOperacion} - ${data.concepto} en esta empresa.`);
    }
  }
}

/**
 * Lista todas las configuraciones de cuentas contables.
 */
const listar = async () => {
  try {
    return await prisma.configuracionCuentaContable.findMany({
      include: {
        empresa: true,
        cuentaDebe: true,
        cuentaHaber: true
      },
      orderBy: [
        { tipoOperacion: 'asc' },
        { concepto: 'asc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una configuración de cuenta contable por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const configuracion = await prisma.configuracionCuentaContable.findUnique({
      where: { id },
      include: {
        empresa: true,
        cuentaDebe: true,
        cuentaHaber: true
      }
    });
    if (!configuracion) throw new NotFoundError('Configuración de cuenta contable no encontrada');
    return configuracion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva configuración de cuenta contable.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.empresaId || !data.tipoOperacion || !data.concepto) {
      throw new ValidationError('Los campos empresaId, tipoOperacion y concepto son obligatorios.');
    }

    await validarConfiguracionCuentaContable(data);

    const configuracionData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.configuracionCuentaContable.create({ data: configuracionData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza una configuración de cuenta contable existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.configuracionCuentaContable.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Configuración de cuenta contable no encontrada');

    await validarConfiguracionCuentaContable({ ...data, id });

    const configuracionData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.configuracionCuentaContable.update({
      where: { id },
      data: configuracionData
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Elimina una configuración de cuenta contable por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.configuracionCuentaContable.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Configuración de cuenta contable no encontrada');

    await prisma.configuracionCuentaContable.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista configuraciones por empresa.
 */
const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.configuracionCuentaContable.findMany({
      where: { empresaId },
      include: {
        cuentaDebe: true,
        cuentaHaber: true
      },
      orderBy: [
        { tipoOperacion: 'asc' },
        { concepto: 'asc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista configuraciones por tipo de operación.
 */
const listarPorTipoOperacion = async (empresaId, tipoOperacion) => {
  try {
    return await prisma.configuracionCuentaContable.findMany({
      where: {
        empresaId,
        tipoOperacion
      },
      include: {
        cuentaDebe: true,
        cuentaHaber: true
      },
      orderBy: { concepto: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una configuración específica por empresa, tipo de operación y concepto.
 */
const obtenerPorConcepto = async (empresaId, tipoOperacion, concepto) => {
  try {
    const configuracion = await prisma.configuracionCuentaContable.findFirst({
      where: {
        empresaId,
        tipoOperacion,
        concepto
      },
      include: {
        cuentaDebe: true,
        cuentaHaber: true
      }
    });

    if (!configuracion) {
      throw new NotFoundError(`No existe configuración para ${tipoOperacion} - ${concepto} en esta empresa.`);
    }

    return configuracion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Copia configuraciones de una empresa a otra.
 */
const copiarConfiguraciones = async (empresaOrigenId, empresaDestinoId) => {
  try {
    // Validar empresas
    const empresaOrigen = await prisma.empresa.findUnique({ where: { id: empresaOrigenId } });
    if (!empresaOrigen) {
      throw new ValidationError('La empresa origen no existe.');
    }

    const empresaDestino = await prisma.empresa.findUnique({ where: { id: empresaDestinoId } });
    if (!empresaDestino) {
      throw new ValidationError('La empresa destino no existe.');
    }

    // Obtener configuraciones de la empresa origen
    const configuracionesOrigen = await prisma.configuracionCuentaContable.findMany({
      where: { empresaId: empresaOrigenId },
      include: {
        cuentaDebe: true,
        cuentaHaber: true
      }
    });

    if (configuracionesOrigen.length === 0) {
      throw new ValidationError('La empresa origen no tiene configuraciones para copiar.');
    }

    // Crear configuraciones en la empresa destino
    const configuracionesCreadas = [];
    for (const config of configuracionesOrigen) {
      // Buscar cuentas equivalentes en empresa destino
      let cuentaDebeDestinoId = null;
      let cuentaHaberDestinoId = null;

      if (config.cuentaDebe) {
        const cuentaDebeDestino = await prisma.planCuentasContable.findFirst({
          where: {
            empresaId: empresaDestinoId,
            codigoPCGE: config.cuentaDebe.codigoPCGE
          }
        });
        cuentaDebeDestinoId = cuentaDebeDestino?.id;
      }

      if (config.cuentaHaber) {
        const cuentaHaberDestino = await prisma.planCuentasContable.findFirst({
          where: {
            empresaId: empresaDestinoId,
            codigoPCGE: config.cuentaHaber.codigoPCGE
          }
        });
        cuentaHaberDestinoId = cuentaHaberDestino?.id;
      }

      // Solo crear si al menos una cuenta existe en destino
      if (cuentaDebeDestinoId || cuentaHaberDestinoId) {
        // Verificar si ya existe
        const existente = await prisma.configuracionCuentaContable.findFirst({
          where: {
            empresaId: empresaDestinoId,
            tipoOperacion: config.tipoOperacion,
            concepto: config.concepto
          }
        });

        if (!existente) {
          const nueva = await prisma.configuracionCuentaContable.create({
            data: {
              empresaId: empresaDestinoId,
              tipoOperacion: config.tipoOperacion,
              concepto: config.concepto,
              descripcion: config.descripcion,
              cuentaDebeId: cuentaDebeDestinoId,
              cuentaHaberId: cuentaHaberDestinoId,
              activo: config.activo,
              fechaActualizacion: new Date()
            }
          });
          configuracionesCreadas.push(nueva);
        }
      }
    }

    return {
      total: configuracionesOrigen.length,
      copiadas: configuracionesCreadas.length,
      configuraciones: configuracionesCreadas
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  listarPorTipoOperacion,
  obtenerPorConcepto,
  copiarConfiguraciones
};
