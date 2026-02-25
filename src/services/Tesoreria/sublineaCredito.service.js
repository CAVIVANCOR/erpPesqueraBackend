import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SublineaCredito
 * Gestiona las sublíneas de crédito asociadas a una línea de crédito maestra.
 * Documentado en español.
 */

/**
 * Valida los datos de una sublínea de crédito.
 * @param {Object} data - Datos de la sublínea
 */
async function validarSublineaCredito(data) {
  // Validar línea de crédito
  if (data.lineaCreditoId) {
    const lineaCredito = await prisma.lineaCredito.findUnique({ 
      where: { id: data.lineaCreditoId } 
    });
    if (!lineaCredito) {
      throw new ValidationError('La línea de crédito referenciada no existe.');
    }
  }

  // Validar tipo de préstamo
  if (data.tipoPrestamoId) {
    const tipoPrestamo = await prisma.tipoPrestamo.findUnique({ 
      where: { id: data.tipoPrestamoId } 
    });
    if (!tipoPrestamo) {
      throw new ValidationError('El tipo de préstamo referenciado no existe.');
    }
  }

  // Validar que montoAsignado sea positivo
  if (data.montoAsignado !== undefined && data.montoAsignado <= 0) {
    throw new ValidationError('El monto asignado debe ser mayor a cero.');
  }

  // Validar que montoUtilizado no sea negativo
  if (data.montoUtilizado !== undefined && data.montoUtilizado < 0) {
    throw new ValidationError('El monto utilizado no puede ser negativo.');
  }

  // Validar que montoUtilizado no exceda montoAsignado
  if (data.montoAsignado !== undefined && data.montoUtilizado !== undefined) {
    if (parseFloat(data.montoUtilizado) > parseFloat(data.montoAsignado)) {
      throw new ValidationError('El monto utilizado no puede exceder el monto asignado.');
    }
  }
}

/**
 * Calcula el monto disponible de una sublínea.
 * @param {number} montoAsignado - Monto asignado
 * @param {number} montoUtilizado - Monto utilizado
 * @returns {number} Monto disponible
 */
function calcularMontoDisponible(montoAsignado, montoUtilizado) {
  return parseFloat(montoAsignado) - parseFloat(montoUtilizado || 0);
}

/**
 * Listar todas las sublíneas de crédito
 */
const listar = async () => {
  try {
    const sublineas = await prisma.sublineaCredito.findMany({
      include: {
        lineaCredito: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          }
        },
        tipoPrestamo: true,
        personalCreador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          }
        },
        personalActualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          }
        },
      },
      orderBy: {
        creadoEn: 'desc'
      }
    });
    return sublineas;
  } catch (error) {
    throw new DatabaseError('Error al listar sublíneas de crédito: ' + error.message);
  }
};

const listarPorLinea = async (lineaCreditoId) => {
  try {
    const sublineas = await prisma.sublineaCredito.findMany({
      where: { lineaCreditoId: lineaCreditoId },
      include: {
        tipoPrestamo: true,
        sobregiros: {
          where: {
            activo: true,
          },
        },
        prestamos: {
          where: {
            estado: {
              descripcion: 'VIGENTE'
            }
          },
          select: {
            id: true,
            saldoCapital: true,
          }
        }
      },
      orderBy: { creadoEn: 'desc' },
    });

    // Calcular montos para cada sublínea
    const sublineasConCalculos = sublineas.map(sublinea => {
      // Calcular total de sobregiros activos (con o sin aprobación)
      const totalSobregiros = sublinea.sobregiros.reduce((sum, sobregiro) => {
        return sum + parseFloat(sobregiro.montoAutorizado || 0);
      }, 0);

      // Calcular monto utilizado (suma de saldos de capital de préstamos vigentes)
      const montoUtilizado = sublinea.prestamos.reduce((sum, prestamo) => {
        return sum + parseFloat(prestamo.saldoCapital || 0);
      }, 0);

      // Calcular monto disponible (asignado + sobregiros - utilizado)
      const montoAsignado = parseFloat(sublinea.montoAsignado || 0);
      const montoDisponible = montoAsignado + totalSobregiros - montoUtilizado;

      return {
        ...sublinea,
        totalSobregiros,
        montoUtilizado,
        montoDisponible,
      };
    });

    return sublineasConCalculos;
  } catch (error) {
    throw new DatabaseError('Error al listar sublíneas por línea: ' + error.message);
  }
};
/**
 * Listar sublíneas activas
 */
