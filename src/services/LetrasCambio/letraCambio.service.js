import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LetraCambio
 * Gestiona las letras de cambio por cobrar y por pagar.
 * Documentado en español.
 */

async function validarLetraCambio(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.entidadComercialId) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!entidad) throw new ValidationError('La entidad comercial referenciada no existe.');
  }

  if (data.cuentaPorCobrarId) {
    const cuenta = await prisma.cuentaPorCobrar.findUnique({ where: { id: data.cuentaPorCobrarId } });
    if (!cuenta) throw new ValidationError('La cuenta por cobrar referenciada no existe.');
  }

  if (data.cuentaPorPagarId) {
    const cuenta = await prisma.cuentaPorPagar.findUnique({ where: { id: data.cuentaPorPagarId } });
    if (!cuenta) throw new ValidationError('La cuenta por pagar referenciada no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.tipoLetra && !['POR_COBRAR', 'POR_PAGAR'].includes(data.tipoLetra)) {
    throw new ValidationError('El tipo de letra debe ser: POR_COBRAR o POR_PAGAR.');
  }

  if (data.montoTotal !== undefined && data.montoTotal <= 0) {
    throw new ValidationError('El monto total debe ser mayor a 0.');
  }

  if (data.numeroLetra) {
    const existente = await prisma.letraCambio.findFirst({
      where: {
        numeroLetra: data.numeroLetra,
        empresaId: data.empresaId,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`Ya existe una letra con el número "${data.numeroLetra}".`);
    }
  }
}

const listar = async () => {
  try {
    return await prisma.letraCambio.findMany({
      include: {
        empresa: true,
        entidadComercial: true,
        cuentaPorCobrar: true,
        cuentaPorPagar: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaEmision: 'desc' }
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
      include: {
        empresa: true,
        entidadComercial: true,
        cuentaPorCobrar: true,
        cuentaPorPagar: true,
        moneda: true,
        estado: true
      }
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
    if (!data.empresaId || !data.entidadComercialId || !data.tipoLetra || !data.numeroLetra || !data.fechaEmision || !data.fechaVencimiento || !data.montoTotal || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarLetraCambio(data);

    const letraData = {
      ...data,
      protestada: false,
      renovada: false,
      fechaActualizacion: new Date()
    };

    return await prisma.letraCambio.create({ data: letraData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
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

    const letraData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.letraCambio.update({
      where: { id },
      data: letraData
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
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

    if (existente.protestada) {
      throw new ConflictError('No se puede eliminar una letra protestada.');
    }

    await prisma.letraCambio.delete({ where: { id } });
    return true;
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
      include: {
        entidadComercial: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorTipo = async (empresaId, tipoLetra) => {
  try {
    return await prisma.letraCambio.findMany({
      where: {
        empresaId,
        tipoLetra
      },
      include: {
        entidadComercial: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarVencidas = async (empresaId) => {
  try {
    const hoy = new Date();
    return await prisma.letraCambio.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        protestada: false
      },
      include: {
        entidadComercial: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const marcarProtestada = async (id, fechaProtesto, motivoProtesto) => {
  try {
    const letra = await prisma.letraCambio.findUnique({ where: { id } });
    if (!letra) throw new NotFoundError('Letra de cambio no encontrada');

    if (letra.protestada) {
      throw new ConflictError('La letra ya está protestada.');
    }

    if (!motivoProtesto) {
      throw new ValidationError('Debe proporcionar un motivo de protesto.');
    }

    return await prisma.letraCambio.update({
      where: { id },
      data: {
        protestada: true,
        fechaProtesto: fechaProtesto ? new Date(fechaProtesto) : new Date(),
        motivoProtesto,
        fechaActualizacion: new Date()
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

const marcarRenovada = async (id, nuevaLetraId) => {
  try {
    const letra = await prisma.letraCambio.findUnique({ where: { id } });
    if (!letra) throw new NotFoundError('Letra de cambio no encontrada');

    if (letra.renovada) {
      throw new ConflictError('La letra ya está renovada.');
    }

    if (nuevaLetraId) {
      const nuevaLetra = await prisma.letraCambio.findUnique({ where: { id: nuevaLetraId } });
      if (!nuevaLetra) {
        throw new ValidationError('La nueva letra referenciada no existe.');
      }
    }

    return await prisma.letraCambio.update({
      where: { id },
      data: {
        renovada: true,
        fechaRenovacion: new Date(),
        nuevaLetraId,
        fechaActualizacion: new Date()
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

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  listarPorTipo,
  listarVencidas,
  marcarProtestada,
  marcarRenovada
};
