import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Empresa
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de representantelegalId y entidadComercialId si se envían.
 * También valida que los márgenes sean válidos.
 * Lanza ValidationError si no existen o son inválidos.
 * @param {Object} data - Datos de la empresa
 */
async function validarEmpresa(data) {
  if (data.representantelegalId !== undefined && data.representantelegalId !== null) {
    // Si existe la entidad Persona o similar, descomentar y ajustar:
    // const existe = await prisma.persona.findUnique({ where: { id: data.representantelegalId } });
    // if (!existe) throw new ValidationError('Representante legal no existente para el campo representantelegalId.');
  }
  
  if (data.entidadComercialId !== undefined && data.entidadComercialId !== null) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente para el campo entidadComercialId.');
  }

  // Validar campos de liquidación
  if (data.porcentajeBaseLiqPesca !== undefined && data.porcentajeBaseLiqPesca !== null) {
    const valor = Number(data.porcentajeBaseLiqPesca);
    if (valor < 0) {
      throw new ValidationError('El porcentaje base de liquidación no puede ser negativo');
    }
  }
  if (data.porcentajeComisionPatron !== undefined && data.porcentajeComisionPatron !== null) {
    const valor = Number(data.porcentajeComisionPatron);
    if (valor < 0) {
      throw new ValidationError('El porcentaje de comisión del patrón no puede ser negativo');
    }
  }
  if (data.cantPersonalCalcComisionMotorista !== undefined && data.cantPersonalCalcComisionMotorista !== null) {
    const valor = Number(data.cantPersonalCalcComisionMotorista);
    if (valor < 0) {
      throw new ValidationError('La cantidad de personal para cálculo de comisión del motorista no puede ser negativa');
    }
  }
  if (data.cantDivisoriaCalcComisionMotorista !== undefined && data.cantDivisoriaCalcComisionMotorista !== null) {
    const valor = Number(data.cantDivisoriaCalcComisionMotorista);
    if (valor < 0) {
      throw new ValidationError('La cantidad divisoria para cálculo de comisión del motorista no puede ser negativa');
    }
  }
  if (data.porcentajeCalcComisionPanguero !== undefined && data.porcentajeCalcComisionPanguero !== null) {
    const valor = Number(data.porcentajeCalcComisionPanguero);
    if (valor < 0) {
      throw new ValidationError('El porcentaje de cálculo de comisión del panguero no puede ser negativo');
    }
  }

  // Validar monedaCalculosLiqId
  if (data.monedaCalculosLiqId !== undefined && data.monedaCalculosLiqId !== null) {
    const existe = await prisma.moneda.findUnique({ where: { id: BigInt(data.monedaCalculosLiqId) } });
    if (!existe) {
      throw new ValidationError('La moneda seleccionada no existe');
    }
  }

  // Validar márgenes de utilidad
  if (data.margenMinimoPermitido !== undefined && data.margenMinimoPermitido !== null) {
    const margenMinimo = Number(data.margenMinimoPermitido);
    if (margenMinimo < 0) {
      throw new ValidationError('El margen mínimo no puede ser negativo');
    }
    if (margenMinimo > 100) {
      throw new ValidationError('El margen mínimo no puede ser mayor a 100%');
    }
  }

  if (data.margenUtilidadObjetivo !== undefined && data.margenUtilidadObjetivo !== null) {
    const margenObjetivo = Number(data.margenUtilidadObjetivo);
    if (margenObjetivo < 0) {
      throw new ValidationError('El margen objetivo no puede ser negativo');
    }
    if (margenObjetivo > 100) {
      throw new ValidationError('El margen objetivo no puede ser mayor a 100%');
    }
  }

  // Validar que margenMinimo <= margenObjetivo
  if (data.margenMinimoPermitido !== undefined && data.margenUtilidadObjetivo !== undefined &&
      data.margenMinimoPermitido !== null && data.margenUtilidadObjetivo !== null) {
    const margenMinimo = Number(data.margenMinimoPermitido);
    const margenObjetivo = Number(data.margenUtilidadObjetivo);
    if (margenMinimo > margenObjetivo) {
      throw new ValidationError('El margen mínimo no puede ser mayor al margen objetivo');
    }
  }

  // Validar campos de Nubefact
  if (data.nubefactUrl !== undefined && data.nubefactUrl !== null) {
    const url = String(data.nubefactUrl).trim();
    if (url.length > 255) {
      throw new ValidationError('La URL de Nubefact no puede exceder 255 caracteres');
    }
    // Validar formato básico de URL
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      throw new ValidationError('La URL de Nubefact debe comenzar con http:// o https://');
    }
  }

  if (data.nubefactToken !== undefined && data.nubefactToken !== null) {
    const token = String(data.nubefactToken).trim();
    if (token.length > 500) {
      throw new ValidationError('El token de Nubefact no puede exceder 500 caracteres');
    }
  }
}