const listarActivas = async () => {
  try {
    const sublineas = await prisma.sublineaCredito.findMany({
      where: { activo: true },
      include: {
        lineaCredito: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          }
        },
        tipoPrestamo: true,
      },
      orderBy: {
        creadoEn: 'desc'
      }
    });
    return sublineas;
  } catch (error) {
    throw new DatabaseError('Error al listar sublíneas activas: ' + error.message);
  }
};

/**
 * Obtener una sublínea por ID
 * @param {BigInt} id - ID de la sublínea
 */
const obtenerPorId = async (id) => {
  try {
    const sublinea = await prisma.sublineaCredito.findUnique({
      where: { id },
      include: {
        lineaCredito: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          }
        },
        tipoPrestamo: true,
        personalCreador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          }
        },
        personalActualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          }
        },
      }
    });

    if (!sublinea) {
      throw new NotFoundError('Sublínea de crédito no encontrada');
    }

    return sublinea;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Error al obtener sublínea de crédito: ' + error.message);
  }
};

/**
 * Crear una nueva sublínea de crédito
 * @param {Object} data - Datos de la sublínea
 */
const crear = async (data) => {
  try {
    // Validar datos
    await validarSublineaCredito(data);

    // Validar campos obligatorios
    if (!data.lineaCreditoId || !data.tipoPrestamoId || !data.montoAsignado) {
      throw new ValidationError('Faltan campos obligatorios: lineaCreditoId, tipoPrestamoId, montoAsignado');
    }

    // Verificar que no exista ya una sublínea con el mismo tipo para esta línea
    const sublineaExistente = await prisma.sublineaCredito.findFirst({
      where: {
        lineaCreditoId: data.lineaCreditoId,
        tipoPrestamoId: data.tipoPrestamoId,
      }
    });

    if (sublineaExistente) {
      throw new ConflictError('Ya existe una sublínea para este tipo de préstamo. Si desea crear variantes, edite la sublínea existente y modifique su descripción.');
    }

        // Validar que la suma de sublíneas no exceda el monto aprobado de la línea
    const lineaCredito = await prisma.lineaCredito.findUnique({
      where: { id: data.lineaCreditoId },
      include: {
        sublineas: true
      }
    });

    // Agrupar sublíneas actuales por descripción (excluir las marcadas como excluirDeCalculo)
    const gruposPorDescripcion = lineaCredito.sublineas
      .filter(s => !s.excluirDeCalculo)
      .reduce((grupos, sublinea) => {
        const descripcion = sublinea.descripcion || 'Sin descripción';
        if (!grupos[descripcion]) {
          grupos[descripcion] = [];
        }
        grupos[descripcion].push(sublinea);
        return grupos;
      }, {});

    // Calcular suma de máximos actuales (ordenar por monto descendente y tomar el primero)
    let sumaMaximosActuales = 0;
    Object.values(gruposPorDescripcion).forEach(grupo => {
      // Ordenar por monto descendente y tomar el primero
      const sublineaMaxima = grupo.sort((a, b) => parseFloat(b.montoAsignado || 0) - parseFloat(a.montoAsignado || 0))[0];
      sumaMaximosActuales += parseFloat(sublineaMaxima.montoAsignado || 0);
    });

    // Simular agregar la nueva sublínea y recalcular
    const descripcionNueva = data.descripcion || 'Sin descripción';
    const grupoNuevo = gruposPorDescripcion[descripcionNueva] || [];
    const grupoConNueva = [...grupoNuevo, { montoAsignado: data.montoAsignado }];
    
    // Ordenar por monto descendente y tomar el primero
    const sublineaMaximaGrupo = grupoConNueva.sort((a, b) => parseFloat(b.montoAsignado || 0) - parseFloat(a.montoAsignado || 0))[0];
    const maxNuevoGrupo = parseFloat(sublineaMaximaGrupo.montoAsignado || 0);
    
    // Restar el máximo anterior del grupo (si existía) y sumar el nuevo máximo
    const maxAnteriorGrupo = grupoNuevo.length > 0 
      ? parseFloat(grupoNuevo.sort((a, b) => parseFloat(b.montoAsignado || 0) - parseFloat(a.montoAsignado || 0))[0].montoAsignado || 0)
      : 0;
    const nuevaSuma = sumaMaximosActuales - maxAnteriorGrupo + maxNuevoGrupo;

    if (nuevaSuma > parseFloat(lineaCredito.montoAprobado)) {
      throw new ValidationError(
        `La suma de sublíneas (${nuevaSuma.toFixed(2)}) excede el monto aprobado de la línea (${parseFloat(lineaCredito.montoAprobado).toFixed(2)})`
      );
    }

    // Calcular monto disponible
    const montoUtilizado = data.montoUtilizado || 0;
    const montoDisponible = calcularMontoDisponible(data.montoAsignado, montoUtilizado);

    // Crear sublínea
    const sublinea = await prisma.sublineaCredito.create({
      data: {
        lineaCreditoId: data.lineaCreditoId,
        tipoPrestamoId: data.tipoPrestamoId,
        descripcion: data.descripcion || null,
        montoAsignado: data.montoAsignado,
        montoUtilizado: montoUtilizado,
        montoDisponible: montoDisponible,
        activo: data.activo !== undefined ? data.activo : true,
        observaciones: data.observaciones || null,
        creadoPor: data.creadoPor || null,
      },
      include: {
        tipoPrestamo: true,
      }
    });

    return sublinea;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) throw error;
    throw new DatabaseError('Error al crear sublínea de crédito: ' + error.message);
  }
};

