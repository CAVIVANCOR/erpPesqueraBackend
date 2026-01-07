import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ComprobanteElectronico con DetalleComprobanteElectronico (maestro-detalle)
 * Gestiona facturas, boletas, notas de crédito/débito electrónicas.
 * Documentado en español.
 */

/**
 * Valida los datos de un comprobante electrónico.
 */
async function validarComprobanteElectronico(data) {
  // Validar empresaId
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) {
      throw new ValidationError('La empresa referenciada no existe.');
    }
  }

  // Validar clienteId
  if (data.clienteId) {
    const cliente = await prisma.entidadComercial.findUnique({ where: { id: data.clienteId } });
    if (!cliente) {
      throw new ValidationError('El cliente referenciado no existe.');
    }
  }

  // Validar monedaId
  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) {
      throw new ValidationError('La moneda referenciada no existe.');
    }
  }

  // Validar estadoId
  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) {
      throw new ValidationError('El estado referenciado no existe.');
    }
  }

  // Validar tipoComprobante
  if (data.tipoComprobante && !['FACTURA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO'].includes(data.tipoComprobante)) {
    throw new ValidationError('El tipo de comprobante debe ser: FACTURA, BOLETA, NOTA_CREDITO o NOTA_DEBITO.');
  }

  // Validar serie y número
  if (data.serie && !/^[A-Z0-9]{4}$/.test(data.serie)) {
    throw new ValidationError('La serie debe tener 4 caracteres alfanuméricos.');
  }

  if (data.numero !== undefined && data.numero < 1) {
    throw new ValidationError('El número del comprobante debe ser mayor a 0.');
  }

  // Validar unicidad de serie-número por empresa
  if (data.empresaId && data.serie && data.numero !== undefined) {
    const existente = await prisma.comprobanteElectronico.findFirst({
      where: {
        empresaId: data.empresaId,
        serie: data.serie,
        numero: data.numero,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`Ya existe un comprobante con la serie ${data.serie} y número ${data.numero}.`);
    }
  }

  // Validar comprobanteReferenciaId si es nota de crédito/débito
  if ((data.tipoComprobante === 'NOTA_CREDITO' || data.tipoComprobante === 'NOTA_DEBITO') && !data.comprobanteReferenciaId) {
    throw new ValidationError('Las notas de crédito/débito deben referenciar un comprobante.');
  }
}

/**
 * Valida los detalles de un comprobante electrónico.
 */
async function validarDetallesComprobante(detalles) {
  if (!detalles || detalles.length === 0) {
    throw new ValidationError('El comprobante debe tener al menos un detalle.');
  }

  for (const detalle of detalles) {
    // Validar productoId
    if (detalle.productoId) {
      const producto = await prisma.producto.findUnique({ where: { id: detalle.productoId } });
      if (!producto) {
        throw new ValidationError(`El producto con ID ${detalle.productoId} no existe.`);
      }
    }

    // Validar tipoAfectacionIGVId
    if (detalle.tipoAfectacionIGVId) {
      const tipoAfectacion = await prisma.tipoAfectacionIGV.findUnique({ 
        where: { id: detalle.tipoAfectacionIGVId } 
      });
      if (!tipoAfectacion) {
        throw new ValidationError(`El tipo de afectación IGV con ID ${detalle.tipoAfectacionIGVId} no existe.`);
      }
    }

    // Validar cantidades y precios
    if (detalle.cantidad !== undefined && detalle.cantidad <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0.');
    }

    if (detalle.precioUnitario !== undefined && detalle.precioUnitario < 0) {
      throw new ValidationError('El precio unitario no puede ser negativo.');
    }
  }
}

/**
 * Lista todos los comprobantes electrónicos ordenados por fecha descendente.
 */