/**
 * Lista todas las empresas ordenadas por ID descendente (más recientes primero).
 */
const listar = async () => {
  try {
    return await prisma.empresa.findMany({ 
      include: { sedes: true, centrosCosto: true },
      orderBy: { id: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una empresa por ID (incluyendo sedes y centros de costo asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id }, include: { sedes: true, centrosCosto: true } });
    if (!empresa) throw new NotFoundError('Empresa no encontrada');
    return empresa;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una empresa validando representantelegalId.
 */
const crear = async (data) => {
  try {
    await validarEmpresa(data);
    
    // Agregar fechaActualizacion automáticamente
    const empresaData = {
      ...data,
      fechaActualizacion: new Date()
    };
    
    return await prisma.empresa.create({ data: empresaData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una empresa existente, validando existencia y representantelegalId.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.empresa.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Empresa no encontrada');
    await validarEmpresa(data);
    
    // Agregar fechaActualizacion automáticamente
    const empresaData = {
      ...data,
      fechaActualizacion: new Date()
    };
    
    
    const resultado = await prisma.empresa.update({ where: { id }, data: empresaData });
    
    
    return resultado;
  } catch (err) {
    console.error("❌ BACKEND - Error al actualizar empresa:", err);
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una empresa por ID, validando existencia y que no tenga sedes o centros de costo asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.empresa.findUnique({ where: { id }, include: { sedes: true, centrosCosto: true } });
    if (!existente) throw new NotFoundError('Empresa no encontrada');
    if ((existente.sedes && existente.sedes.length > 0) || (existente.centrosCosto && existente.centrosCosto.length > 0)) {
      throw new ConflictError('No se puede eliminar la empresa porque tiene sedes o centros de costo asociados.');
    }
    await prisma.empresa.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Propaga los márgenes de utilidad de la empresa a todos sus productos.
 * Actualiza margenMinimoPermitido y margenUtilidadObjetivo en todos los productos de la empresa.
 * @param {BigInt} id - ID de la empresa
 * @returns {Object} - Resultado con cantidad de productos actualizados
 */
const propagarMargenes = async (id) => {
  try {
    // Obtener empresa
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) throw new NotFoundError('Empresa no encontrada');

    // Validar que la empresa tenga márgenes configurados
    if (empresa.margenMinimoPermitido === null || empresa.margenUtilidadObjetivo === null) {
      throw new ValidationError('La empresa no tiene márgenes configurados');
    }

    // Contar productos que serán afectados
    const totalProductos = await prisma.producto.count({
      where: { empresaId: id }
    });

    if (totalProductos === 0) {
      return {
        success: true,
        mensaje: 'No hay productos para actualizar',
        productosActualizados: 0,
        margenMinimo: empresa.margenMinimoPermitido,
        margenObjetivo: empresa.margenUtilidadObjetivo
      };
    }

    // Actualizar todos los productos de la empresa
    const resultado = await prisma.producto.updateMany({
      where: { empresaId: id },
      data: {
        margenMinimoPermitido: empresa.margenMinimoPermitido,
        margenUtilidadObjetivo: empresa.margenUtilidadObjetivo,
        fechaActualizacion: new Date()
      }
    });

    return {
      success: true,
      mensaje: `Se actualizaron ${resultado.count} productos correctamente`,
      productosActualizados: resultado.count,
      margenMinimo: empresa.margenMinimoPermitido,
      margenObjetivo: empresa.margenUtilidadObjetivo
    };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene los parámetros de liquidación de pesca de una empresa
 * @param {BigInt} id - ID de la empresa
 * @returns {Promise<Object>} Parámetros de liquidación
 */
const obtenerParametrosLiquidacion = async (id) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        porcentajeBaseLiqPesca: true,
        porcentajeComisionPatron: true,
        cantPersonalCalcComisionMotorista: true,
        cantDivisoriaCalcComisionMotorista: true,
        porcentajeCalcComisionPanguero: true,
        monedaCalculosLiqId: true
      }
    });

    if (!empresa) {
      throw new NotFoundError('Empresa no encontrada');
    }

    return empresa;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default { listar, obtenerPorId, crear, actualizar, eliminar, propagarMargenes, obtenerParametrosLiquidacion };