/**
 * Actualizar una sublínea de crédito
 * @param {BigInt} id - ID de la sublínea
 * @param {Object} data - Datos a actualizar
 */
const actualizar = async (id, data) => {
  try {
    // Verificar que existe
    const sublineaExistente = await prisma.sublineaCredito.findUnique({
      where: { id },
      include: {
        lineaCredito: {
          include: {
            sublineas: true
          }
        }
      }
    });

    if (!sublineaExistente) {
      throw new NotFoundError('Sublínea de crédito no encontrada');
    }

    // Validar datos
    await validarSublineaCredito(data);

    // Si se cambia el tipo de préstamo, validar que no exista duplicado
    if (data.tipoPrestamoId && data.tipoPrestamoId !== sublineaExistente.tipoPrestamoId) {
      const duplicado = await prisma.sublineaCredito.findFirst({
        where: {
          lineaCreditoId: sublineaExistente.lineaCreditoId,
          tipoPrestamoId: data.tipoPrestamoId,
          id: { not: id }
        }
      });

      if (duplicado) {
        throw new ConflictError('Ya existe una sublínea para este tipo de préstamo en esta línea de crédito.');
      }
    }

       // Si se cambia el monto asignado, validar que no exceda el límite de la línea
    if (data.montoAsignado !== undefined) {
      // Agrupar sublíneas por descripción (excluyendo la que se está actualizando y las excluidas)
      const otrasSublíneas = sublineaExistente.lineaCredito.sublineas
        .filter(s => s.id !== id && !s.excluirDeCalculo);
      const gruposPorDescripcion = otrasSublíneas.reduce((grupos, sublinea) => {
        const descripcion = sublinea.descripcion || 'Sin descripción';
        if (!grupos[descripcion]) {
          grupos[descripcion] = [];
        }
        grupos[descripcion].push(sublinea);
        return grupos;
      }, {});

      // Calcular suma de máximos actuales (sin la sublínea que se actualiza)
      let sumaMaximosActuales = 0;
      Object.values(gruposPorDescripcion).forEach(grupo => {
        // Ordenar por monto descendente y tomar el primero
        const sublineaMaxima = grupo.sort((a, b) => parseFloat(b.montoAsignado || 0) - parseFloat(a.montoAsignado || 0))[0];
        sumaMaximosActuales += parseFloat(sublineaMaxima.montoAsignado || 0);
      });

      // Simular actualizar la sublínea y recalcular
      const descripcionActualizada = data.descripcion !== undefined ? data.descripcion : sublineaExistente.descripcion;
      const descripcionKey = descripcionActualizada || 'Sin descripción';
      const grupoActualizado = gruposPorDescripcion[descripcionKey] || [];
      const grupoConActualizada = [...grupoActualizado, { montoAsignado: data.montoAsignado }];
      
      // Ordenar por monto descendente y tomar el primero
      const sublineaMaximaGrupo = grupoConActualizada.sort((a, b) => parseFloat(b.montoAsignado || 0) - parseFloat(a.montoAsignado || 0))[0];
      const maxNuevoGrupo = parseFloat(sublineaMaximaGrupo.montoAsignado || 0);
      
      // Restar el máximo anterior del grupo (si existía) y sumar el nuevo máximo
      const maxAnteriorGrupo = grupoActualizado.length > 0
        ? parseFloat(grupoActualizado.sort((a, b) => parseFloat(b.montoAsignado || 0) - parseFloat(a.montoAsignado || 0))[0].montoAsignado || 0)
        : 0;
      const nuevaSuma = sumaMaximosActuales - maxAnteriorGrupo + maxNuevoGrupo;

      if (nuevaSuma > parseFloat(sublineaExistente.lineaCredito.montoAprobado)) {
        throw new ValidationError(
          `La suma de sublíneas (${nuevaSuma.toFixed(2)}) excede el monto aprobado de la línea (${parseFloat(sublineaExistente.lineaCredito.montoAprobado).toFixed(2)})`
        );
      }
    }

    // Preparar datos de actualización
    const dataToUpdate = {};

    if (data.tipoPrestamoId !== undefined) dataToUpdate.tipoPrestamoId = data.tipoPrestamoId;
    if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion;
    if (data.montoAsignado !== undefined) dataToUpdate.montoAsignado = data.montoAsignado;
    if (data.montoUtilizado !== undefined) dataToUpdate.montoUtilizado = data.montoUtilizado;
    if (data.activo !== undefined) dataToUpdate.activo = data.activo;
    if (data.excluirDeCalculo !== undefined) dataToUpdate.excluirDeCalculo = data.excluirDeCalculo;
    if (data.observaciones !== undefined) dataToUpdate.observaciones = data.observaciones;
    if (data.actualizadoPor !== undefined) dataToUpdate.actualizadoPor = data.actualizadoPor;

    // Recalcular monto disponible
    const montoAsignado = data.montoAsignado !== undefined ? data.montoAsignado : sublineaExistente.montoAsignado;
    const montoUtilizado = data.montoUtilizado !== undefined ? data.montoUtilizado : sublineaExistente.montoUtilizado;
    dataToUpdate.montoDisponible = calcularMontoDisponible(montoAsignado, montoUtilizado);

    // Actualizar
    const sublinea = await prisma.sublineaCredito.update({
      where: { id },
      data: dataToUpdate,
      include: {
        tipoPrestamo: true,
      }
    });

    return sublinea;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) throw error;
    throw new DatabaseError('Error al actualizar sublínea de crédito: ' + error.message);
  }
};