const listar = async () => {
  try {
    return await prisma.comprobanteElectronico.findMany({
      include: {
        empresa: true,
        entidadComercial: true,
        moneda: true,
        tipoComprobante: true,
        tipoDocumentoCliente: true,
        estadoOSE: true,
        estadoSUNAT: true,
        formaPago: true,
        preFactura: true,
        comprobanteModifica: true,
        detalles: {
          orderBy: { id: 'asc' }
        }
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

/**
 * Obtiene un comprobante electrónico por ID con todos sus detalles.
 */
const obtenerPorId = async (id) => {
  try {
    const comprobante = await prisma.comprobanteElectronico.findUnique({
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        moneda: true,
        estado: true,
        comprobanteReferencia: true,
        detalles: {
          include: {
            producto: true,
            tipoAfectacionIGV: true
          },
          orderBy: { id: 'asc' }
        },
        notasCredito: true,
        notasDebito: true
      }
    });
    if (!comprobante) throw new NotFoundError('Comprobante electrónico no encontrado');
    return comprobante;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo comprobante electrónico con sus detalles (transacción atómica).
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.empresaId || !data.clienteId || !data.tipoComprobante || !data.serie || data.numero === undefined || !data.fechaEmision || !data.monedaId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios: empresaId, clienteId, tipoComprobante, serie, numero, fechaEmision, monedaId, estadoId.');
    }

    if (!data.detalles || data.detalles.length === 0) {
      throw new ValidationError('El comprobante debe tener al menos un detalle.');
    }

    await validarComprobanteElectronico(data);
    await validarDetallesComprobante(data.detalles);

    // Crear comprobante con detalles en transacción
    return await prisma.$transaction(async (tx) => {
      // Crear comprobante maestro
      const comprobante = await tx.comprobanteElectronico.create({
        data: {
          empresaId: data.empresaId,
          clienteId: data.clienteId,
          tipoComprobante: data.tipoComprobante,
          serie: data.serie,
          numero: data.numero,
          fechaEmision: new Date(data.fechaEmision),
          fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
          monedaId: data.monedaId,
          tipoCambio: data.tipoCambio || 1,
          estadoId: data.estadoId,
          comprobanteReferenciaId: data.comprobanteReferenciaId,
          motivoNota: data.motivoNota,
          observaciones: data.observaciones,
          totalGravado: data.totalGravado || 0,
          totalExonerado: data.totalExonerado || 0,
          totalInafecto: data.totalInafecto || 0,
          totalIGV: data.totalIGV || 0,
          totalDescuentos: data.totalDescuentos || 0,
          totalComprobante: data.totalComprobante || 0,
          hashCPE: data.hashCPE,
          codigoQR: data.codigoQR,
          xmlGenerado: data.xmlGenerado || false,
          xmlEnviado: data.xmlEnviado || false,
          cdrRecibido: data.cdrRecibido || false,
          fechaActualizacion: new Date()
        }
      });

      // Crear detalles
      await Promise.all(
        data.detalles.map((detalle) =>
          tx.detalleComprobanteElectronico.create({
            data: {
              comprobanteElectronicoId: comprobante.id,
              productoId: detalle.productoId,
              descripcion: detalle.descripcion,
              cantidad: detalle.cantidad,
              unidadMedida: detalle.unidadMedida,
              precioUnitario: detalle.precioUnitario,
              tipoAfectacionIGVId: detalle.tipoAfectacionIGVId,
              porcentajeIGV: detalle.porcentajeIGV || 0,
              montoIGV: detalle.montoIGV || 0,
              descuento: detalle.descuento || 0,
              valorVenta: detalle.valorVenta || 0,
              precioVenta: detalle.precioVenta || 0,
              fechaActualizacion: new Date()
            }
          })
        )
      );

      // Retornar comprobante con detalles
      return await tx.comprobanteElectronico.findUnique({
        where: { id: comprobante.id },
        include: {
          empresa: true,
          cliente: true,
          moneda: true,
          estado: true,
          detalles: {
            include: {
              producto: true,
              tipoAfectacionIGV: true
            },
            orderBy: { id: 'asc' }
          }
        }
      });
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
 * Actualiza un comprobante electrónico existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.comprobanteElectronico.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Comprobante electrónico no encontrado');

    // Validar que no esté enviado a SUNAT
    if (existente.xmlEnviado) {
      throw new ConflictError('No se puede modificar un comprobante que ya fue enviado a SUNAT.');
    }

    await validarComprobanteElectronico({ ...data, id });

    if (data.detalles && data.detalles.length > 0) {
      await validarDetallesComprobante(data.detalles);
    }

    // Actualizar comprobante con detalles en transacción
    return await prisma.$transaction(async (tx) => {
      // Actualizar comprobante maestro
      const comprobante = await tx.comprobanteElectronico.update({
        where: { id },
        data: {
          fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : undefined,
          fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : undefined,
          tipoCambio: data.tipoCambio,
          estadoId: data.estadoId,
          observaciones: data.observaciones,
          totalGravado: data.totalGravado,
          totalExonerado: data.totalExonerado,
          totalInafecto: data.totalInafecto,
          totalIGV: data.totalIGV,
          totalDescuentos: data.totalDescuentos,
          totalComprobante: data.totalComprobante,
          fechaActualizacion: new Date()
        }
      });

      // Si hay detalles, eliminar los existentes y crear los nuevos
      if (data.detalles && data.detalles.length > 0) {
        await tx.detalleComprobanteElectronico.deleteMany({
          where: { comprobanteElectronicoId: id }
        });

        await Promise.all(
          data.detalles.map((detalle) =>
            tx.detalleComprobanteElectronico.create({
              data: {
                comprobanteElectronicoId: id,
                productoId: detalle.productoId,
                descripcion: detalle.descripcion,
                cantidad: detalle.cantidad,
                unidadMedida: detalle.unidadMedida,
                precioUnitario: detalle.precioUnitario,
                tipoAfectacionIGVId: detalle.tipoAfectacionIGVId,
                porcentajeIGV: detalle.porcentajeIGV || 0,
                montoIGV: detalle.montoIGV || 0,
                descuento: detalle.descuento || 0,
                valorVenta: detalle.valorVenta || 0,
                precioVenta: detalle.precioVenta || 0,
                fechaActualizacion: new Date()
              }
            })
          )
        );
      }

      // Retornar comprobante actualizado con detalles
      return await tx.comprobanteElectronico.findUnique({
        where: { id },
        include: {
          empresa: true,
          cliente: true,
          moneda: true,
          estado: true,
          detalles: {
            include: {
              producto: true,
              tipoAfectacionIGV: true
            },
            orderBy: { id: 'asc' }
          }
        }
      });
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
 * Elimina un comprobante electrónico por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.comprobanteElectronico.findUnique({
      where: { id },
      include: { detalles: true }
    });

    if (!existente) throw new NotFoundError('Comprobante electrónico no encontrado');

    // Validar que no esté enviado a SUNAT
    if (existente.xmlEnviado) {
      throw new ConflictError('No se puede eliminar un comprobante que ya fue enviado a SUNAT.');
    }

    // Eliminar en transacción
    await prisma.$transaction(async (tx) => {
      await tx.detalleComprobanteElectronico.deleteMany({
        where: { comprobanteElectronicoId: id }
      });
      await tx.comprobanteElectronico.delete({ where: { id } });
    });

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
 * Lista comprobantes por empresa.
 */
const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.comprobanteElectronico.findMany({
      where: { empresaId },
      include: {
        cliente: true,
        moneda: true,
        estado: true,
        detalles: {
          include: {
            producto: true,
            tipoAfectacionIGV: true
          }
        }
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

/**
 * Lista comprobantes por cliente.
 */
const listarPorCliente = async (clienteId) => {
  try {
    return await prisma.comprobanteElectronico.findMany({
      where: { clienteId },
      include: {
        empresa: true,
        moneda: true,
        estado: true,
        detalles: true
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

/**
 * Marca un comprobante como enviado a SUNAT.
 */
const marcarEnviado = async (id, hashCPE, codigoQR) => {
  try {
    const comprobante = await prisma.comprobanteElectronico.findUnique({ where: { id } });
    if (!comprobante) throw new NotFoundError('Comprobante electrónico no encontrado');

    return await prisma.comprobanteElectronico.update({
      where: { id },
      data: {
        xmlEnviado: true,
        fechaEnvio: new Date(),
        hashCPE,
        codigoQR,
        fechaActualizacion: new Date()
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Marca un comprobante con CDR recibido.
 */
const marcarCDRRecibido = async (id, respuestaSunat) => {
  try {
    const comprobante = await prisma.comprobanteElectronico.findUnique({ where: { id } });
    if (!comprobante) throw new NotFoundError('Comprobante electrónico no encontrado');

    return await prisma.comprobanteElectronico.update({
      where: { id },
      data: {
        cdrRecibido: true,
        fechaCDR: new Date(),
        respuestaSunat,
        fechaActualizacion: new Date()
      }
    });
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
  listarPorCliente,
  marcarEnviado,
  marcarCDRRecibido
};
