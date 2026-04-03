import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { puedeEditarRegistroCerrado } from '../../utils/checkSuperUsuario.js';

/**
 * Servicio CRUD para EntregaARendir
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  // Convertir a BigInt para la búsqueda en Prisma
  const temporadaId = BigInt(data.temporadaPescaId);
  const responsableId = BigInt(data.respEntregaRendirId);
  const centroCostoIdBigInt = BigInt(data.centroCostoId);

  const [temporada, responsable, centroCosto] = await Promise.all([
    prisma.temporadaPesca.findUnique({ where: { id: temporadaId } }),
    prisma.personal.findUnique({ where: { id: responsableId } }),
    prisma.centroCosto.findUnique({ where: { id: centroCostoIdBigInt } })
  ]);
  if (!temporada) throw new ValidationError('El temporadaPescaId no existe.');
  if (!responsable) throw new ValidationError('El respEntregaRendirId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.entregaARendir.findMany({
      include: {
        temporadaPesca: true,
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendir.findUnique({ 
      where: { id },
      include: {
        temporadaPesca: true,
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      }
    });
    if (!entrega) throw new NotFoundError('EntregaARendir no encontrada');
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['temporadaPescaId','respEntregaRendirId','centroCostoId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    
    // Preparar datos con campos opcionales explícitos
    const datosNormalizados = {
      temporadaPescaId: BigInt(data.temporadaPescaId),
      respEntregaRendirId: BigInt(data.respEntregaRendirId),
      centroCostoId: BigInt(data.centroCostoId),
      entregaLiquidada: data.entregaLiquidada || false,
      fechaLiquidacion: data.fechaLiquidacion || null,
      respLiquidacionId: data.respLiquidacionId ? BigInt(data.respLiquidacionId) : null,
      urlLiquidacionPdf: data.urlLiquidacionPdf || null,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.entregaARendir.create({ 
      data: datosNormalizados,
      include: {
        temporadaPesca: true,
        respLiquidacion: true,
        respEntregaRendir: true,
        centroCosto: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data, usuarioId = null) => {
  try {
    const existente = await prisma.entregaARendir.findUnique({ 
      where: { id },
      include: {
        temporadaPesca: {
          include: {
            estadoTemporada: true
          }
        }
      }
    });
    if (!existente) throw new NotFoundError('EntregaARendir no encontrada');

    // ========================================
    // ⭐ VALIDACIÓN DE PERMISOS PARA EDITAR
    // ========================================
    const estadosCerrados = await prisma.estadoMultiFuncion.findMany({
      where: {
        tipoProvieneDeId: 4, // Temporada Pesca
        descripcion: { in: ["FINALIZADA", "CANCELADA"] },
        cesado: false
      },
      select: { id: true }
    });
    
    const idsEstadosCerrados = estadosCerrados.map(e => e.id);
    
    const puedeEditar = await puedeEditarRegistroCerrado(
      usuarioId,
      existente.temporadaPesca.estadoTemporadaId,
      idsEstadosCerrados
    );
    
    if (!puedeEditar) {
      throw new ValidationError(
        `No se puede editar la entrega a rendir porque la temporada está en estado "${existente.temporadaPesca?.estadoTemporada?.descripcion}". ` +
        `Solo los superusuarios pueden editar entregas de temporadas finalizadas o canceladas.`
      );
    }

    // Validar claves foráneas si cambian
    const claves = ['temporadaPescaId','respEntregaRendirId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Preparar datos con SOLO campos escalares permitidos
    const datosActualizacion = {
      temporadaPescaId: data.temporadaPescaId,
      respEntregaRendirId: data.respEntregaRendirId,
      centroCostoId: data.centroCostoId,
      entregaLiquidada: data.entregaLiquidada,
      fechaLiquidacion: data.fechaLiquidacion,
      respLiquidacionId: data.respLiquidacionId,
      urlLiquidacionPdf: data.urlLiquidacionPdf,
      fechaCreacion: data.fechaCreacion,
      fechaActualizacion: new Date(),
    };
    
    return await prisma.entregaARendir.update({ 
      where: { id }, 
      data: datosActualizacion,
      include: {
        temporadaPesca: true,
        respLiquidacion: true,
        respEntregaRendir: true,
        centroCosto: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.entregaARendir.findUnique({
      where: { id },
      include: { movimientos: true }
    });
    if (!existente) throw new NotFoundError('EntregaARendir no encontrada');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos asociados.');
    }
    await prisma.entregaARendir.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
