import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LetraCambio
 * Gestiona las letras de cambio
 */

const incluirRelaciones = {
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
    }
  },
  girado: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
    }
  },
  beneficiario: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
    }
  },
  aval: {
  select: {
    id: true,
    razonSocial: true,
    numeroDocumento: true
  }
},
  moneda: {
    select: {
      id: true,
      simbolo: true,
      codigoSunat: true
    }
  },
    estado: {
    select: {
      id: true,
      descripcion: true,
      severityColor: true
    }
  },
    tipoDocumento: {
    select: {
      id: true,
      descripcion: true,
      codigo: true
    }
  },
  serieDoc: {
    select: {
      id: true,
      serie: true
    }
  },
  ubicacionLetra: {
    select: {
      id: true,
      codigo: true,
      nombre: true
    }
  },
  pagos: {
    select: {
      id: true,
      fechaPago: true,
      montoPago: true
    }
  },
  endosos: {
    select: {
      id: true,
      fechaEndoso: true,
      tipoEndoso: true
    }
  }
};

async function validarLetraCambio(data) {
   if (!data.empresaId || !data.tipoLetra || !data.tipoDocumentoId || !data.giradoId || 
      !data.beneficiarioId || !data.fechaEmision || !data.fechaVencimiento || 
      !data.montoOriginal || !data.monedaId || !data.estadoId) {
    throw new ValidationError('Empresa, tipo letra, tipo documento, girado, beneficiario, fechas, monto, moneda y estado son obligatorios');
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
  if (!empresa) throw new ValidationError('La empresa referenciada no existe');

  const girado = await prisma.entidadComercial.findUnique({ where: { id: data.giradoId } });
  if (!girado) throw new ValidationError('El girado referenciado no existe');

  const beneficiario = await prisma.entidadComercial.findUnique({ where: { id: data.beneficiarioId } });
  if (!beneficiario) throw new ValidationError('El beneficiario referenciado no existe');

  if (data.avalId) {
    const aval = await prisma.entidadComercial.findUnique({ where: { id: data.avalId } });
    if (!aval) throw new ValidationError('El aval referenciado no existe');
  }

  const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
  if (!moneda) throw new ValidationError('La moneda referenciada no existe');

  const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
  if (!estado) throw new ValidationError('El estado referenciado no existe');

  if (data.ubicacionLetraId) {
    const ubicacion = await prisma.ubicacionLetra.findUnique({ where: { id: data.ubicacionLetraId } });
    if (!ubicacion) throw new ValidationError('La ubicación de letra referenciada no existe');
  }

  if (data.registradoPor) {
    const personal = await prisma.personal.findUnique({ where: { id: data.registradoPor } });
    if (!personal) throw new ValidationError('El personal registrador no existe');
  }

  if (data.montoOriginal <= 0) {
    throw new ValidationError('El monto original debe ser mayor a cero');
  }
  if (!['COBRAR', 'PAGAR'].includes(data.tipoLetra)) {
    throw new ValidationError('El tipo de letra debe ser COBRAR o PAGAR');
  }

  const tipoDocumento = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
  if (!tipoDocumento) throw new ValidationError('El tipo de documento referenciado no existe');

  const fechaEmision = new Date(data.fechaEmision);
  const fechaVencimiento = new Date(data.fechaVencimiento);
  if (fechaVencimiento <= fechaEmision) {
    throw new ValidationError('La fecha de vencimiento debe ser posterior a la fecha de emisión');
  }

  const existente = await prisma.letraCambio.findFirst({
    where: {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId,
      id: data.id ? { not: data.id } : undefined
    }
  });

  if (existente) {
    throw new ConflictError(`Ya existe una letra con el número de documento ${data.numeroDocumento} para esta empresa`);
  }
}

const listar = async () => {
  try {
    return await prisma.letraCambio.findMany({
      include: incluirRelaciones,
      orderBy: { fechaVencimiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const letra = await prisma.letraCambio.findUnique({
      where: { id },
      include: incluirRelaciones
    });
    if (!letra) throw new NotFoundError('Letra de cambio no encontrada');
    return letra;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarLetraCambio(data);

        return await prisma.letraCambio.create({
      data: {
        tipoLetra: data.tipoLetra,
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId || null,
        numSerieDoc: data.numSerieDoc || null,
        numCorreDoc: data.numCorreDoc || null,
        numeroDocumento: data.numeroDocumento,
        fechaEmision: new Date(data.fechaEmision),
        fechaVencimiento: new Date(data.fechaVencimiento),
        fechaAceptacion: data.fechaAceptacion ? new Date(data.fechaAceptacion) : null,
        giradoId: data.giradoId,
        beneficiarioId: data.beneficiarioId,
        avalId: data.avalId || null,
        montoOriginal: data.montoOriginal,
        monedaId: data.monedaId,
        cuentaPorCobrarId: data.cuentaPorCobrarId || null,
        cuentaPorPagarId: data.cuentaPorPagarId || null,
        estadoId: data.estadoId,
        descontada: data.descontada || false,
        bancoDescontoId: data.bancoDescontoId || null,
        fechaDescuento: data.fechaDescuento ? new Date(data.fechaDescuento) : null,
        montoDescuento: data.montoDescuento || null,
        tasaDescuento: data.tasaDescuento || null,
        renovada: data.renovada || false,
        letraRenovadaId: data.letraRenovadaId || null,
        protestada: data.protestada || false,
        fechaProtesto: data.fechaProtesto ? new Date(data.fechaProtesto) : null,
        motivoProtesto: data.motivoProtesto || null,
        ubicacionLetraId: data.ubicacionLetraId || null,
        observaciones: data.observaciones || null,
        creadoPor: data.creadoPor || null
      },
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.letraCambio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Letra de cambio no encontrada');

    await validarLetraCambio({ ...data, id });

    return await prisma.letraCambio.update({
      where: { id },
            data: {
        tipoLetra: data.tipoLetra,
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numSerieDoc: data.numSerieDoc,
        numCorreDoc: data.numCorreDoc,
        numeroDocumento: data.numeroDocumento,
        fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : undefined,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : undefined,
        fechaAceptacion: data.fechaAceptacion ? new Date(data.fechaAceptacion) : undefined,
        giradoId: data.giradoId,
        beneficiarioId: data.beneficiarioId,
        avalId: data.avalId,
        montoOriginal: data.montoOriginal,
        monedaId: data.monedaId,
        cuentaPorCobrarId: data.cuentaPorCobrarId,
        cuentaPorPagarId: data.cuentaPorPagarId,
        estadoId: data.estadoId,
        descontada: data.descontada,
        bancoDescontoId: data.bancoDescontoId,
        fechaDescuento: data.fechaDescuento ? new Date(data.fechaDescuento) : undefined,
        montoDescuento: data.montoDescuento,
        tasaDescuento: data.tasaDescuento,
        renovada: data.renovada,
        letraRenovadaId: data.letraRenovadaId,
        protestada: data.protestada,
        fechaProtesto: data.fechaProtesto ? new Date(data.fechaProtesto) : undefined,
        motivoProtesto: data.motivoProtesto,
        ubicacionLetraId: data.ubicacionLetraId,
        observaciones: data.observaciones,
        actualizadoPor: data.actualizadoPor
      },
      include: incluirRelaciones
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.letraCambio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Letra de cambio no encontrada');

    const tienePagos = await prisma.pagoLetraCambio.count({ where: { letraCambioId: id } });
    const tieneEndosos = await prisma.endosoLetraCambio.count({ where: { letraCambioId: id } });

    if (tienePagos > 0 || tieneEndosos > 0) {
      throw new ConflictError('No se puede eliminar la letra porque tiene pagos o endosos asociados');
    }

    await prisma.letraCambio.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.letraCambio.findMany({
      where: { empresaId },
      include: incluirRelaciones,
      orderBy: { fechaVencimiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorGirado = async (giradoId) => {
  try {
    return await prisma.letraCambio.findMany({
      where: { giradoId },
      include: incluirRelaciones,
      orderBy: { fechaVencimiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEstado = async (estadoId) => {
  try {
    return await prisma.letraCambio.findMany({
      where: { estadoId },
      include: incluirRelaciones,
      orderBy: { fechaVencimiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorRangoVencimiento = async (fechaInicio, fechaFin) => {
  try {
    if (!fechaInicio || !fechaFin) {
      throw new ValidationError('Fecha de inicio y fin son obligatorias');
    }

    return await prisma.letraCambio.findMany({
      where: {
        fechaVencimiento: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      },
      include: incluirRelaciones,
      orderBy: { fechaVencimiento: 'asc' }
    });
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
  listarPorGirado,
  listarPorEstado,
  listarPorRangoVencimiento
};