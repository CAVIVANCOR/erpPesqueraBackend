import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Retencion
 * Gestiona las retenciones fiscales aplicadas a documentos
 */

const incluirRelaciones = {
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true
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
  proveedor: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
    }
  },
  tipoRetencion: {
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
    estado: {
    select: {
      id: true,
      descripcion: true,
      severityColor: true
    }
  },
  tipoDocProveedor: {
    select: {
      id: true,
    nombre: true  // ✅ Campo CORRECTO según schema
    }
  },
  cuentaPorPagar: {
    select: {
      id: true,
    numeroOrdenCompra: true  // ✅ Campo CORRECTO según schema
    }
  },
  movimientoCaja: {
    select: {
      id: true,
      monto: true
    }
  },
};

async function validarRetencion(data) {
  if (!data.empresaId || !data.tipoDocumentoId || !data.proveedorId || !data.tipoDocProveedorId || 
      !data.numeroDocProveedor || !data.razonSocialProveedor || !data.tipoRetencionId || 
      !data.fechaEmision || !data.fechaPago || !data.tasaRetencion || 
      !data.importeTotal || !data.importeRetenido || !data.importeNeto || 
      !data.monedaId || !data.estadoId) {
    throw new ValidationError('Todos los campos obligatorios deben ser proporcionados');
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
  if (!empresa) throw new ValidationError('La empresa referenciada no existe');

  const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
  if (!proveedor) throw new ValidationError('El proveedor referenciado no existe');

  const tipoRetencion = await prisma.tipoRetencionPercepcion.findUnique({ where: { id: data.tipoRetencionId } });
  if (!tipoRetencion) throw new ValidationError('El tipo de retención referenciado no existe');

  if (tipoRetencion.tipo !== 'RETENCION') {
    throw new ValidationError('El tipo seleccionado no es de retención');
  }
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

  if (data.cuentaPorPagarId) {
    const cuentaPorPagar = await prisma.cuentaPorPagar.findUnique({ where: { id: data.cuentaPorPagarId } });
    if (!cuentaPorPagar) throw new ValidationError('La cuenta por pagar referenciada no existe');
  }

  if (data.movimientoCajaId) {
    const movimientoCaja = await prisma.movimientoCaja.findUnique({ where: { id: data.movimientoCajaId } });
    if (!movimientoCaja) throw new ValidationError('El movimiento de caja referenciado no existe');
  }
  const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
  if (!moneda) throw new ValidationError('La moneda referenciada no existe');

    if (data.importeTotal <= 0) {
    throw new ValidationError('El importe total debe ser mayor a cero');
  }

  if (data.importeRetenido <= 0) {
    throw new ValidationError('El importe retenido debe ser mayor a cero');
  }

  if (data.importeNeto <= 0) {
    throw new ValidationError('El importe neto debe ser mayor a cero');
  }

  if (data.tasaRetencion < 0 || data.tasaRetencion > 100) {
    throw new ValidationError('La tasa de retención debe estar entre 0 y 100');
  }

  const existente = await prisma.retencion.findFirst({
    where: {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId,
      id: data.id ? { not: data.id } : undefined
    }
  });

  if (existente) {
throw new ConflictError(`Ya existe una retención con el número de documento ${data.numeroDocumento} para esta empresa`);
}
}

const listar = async () => {
  try {
    return await prisma.retencion.findMany({
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
    const retencion = await prisma.retencion.findUnique({
      where: { id },
      include: incluirRelaciones
    });
    if (!retencion) throw new NotFoundError('Retención no encontrada');
    return retencion;
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
    await validarRetencion(data);

    return await prisma.retencion.create({
      data: {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId || null,
        numSerieDoc: data.numSerieDoc || null,
        numCorreDoc: data.numCorreDoc || null,
        numeroDocumento: data.numeroDocumento || null,
        fechaEmision: new Date(data.fechaEmision),
        fechaPago: new Date(data.fechaPago),
        proveedorId: data.proveedorId,
        tipoDocProveedorId: data.tipoDocProveedorId,
        numeroDocProveedor: data.numeroDocProveedor,
        razonSocialProveedor: data.razonSocialProveedor,
        tipoRetencionId: data.tipoRetencionId,
        tasaRetencion: data.tasaRetencion,
        monedaId: data.monedaId,
        importeTotal: data.importeTotal,
        importeRetenido: data.importeRetenido,
        importeNeto: data.importeNeto,
        cuentaPorPagarId: data.cuentaPorPagarId || null,
        movimientoCajaId: data.movimientoCajaId || null,
        nubefactEnviado: data.nubefactEnviado || false,
        nubefactAceptado: data.nubefactAceptado || null,
        nubefactEnlacePDF: data.nubefactEnlacePDF || null,
        nubefactEnlaceXML: data.nubefactEnlaceXML || null,
        nubefactRespuesta: data.nubefactRespuesta || null,
        estadoId: data.estadoId,
        periodoDeclaracion: data.periodoDeclaracion || null,
        declarado: data.declarado || false,
        fechaDeclaracion: data.fechaDeclaracion ? new Date(data.fechaDeclaracion) : null,
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
    const existente = await prisma.retencion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Retención no encontrada');

    await validarRetencion({ ...data, id });

    return await prisma.retencion.update({
      where: { id },
      data: {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numSerieDoc: data.numSerieDoc,
        numCorreDoc: data.numCorreDoc,
        numeroDocumento: data.numeroDocumento,
        fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : undefined,
        fechaPago: data.fechaPago ? new Date(data.fechaPago) : undefined,
        proveedorId: data.proveedorId,
        tipoDocProveedorId: data.tipoDocProveedorId,
        numeroDocProveedor: data.numeroDocProveedor,
        razonSocialProveedor: data.razonSocialProveedor,
        tipoRetencionId: data.tipoRetencionId,
        tasaRetencion: data.tasaRetencion,
        monedaId: data.monedaId,
        importeTotal: data.importeTotal,
        importeRetenido: data.importeRetenido,
        importeNeto: data.importeNeto,
        cuentaPorPagarId: data.cuentaPorPagarId,
        movimientoCajaId: data.movimientoCajaId,
        nubefactEnviado: data.nubefactEnviado,
        nubefactAceptado: data.nubefactAceptado,
        nubefactEnlacePDF: data.nubefactEnlacePDF,
        nubefactEnlaceXML: data.nubefactEnlaceXML,
        nubefactRespuesta: data.nubefactRespuesta,
        estadoId: data.estadoId,
        periodoDeclaracion: data.periodoDeclaracion,
        declarado: data.declarado,
        fechaDeclaracion: data.fechaDeclaracion ? new Date(data.fechaDeclaracion) : undefined,
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
    const existente = await prisma.retencion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Retención no encontrada');

    await prisma.retencion.delete({ where: { id } });
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
    return await prisma.retencion.findMany({
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
    return await prisma.retencion.findMany({
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
  listarPorProveedor,
};