/**
 * Eliminar una sublínea de crédito
 * @param {BigInt} id - ID de la sublínea
 */
const eliminar = async (id) => {
  try {
    // Verificar que existe
    const sublinea = await prisma.sublineaCredito.findUnique({
      where: { id },
      include: {
        prestamos: true
      }
    });

    if (!sublinea) {
      throw new NotFoundError('Sublínea de crédito no encontrada');
    }

    // Validar que no tenga préstamos asociados
    if (sublinea.prestamos && sublinea.prestamos.length > 0) {
      throw new ConflictError('No se puede eliminar la sublínea porque tiene préstamos asociados.');
    }

    // Eliminar
    await prisma.sublineaCredito.delete({
      where: { id }
    });

    return { message: 'Sublínea de crédito eliminada correctamente' };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ConflictError) throw error;
    throw new DatabaseError('Error al eliminar sublínea de crédito: ' + error.message);
  }
};

/**
 * Actualizar monto utilizado de una sublínea
 * @param {BigInt} id - ID de la sublínea
 */
const actualizarMontoUtilizado = async (id) => {
  try {
    const sublinea = await prisma.sublineaCredito.findUnique({
      where: { id },
      include: {
        prestamos: true
      }
    });

    if (!sublinea) {
      throw new NotFoundError('Sublínea de crédito no encontrada');
    }

    // Calcular monto utilizado sumando los saldos de préstamos activos
    const montoUtilizado = sublinea.prestamos
      .filter(p => p.estadoId !== null)
      .reduce((sum, p) => sum + parseFloat(p.saldoCapital || 0), 0);

    const montoDisponible = calcularMontoDisponible(sublinea.montoAsignado, montoUtilizado);

    // Actualizar
    const sublineaActualizada = await prisma.sublineaCredito.update({
      where: { id },
      data: {
        montoUtilizado,
        montoDisponible
      }
    });

    return sublineaActualizada;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Error al actualizar monto utilizado: ' + error.message);
  }
};



