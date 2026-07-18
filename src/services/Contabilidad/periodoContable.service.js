import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { ESTADO_PERIODO_CONTABLE } from "../../utils/estados.constants.js";

/**
 * Servicio CRUD para PeriodoContable
 * Gestiona los períodos contables mensuales con control de cierre, reapertura y bloqueo.
 * Documentado en español.
 */

/**
 * Valida los datos de un período contable.
 * @param {Object} data - Datos del período contable
 */
async function validarPeriodoContable(data) {
  // Validar empresaId
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) {
      throw new ValidationError('La empresa referenciada no existe.');
    }
  }

  // Validar estadoId
  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) {
      throw new ValidationError('El estado referenciado no existe.');
    }
  }

  // Validar año
  if (data.anio !== undefined) {
    const anioActual = new Date().getFullYear();
    if (data.anio < 2000 || data.anio > anioActual + 10) {
      throw new ValidationError(`El año debe estar entre 2000 y ${anioActual + 10}.`);
    }
  }

  // Validar mes (1-12)
  if (data.mes !== undefined) {
    if (data.mes < 1 || data.mes > 12) {
      throw new ValidationError('El mes debe estar entre 1 y 12.');
    }
  }

  // Validar unicidad de período (empresaId + año + mes)
  if (data.empresaId && data.anio !== undefined && data.mes !== undefined) {
    const existente = await prisma.periodoContable.findFirst({
      where: {
        empresaId: data.empresaId,
        anio: data.anio,
        mes: data.mes,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`Ya existe un período contable para ${data.mes}/${data.anio} en esta empresa.`);
    }
  }

  // Validar que cerradoPor exista si está presente
  if (data.cerradoPor) {
    const personal = await prisma.personal.findUnique({ where: { id: data.cerradoPor } });
    if (!personal) {
      throw new ValidationError('El personal que cerró el período no existe.');
    }
  }

  // Validar que reabiertoPor exista si está presente
  if (data.reabiertoPor) {
    const personal = await prisma.personal.findUnique({ where: { id: data.reabiertoPor } });
    if (!personal) {
      throw new ValidationError('El personal que reabrió el período no existe.');
    }
  }

  // Validar que bloqueadoPor exista si está presente
  if (data.bloqueadoPor) {
    const personal = await prisma.personal.findUnique({ where: { id: data.bloqueadoPor } });
    if (!personal) {
      throw new ValidationError('El personal que bloqueó el período no existe.');
    }
  }
}

/**
 * Lista todos los períodos contables ordenados por año y mes descendente.
 */
