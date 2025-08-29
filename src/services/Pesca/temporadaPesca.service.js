import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TemporadaPesca
 * Valida existencia de claves foráneas, solapamiento de fechas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [empresa, personal] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.personal.findUnique({ where: { id: data.BahiaId } })
  ]);
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!personal) throw new ValidationError('El BahiaId no existe o no corresponde a personal válido.');
}

async function validarSolapamiento(data, id = null) {
  // No permitir temporadas con mismo nombre/empresa/estadoTemporadaId y fechas que se solapen
  const where = {
    nombre: data.nombre,
    empresaId: data.empresaId,
    estadoTemporadaId: data.estadoTemporadaId,
    AND: [
      { fechaInicio: { lte: data.fechaFin } },
      { fechaFin: { gte: data.fechaInicio } }
    ]
  };
  if (id) where['NOT'] = { id };
  const existe = await prisma.temporadaPesca.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una temporada con el mismo nombre, empresa y estado en un rango de fechas solapado.');
}

const listar = async () => {
  try {
    return await prisma.temporadaPesca.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const temp = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!temp) throw new NotFoundError('TemporadaPesca no encontrada');
    return temp;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.empresaId || !data.BahiaId || !data.nombre || !data.estadoTemporadaId || !data.fechaInicio || !data.fechaFin) {
      throw new ValidationError('Todos los campos obligatorios deben estar completos.');
    }
    await validarClavesForaneas(data);
    await validarSolapamiento(data);
    return await prisma.temporadaPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TemporadaPesca no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['empresaId','BahiaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    // Validar solapamiento si cambian nombre, fechas, empresa o estadoTemporadaId
    if (data.nombre || data.fechaInicio || data.fechaFin || data.empresaId || data.estadoTemporadaId) {
      await validarSolapamiento({ ...existente, ...data }, id);
    }
    return await prisma.temporadaPesca.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.temporadaPesca.findUnique({
      where: { id },
      include: { faenas: true, entregasARendir: true, liquidacionTemporada: true }
    });
    if (!existente) throw new NotFoundError('TemporadaPesca no encontrada');
    if ((existente.faenas && existente.faenas.length > 0) || (existente.entregasARendir && existente.entregasARendir.length > 0) || existente.liquidacionTemporada) {
      throw new ConflictError('No se puede eliminar porque tiene faenas, entregas o liquidación asociada.');
    }
    await prisma.temporadaPesca.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const iniciar = async (id) => {
  try {
    const temporada = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!temporada) throw new NotFoundError('TemporadaPesca no encontrada');

    // Obtener acciones previas activas para pesca industrial
    const accionesPrevias = await prisma.accionesPreviasFaena.findMany({
      where: {
        paraPescaIndustrial: true,
        activo: true
      }
    });

    // Implementar lógica de autocompletado según especificaciones
    const [embarcaciones, motoristas, patrones, bahias] = await Promise.all([
      // 1. Filtrar embarcaciones por tipoEmbarcacionId=1
      prisma.embarcacion.findMany({
        where: { tipoEmbarcacionId: 1 }
      }),
      // 2. Filtrar motoristas por empresaId y cargoId=14 (MOTORISTA EMBARCACION)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 14,
          cesado: false
        }
      }),
      // 3. Filtrar patrones por empresaId y cargoId=22 (PATRON EMBARCACION)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 22,
          cesado: false
        }
      }),
      // 4. Filtrar bahías por empresaId y cargoId=10 (BAHIA COMERCIAL)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 10,
          cesado: false
        }
      })
    ]);

    // Autocompletar solo si hay exactamente 1 registro
    const embarcacionId = embarcaciones.length === 1 ? embarcaciones[0].id : null;
    const motoristaId = motoristas.length === 1 ? motoristas[0].id : null;
    const patronId = patrones.length === 1 ? patrones[0].id : null;
    const bahiaId = bahias.length === 1 ? bahias[0].id : null;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear EntregaARendir
      const entregaARendir = await tx.entregaARendir.create({
        data: {
          temporadaPescaId: Number(temporada.id),
          respEntregaRendirId: Number(temporada.BahiaId),
          centroCostoId: Number(temporada.empresaId),
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          entregaLiquidada: false
        }
      });

      // 2. Crear FaenaPesca con lógica de autocompletado específica
      const faenaPesca = await tx.faenaPesca.create({
        data: {
          temporadaId: Number(temporada.id),
          descripcion: `Faena iniciada para temporada ${temporada.nombre}`,
          // Campos autocompletados (solo si hay exactamente 1 registro)
          embarcacionId: embarcacionId,
          motoristaId: motoristaId,
          patronId: patronId,
          bahiaId: bahiaId,
          // Campos que quedan null deliberadamente
          fechaSalida: null,
          fechaRetorno: null,
          puertoSalidaId: null,
          puertoRetornoId: null,
          puertoDescargaId: null,
          bolicheRedId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 3. Crear DetAccionesPreviasFaena para cada acción previa
      const detAcciones = [];
      for (const accion of accionesPrevias) {
        const detAccion = await tx.detAccionesPreviasFaena.create({
          data: {
            faenaPescaId: Number(faenaPesca.id),
            accionPreviaId: Number(accion.id),
            cumplida: false,
            verificado: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        detAcciones.push(detAccion);
      }

      return {
        entregaARendir,
        faenaPesca,
        detAcciones,
        mensaje: 'Temporada iniciada exitosamente'
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
  iniciar
};