// ============================================
// GESTIÓN DE SOBREGIROS
// ============================================

/**
 * Crear un sobregiro autorizado para una sublínea
 * @param {BigInt} sublineaCreditoId - ID de la sublínea
 * @param {Object} data - Datos del sobregiro
 * @returns {Object} Sobregiro creado
 */
const crearSobregiro = async (sublineaCreditoId, data) => {
  try {
    // Validar que la sublínea existe
    const sublinea = await prisma.sublineaCredito.findUnique({
      where: { id: sublineaCreditoId },
    });

    if (!sublinea) {
      throw new NotFoundError('La sublínea de crédito no existe.');
    }

    // Validar monto autorizado
    if (!data.montoAutorizado || parseFloat(data.montoAutorizado) <= 0) {
      throw new ValidationError('El monto autorizado debe ser mayor a cero.');
    }

    // Crear sobregiro
    const sobregiro = await prisma.sobregiroAutorizado.create({
      data: {
        sublineaCreditoId: sublineaCreditoId,
        montoAutorizado: data.montoAutorizado,
        fechaSolicitud: data.fechaSolicitud || new Date(),
        fechaAprobacion: data.fechaAprobacion || null,
        autorizadoPorBanco: data.autorizadoPorBanco || null,
        numeroAutorizacionBanco: data.numeroAutorizacionBanco || null,
        motivoSolicitud: data.motivoSolicitud || null,
        creadoPor: data.creadoPor || null,
        activo: true,
      },
    });

    return sobregiro;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError('Error al crear sobregiro: ' + error.message);
  }
};

/**
 * Actualizar un sobregiro autorizado
 * @param {BigInt} sobregiroid - ID del sobregiro
 * @param {Object} data - Datos a actualizar
 * @returns {Object} Sobregiro actualizado
 */
