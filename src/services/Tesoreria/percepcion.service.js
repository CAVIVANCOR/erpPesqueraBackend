import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Percepcion
 * Gestiona las percepciones fiscales aplicadas a documentos
 */

const incluirRelaciones = {
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
    }
  },
    proveedor: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
    }
  },
  tipoPercepcion: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      tasa: true
    }
  },
  moneda: {
    select: {
      id: true,
      simbolo: true,
      codigoSunat: true
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
  tipoDocProveedor: {
    select: {
      id: true,
    nombre: true  // ✅ Campo CORRECTO según schema
    }
  },
  estado: {
    select: {
      id: true,
      descripcion: true,
      severityColor: true
    }
  },
  ordenCompra: {
    select: {
      id: true,
      numeroDocumento: true
    }
  },
  cuentaPorPagar: {
    select: {
      id: true,
    numeroOrdenCompra: true  // ✅ Campo CORRECTO según schema
    }
  },
};

async function validarPercepcion(data) {
  if (!data.empresaId || !data.tipoDocumentoId || !data.proveedorId || !data.tipoDocProveedorId || 
      !data.numeroDocProveedor || !data.razonSocialProveedor || !data.tipoPercepcionId || 
      !data.fechaEmision || !data.fechaCobro || !data.tasaPercepcion || 
      !data.importeTotal || !data.importePercibido || !data.importePagado || 
      !data.monedaId || !data.estadoId) {
    throw new ValidationError('Todos los campos obligatorios deben ser proporcionados');
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
  if (!empresa) throw new ValidationError('La empresa referenciada no existe');

  const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
  if (!proveedor) throw new ValidationError('El proveedor referenciado no existe');

  const tipoPercepcion = await prisma.tipoRetencionPercepcion.findUnique({ where: { id: data.tipoPercepcionId } });
  if (!tipoPercepcion) throw new ValidationError('El tipo de percepción referenciado no existe');

  if (tipoPercepcion.tipo !== 'PERCEPCION') {
    throw new ValidationError('El tipo seleccionado no es de percepción');
  }

  const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
  if (!moneda) throw new ValidationError('La moneda referenciada no existe');
  const tipoDocumento = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
  if (!tipoDocumento) throw new ValidationError('El tipo de documento referenciado no existe');

  const tipoDocProveedor = await prisma.tiposDocIdentidad.findUnique({ where: { id: data.tipoDocProveedorId } });
  if (!tipoDocProveedor) throw new ValidationError('El tipo de documento del proveedor referenciado no existe');

  const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
  if (!estado) throw new ValidationError('El estado referenciado no existe');

  if (data.serieDocId) {
    const serieDoc = await prisma.serieDoc.findUnique({ where: { id: data.serieDocId } });
    if (!serieDoc) throw new ValidationError('La serie de documento referenciada no existe');
  }

  if (data.ordenCompraId) {
    const ordenCompra = await prisma.ordenCompra.findUnique({ where: { id: data.ordenCompraId } });
    if (!ordenCompra) throw new ValidationError('La orden de compra referenciada no existe');
  }

  if (data.cuentaPorPagarId) {
    const cuentaPorPagar = await prisma.cuentaPorPagar.findUnique({ where: { id: data.cuentaPorPagarId } });
    if (!cuentaPorPagar) throw new ValidationError('La cuenta por pagar referenciada no existe');
  }

    if (data.importeTotal <= 0) {
    throw new ValidationError('El importe total debe ser mayor a cero');
  }

  if (data.importePercibido <= 0) {
    throw new ValidationError('El importe percibido debe ser mayor a cero');
  }

  if (data.importePagado <= 0) {
    throw new ValidationError('El importe pagado debe ser mayor a cero');
  }

  if (data.tasaPercepcion < 0 || data.tasaPercepcion > 100) {
    throw new ValidationError('La tasa de percepción debe estar entre 0 y 100');
  }

  const existente = await prisma.percepcion.findFirst({
    where: {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId,
      id: data.id ? { not: data.id } : undefined
    }
  });

  if (existente) {
throw new ConflictError(`Ya existe una percepción con el número de documento ${data.numeroDocumento} para esta empresa`);
  }
}

const listar = async () => {
  try {
    return await prisma.percepcion.findMany({
      include: incluirRelaciones,
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
    const percepcion = await prisma.percepcion.findUnique({
      where: { id },
      include: incluirRelaciones
    });
    if (!percepcion) throw new NotFoundError('Percepción no encontrada');
    return percepcion;
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
    await validarPercepcion(data);

    return await prisma.percepcion.create({
      data: {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId || null,
        numSerieDoc: data.numSerieDoc || null,
        numCorreDoc: data.numCorreDoc || null,
        numeroDocumento: data.numeroDocumento || null,
        fechaEmision: new Date(data.fechaEmision),
        fechaCobro: new Date(data.fechaCobro),
        proveedorId: data.proveedorId,
        tipoDocProveedorId: data.tipoDocProveedorId,
        numeroDocProveedor: data.numeroDocProveedor,
        razonSocialProveedor: data.razonSocialProveedor,
        tipoPercepcionId: data.tipoPercepcionId,
        tasaPercepcion: data.tasaPercepcion,
        monedaId: data.monedaId,
        importeTotal: data.importeTotal,
        importePercibido: data.importePercibido,
        importePagado: data.importePagado,
        ordenCompraId: data.ordenCompraId || null,
        cuentaPorPagarId: data.cuentaPorPagarId || null,
        estadoId: data.estadoId,
        aplicadaCredito: data.aplicadaCredito || false,
        fechaAplicacion: data.fechaAplicacion ? new Date(data.fechaAplicacion) : null,
        periodoAplicacion: data.periodoAplicacion || null,
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
    const existente = await prisma.percepcion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Percepción no encontrada');

    await validarPercepcion({ ...data, id });

    return await prisma.percepcion.update({
      where: { id },
      data: {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numSerieDoc: data.numSerieDoc,
        numCorreDoc: data.numCorreDoc,
        numeroDocumento: data.numeroDocumento,
        fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : undefined,
        fechaCobro: data.fechaCobro ? new Date(data.fechaCobro) : undefined,
        proveedorId: data.proveedorId,
        tipoDocProveedorId: data.tipoDocProveedorId,
        numeroDocProveedor: data.numeroDocProveedor,
        razonSocialProveedor: data.razonSocialProveedor,
        tipoPercepcionId: data.tipoPercepcionId,
        tasaPercepcion: data.tasaPercepcion,
        monedaId: data.monedaId,
        importeTotal: data.importeTotal,
        importePercibido: data.importePercibido,
        importePagado: data.importePagado,
        ordenCompraId: data.ordenCompraId,
        cuentaPorPagarId: data.cuentaPorPagarId,
        estadoId: data.estadoId,
        aplicadaCredito: data.aplicadaCredito,
        fechaAplicacion: data.fechaAplicacion ? new Date(data.fechaAplicacion) : undefined,
        periodoAplicacion: data.periodoAplicacion,
        observaciones: data.observaciones
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
    const existente = await prisma.percepcion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Percepción no encontrada');

    await prisma.percepcion.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.percepcion.findMany({
      where: { empresaId },
      include: incluirRelaciones,
      orderBy: { fechaEmision: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorProveedor = async (proveedorId) => {
  try {
    return await prisma.percepcion.findMany({
      where: { proveedorId },
      include: incluirRelaciones,
      orderBy: { fechaEmision: 'desc' }
    });
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
  listarPorEmpresa,
  listarPorProveedor
};