const listar = async () => {
  try {
    return await prisma.periodoContable.findMany({
      include: {
        empresa: true,
        estado: true,
        personalCierre: true,
        personalReapertura: true,
        personalBloqueo: true
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
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
 * Obtiene un período contable por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const periodo = await prisma.periodoContable.findUnique({
      where: { id },
      include: {
        empresa: true,
        estado: true,
        personalCierre: true,
        personalReapertura: true,
        personalBloqueo: true,
        asientosContables: {
          take: 10,
          orderBy: { fechaAsiento: 'desc' }
        }
      }
    });
    if (!periodo) throw new NotFoundError('Período contable no encontrado');
    return periodo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo período contable.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.empresaId || data.anio === undefined || data.mes === undefined || !data.estadoId) {
      throw new ValidationError('Los campos empresaId, anio, mes y estadoId son obligatorios.');
    }

    await validarPeriodoContable(data);

    return await prisma.periodoContable.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un período contable existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.periodoContable.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Período contable no encontrado');

    await validarPeriodoContable({ ...data, id });

    // Excluir empresaId y estadoId porque tienen @relation y Prisma no permite actualizarlos directamente
    const { empresaId, estadoId, ...dataToUpdate } = data;

    return await prisma.periodoContable.update({
      where: { id },
      data: {
        ...dataToUpdate,
        actualizadoEn: new Date()
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
 * Elimina un período contable por ID.
 * Valida que no tenga asientos contables asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.periodoContable.findUnique({
      where: { id },
      include: {
        asientosContables: true
      }
    });

    if (!existente) throw new NotFoundError('Período contable no encontrado');

    // Validar que no tenga asientos contables
    if (existente.asientosContables && existente.asientosContables.length > 0) {
      throw new ConflictError('No se puede eliminar el período porque tiene asientos contables asociados.');
    }

    await prisma.periodoContable.delete({ where: { id } });
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
 * Lista períodos contables por empresa.
 */
const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.periodoContable.findMany({
      where: { empresaId },
      include: {
        estado: true,
        personalCierre: true,
        personalReapertura: true,
        personalBloqueo: true
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
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
 * Cierra un período contable.
 * Cambia el estado a CERRADO (51) y valida que todos los asientos estén aprobados.
 */
const cerrarPeriodo = async (id, cerradoPor, motivoCierre = null) => {
  try {
    const periodo = await prisma.periodoContable.findUnique({
      where: { id },
      include: {
        asientosContables: true,
        estado: true
      }
    });

    if (!periodo) throw new NotFoundError('Período contable no encontrado');

    // Validar que esté ABIERTO (estadoId = 73)
    const estadoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'ABIERTO' }
    });
    if (!estadoAbierto || Number(periodo.estadoId) !== Number(estadoAbierto.id)) {
      throw new ConflictError('Solo se pueden cerrar períodos en estado ABIERTO.');
    }

    // Validar que cerradoPor exista
    if (cerradoPor) {
      const personal = await prisma.personal.findUnique({ where: { id: cerradoPor } });
      if (!personal) {
        throw new ValidationError('El personal que cierra el período no existe.');
      }
    }

    // Obtener estado CERRADO (74)
    const estadoCerrado = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'CERRADO' }
    });
    if (!estadoCerrado) {
      throw new ValidationError('No se encontró el estado CERRADO en el sistema.');
    }

    return await prisma.periodoContable.update({
      where: { id },
      data: {
        estadoId: estadoCerrado.id,
        fechaCierre: new Date(),
        cerradoPor
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Reabre un período contable cerrado.
 * Cambia el estado de CERRADO (51) a ABIERTO (50).
 * Requiere autorización especial.
 */
const reabrirPeriodo = async (id, reabiertoPor, motivoReapertura) => {
  try {
    const periodo = await prisma.periodoContable.findUnique({
      where: { id },
      include: { estado: true }
    });
    if (!periodo) throw new NotFoundError('Período contable no encontrado');

    // Validar que esté CERRADO (estadoId = 74)
    const estadoCerrado = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'CERRADO' }
    });
    if (!estadoCerrado || Number(periodo.estadoId) !== Number(estadoCerrado.id)) {
      throw new ConflictError('Solo se pueden reabrir períodos en estado CERRADO.');
    }

    // Validar que no esté BLOQUEADO
    const estadoBloqueado = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'BLOQUEADO' }
    });
    if (estadoBloqueado && Number(periodo.estadoId) === Number(estadoBloqueado.id)) {
      throw new ConflictError('El período está BLOQUEADO y no puede ser reabierto.');
    }

    // Validar que reabiertoPor exista
    if (reabiertoPor) {
      const personal = await prisma.personal.findUnique({ where: { id: reabiertoPor } });
      if (!personal) {
        throw new ValidationError('El personal que reabre el período no existe.');
      }
    }

    if (!motivoReapertura?.trim()) {
      throw new ValidationError('Debe proporcionar un motivo para la reapertura.');
    }

    // Obtener estado ABIERTO (73)
    const estadoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'ABIERTO' }
    });
    if (!estadoAbierto) {
      throw new ValidationError('No se encontró el estado ABIERTO en el sistema.');
    }

    return await prisma.periodoContable.update({
      where: { id },
      data: {
        estadoId: estadoAbierto.id,
        fechaReapertura: new Date(),
        reabiertoPor,
        motivoReapertura
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Bloquea un período contable.
 * Cambia el estado de CERRADO (51) a BLOQUEADO (52).
 * Un período bloqueado no puede ser modificado ni reabierto.
 */
const bloquearPeriodo = async (id, bloqueadoPor, motivoBloqueo) => {
  try {
    const periodo = await prisma.periodoContable.findUnique({
      where: { id },
      include: { estado: true }
    });
    if (!periodo) throw new NotFoundError('Período contable no encontrado');

    // Validar que esté CERRADO (estadoId = 74)
    const estadoCerrado = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'CERRADO' }
    });
    if (!estadoCerrado || Number(periodo.estadoId) !== Number(estadoCerrado.id)) {
      throw new ConflictError('Solo se pueden bloquear períodos en estado CERRADO.');
    }

    // Validar que bloqueadoPor exista
    if (bloqueadoPor) {
      const personal = await prisma.personal.findUnique({ where: { id: bloqueadoPor } });
      if (!personal) {
        throw new ValidationError('El personal que bloquea el período no existe.');
      }
    }

    if (!motivoBloqueo?.trim()) {
      throw new ValidationError('Debe proporcionar un motivo para el bloqueo.');
    }

    // Obtener estado BLOQUEADO (75)
    const estadoBloqueado = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'BLOQUEADO' }
    });
    if (!estadoBloqueado) {
      throw new ValidationError('No se encontró el estado BLOQUEADO en el sistema.');
    }

    return await prisma.periodoContable.update({
      where: { id },
      data: {
        estadoId: estadoBloqueado.id,
        fechaBloqueo: new Date(),
        bloqueadoPor,
        motivoBloqueo
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene el período contable activo para una empresa.
 * El período activo es el más reciente en estado ABIERTO (50).
 */
const obtenerPeriodoActivo = async (empresaId) => {
  try {
    // Obtener estado ABIERTO
    const estadoAbierto = await prisma.estadoMultiFuncion.findFirst({
      where: { tipoProvieneDeId: 19, descripcion: 'ABIERTO' }
    });

    if (!estadoAbierto) {
      throw new ValidationError('No se encontró el estado ABIERTO en el sistema.');
    }

    const periodo = await prisma.periodoContable.findFirst({
      where: {
        empresaId,
        estadoId: estadoAbierto.id
      },
      include: {
        empresa: true,
        estado: true
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
      ]
    });

    if (!periodo) {
      throw new NotFoundError('No hay período contable activo para esta empresa.');
    }

    return periodo;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene el período contable que corresponde a una fecha específica.
 * @param {BigInt} empresaId - ID de la empresa
 * @param {Date} fecha - Fecha para buscar el período
 * @returns {Promise<Object>} - Período contable encontrado
 */
const obtenerPeriodoPorFecha = async (empresaId, fecha) => {
  try {
    const fechaObj = new Date(fecha);
    const anio = fechaObj.getFullYear();
    const mes = fechaObj.getMonth() + 1; // getMonth() retorna 0-11

    const periodo = await prisma.periodoContable.findFirst({
      where: {
        empresaId,
        anio,
        mes
      },
      include: {
        empresa: true,
        estado: true
      }
    });

    if (!periodo) {
      throw new NotFoundError(`No se encontró período contable para ${mes}/${anio} en esta empresa.`);
    }

    return periodo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
  cerrarPeriodo,
  reabrirPeriodo,
  bloquearPeriodo,
  obtenerPeriodoActivo,
  obtenerPeriodoPorFecha

};