const actualizarSobregiro = async (sobregiroid, data) => {
  try {
    // Verificar que el sobregiro existe
    const sobregiroidExistente = await prisma.sobregiroAutorizado.findUnique({
      where: { id: sobregiroid },
    });

    if (!sobregiroidExistente) {
      throw new NotFoundError('El sobregiro no existe.');
    }

    // Preparar datos a actualizar
    const dataToUpdate = {};

    if (data.montoAutorizado !== undefined) {
      if (parseFloat(data.montoAutorizado) <= 0) {
        throw new ValidationError('El monto autorizado debe ser mayor a cero.');
      }
      dataToUpdate.montoAutorizado = data.montoAutorizado;
    }

    if (data.fechaAprobacion !== undefined) dataToUpdate.fechaAprobacion = data.fechaAprobacion;
    if (data.autorizadoPorBanco !== undefined) dataToUpdate.autorizadoPorBanco = data.autorizadoPorBanco;
    if (data.numeroAutorizacionBanco !== undefined) dataToUpdate.numeroAutorizacionBanco = data.numeroAutorizacionBanco;
    if (data.motivoSolicitud !== undefined) dataToUpdate.motivoSolicitud = data.motivoSolicitud;
    if (data.actualizadoPor !== undefined) dataToUpdate.actualizadoPor = data.actualizadoPor;

    // Actualizar
    const sobregiroidActualizado = await prisma.sobregiroAutorizado.update({
      where: { id: sobregiroid },
      data: dataToUpdate,
    });

    return sobregiroidActualizado;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError('Error al actualizar sobregiro: ' + error.message);
  }
};

/**
 * Cancelar un sobregiro (marcar como inactivo)
 * @param {BigInt} sobregiroid - ID del sobregiro
 * @returns {Object} Sobregiro cancelado
 */
const cancelarSobregiro = async (sobregiroid) => {
  try {
    // Verificar que el sobregiro existe
    const sobregiroidExistente = await prisma.sobregiroAutorizado.findUnique({
      where: { id: sobregiroid },
    });

    if (!sobregiroidExistente) {
      throw new NotFoundError('El sobregiro no existe.');
    }

    // Marcar como inactivo
    const sobregiroCancelado = await prisma.sobregiroAutorizado.update({
      where: { id: sobregiroid },
      data: { activo: false },
    });

    return sobregiroCancelado;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError('Error al cancelar sobregiro: ' + error.message);
  }
};

/**
 * Obtener sobregiros de una sublínea
 * @param {BigInt} sublineaCreditoId - ID de la sublínea
 * @returns {Array} Lista de sobregiros
 */
const obtenerSobregiros = async (sublineaCreditoId) => {
  try {
    const sobregiros = await prisma.sobregiroAutorizado.findMany({
      where: { sublineaCreditoId: sublineaCreditoId },
      orderBy: { creadoEn: 'desc' },
    });

    return sobregiros;
  } catch (error) {
    throw new DatabaseError('Error al obtener sobregiros: ' + error.message);
  }
};

/**
 * Obtener sobregiros vigentes de una sublínea
 * @param {BigInt} sublineaCreditoId - ID de la sublínea
 * @returns {Array} Lista de sobregiros vigentes
 */
const obtenerSobregiosVigentes = async (sublineaCreditoId) => {
  try {
    const sobregiros = await prisma.sobregiroAutorizado.findMany({
      where: {
        sublineaCreditoId: sublineaCreditoId,
        activo: true,
        fechaAprobacion: { not: null },
      },
      orderBy: { fechaAprobacion: 'desc' },
    });

    return sobregiros;
  } catch (error) {
    throw new DatabaseError('Error al obtener sobregiros vigentes: ' + error.message);
  }
};


export default {
  listar,
  listarPorLinea,
  listarActivas,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  actualizarMontoUtilizado,
  crearSobregiro,
  actualizarSobregiro,
  cancelarSobregiro,
  obtenerSobregiros,
  obtenerSobregiosVigentes,
};
