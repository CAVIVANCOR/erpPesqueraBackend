import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MotivoNotaCreditoDebito
 * Gestiona motivos de Notas de Crédito y Débito con códigos SUNAT.
 * Documentado en español.
 */

/**
 * Valida los datos de un motivo de NC/ND.
 * @param {Object} data - Datos del motivo
 */
async function validarMotivoNotaCreditoDebito(data) {
  // Validar código SUNAT único
  if (data.codigoSunat) {
    const existente = await prisma.motivoNotaCreditoDebito.findFirst({
      where: {
        codigoSunat: data.codigoSunat,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`El código SUNAT "${data.codigoSunat}" ya existe.`);
    }
  }

  // Validar descripción única
  if (data.descripcion) {
    const existente = await prisma.motivoNotaCreditoDebito.findFirst({
      where: {
        descripcion: data.descripcion,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`La descripción "${data.descripcion}" ya existe.`);
    }
  }
}

/**
 * Lista todos los motivos de NC/ND.
 */
const listar = async () => {
  try {
    return await prisma.motivoNotaCreditoDebito.findMany({
      include: {
        _count: {
          select: {
            preFacturas: true,
            ordenesCompra: true,
            comprobantesElectronicos: true
          }
        }
      },
      orderBy: [
        { esNCND: 'asc' },  // false (NC) primero, true (ND) después
        { codigoSunat: 'asc' }
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
 * Obtiene un motivo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const motivo = await prisma.motivoNotaCreditoDebito.findUnique({
      where: { id }
    });
    if (!motivo) throw new NotFoundError('Motivo de NC/ND no encontrado');
    return motivo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo motivo de NC/ND.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.codigoSunat) {
      throw new ValidationError('El código SUNAT es obligatorio.');
    }
    if (!data.descripcion) {
      throw new ValidationError('La descripción es obligatoria.');
    }

    await validarMotivoNotaCreditoDebito(data);

    return await prisma.motivoNotaCreditoDebito.create({
      data: {
        codigoSunat: data.codigoSunat,
        descripcion: data.descripcion,
        esNCND: data.esNCND ?? false,
        activo: data.activo ?? true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un motivo existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.motivoNotaCreditoDebito.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Motivo de NC/ND no encontrado');

    await validarMotivoNotaCreditoDebito({ ...data, id });

    return await prisma.motivoNotaCreditoDebito.update({
      where: { id },
      data: {
        codigoSunat: data.codigoSunat,
        descripcion: data.descripcion,
        esNCND: data.esNCND,
        activo: data.activo
      }
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
 * Elimina un motivo por ID.
 * Valida que no tenga documentos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.motivoNotaCreditoDebito.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            preFacturas: true,
            ordenesCompra: true,
            comprobantesElectronicos: true
          }
        }
      }
    });

    if (!existente) throw new NotFoundError('Motivo de NC/ND no encontrado');

    // Validar que no tenga documentos asociados
    const totalDocumentos = existente._count.preFacturas + 
                           existente._count.ordenesCompra + 
                           existente._count.comprobantesElectronicos;
    
    if (totalDocumentos > 0) {
      throw new ConflictError(`No se puede eliminar el motivo porque tiene ${totalDocumentos} documento(s) asociado(s).`);
    }

    await prisma.motivoNotaCreditoDebito.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista motivos activos.
 */
const listarActivos = async () => {
  try {
    return await prisma.motivoNotaCreditoDebito.findMany({
      where: { activo: true },
      orderBy: [
        { esNCND: 'asc' },
        { codigoSunat: 'asc' }
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
 * Lista motivos de Nota de Crédito (NC).
 */
const listarNotasCredito = async () => {
  try {
    return await prisma.motivoNotaCreditoDebito.findMany({
      where: {
        esNCND: false,
        activo: true
      },
      orderBy: { codigoSunat: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista motivos de Nota de Débito (ND).
 */
const listarNotasDebito = async () => {
  try {
    return await prisma.motivoNotaCreditoDebito.findMany({
      where: {
        esNCND: true,
        activo: true
      },
      orderBy: { codigoSunat: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene estadísticas de uso de motivos.
 */
const obtenerEstadisticas = async () => {
  try {
    const motivos = await prisma.motivoNotaCreditoDebito.findMany({
      include: {
        _count: {
          select: {
            preFacturas: true,
            ordenesCompra: true,
            comprobantesElectronicos: true
          }
        }
      }
    });

    return motivos.map(motivo => ({
      id: motivo.id,
      codigoSunat: motivo.codigoSunat,
      descripcion: motivo.descripcion,
      esNCND: motivo.esNCND,
      tipoDocumento: motivo.esNCND ? 'Nota de Débito' : 'Nota de Crédito',
      totalPreFacturas: motivo._count.preFacturas,
      totalOrdenesCompra: motivo._count.ordenesCompra,
      totalComprobantes: motivo._count.comprobantesElectronicos,
      totalDocumentos: motivo._count.preFacturas + motivo._count.ordenesCompra + motivo._count.comprobantesElectronicos,
      activo: motivo.activo
    }));
  } catch (err) {
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
  listarActivos,
  listarNotasCredito,
  listarNotasDebito,
  obtenerEstadisticas
};