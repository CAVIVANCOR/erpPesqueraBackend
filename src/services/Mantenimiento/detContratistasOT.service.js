import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para DetContratistasOT
 * Documentado en español.
 */

async function validarForaneas(data) {
  if (data.otMantenimientoId) {
    const ot = await prisma.oTMantenimiento.findUnique({
      where: { id: data.otMantenimientoId },
    });
    if (!ot)
      throw new ValidationError("La orden de trabajo referenciada no existe.");
  }

  if (data.contratistaId) {
    const contratista = await prisma.entidadComercial.findUnique({
      where: { id: data.contratistaId },
    });
    if (!contratista)
      throw new ValidationError("El contratista referenciado no existe.");
  }

  if (data.productoServicioId) {
    const producto = await prisma.producto.findUnique({
      where: { id: data.productoServicioId },
    });
    if (!producto)
      throw new ValidationError("El producto/servicio referenciado no existe.");
  }

  if (data.activoId) {
    const activo = await prisma.activo.findUnique({
      where: { id: data.activoId },
    });
    if (!activo) throw new ValidationError("El activo referenciado no existe.");
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) throw new ValidationError("La moneda referenciada no existe.");
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: data.estadoId },
    });
    if (!estado) throw new ValidationError("El estado referenciado no existe.");
  }

  if (data.preFacturaId) {
    const preFactura = await prisma.preFactura.findUnique({
      where: { id: data.preFacturaId },
    });
    if (!preFactura)
      throw new ValidationError("La pre-factura referenciada no existe.");
  }
}

const listar = async (otMantenimientoId) => {
  try {
    const where = {};
    if (otMantenimientoId) {
      where.otMantenimientoId = BigInt(otMantenimientoId);
    }

    return await prisma.detContratistasOT.findMany({
      where,
      include: {
        otMantenimiento: {
          select: {
            id: true,
            numeroCompleto: true,
            descripcionProblema: true,
          },
        },
        contratista: {
          select: {
            id: true,
            razonSocial: true,
            numeroDocumento: true,
            nombreComercial: true,
          },
        },
        productoServicio: {
          select: {
            id: true,
            codigo: true,
            descripcionBase: true,
            descripcionArmada: true,
          },
        },
        activo: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },
        moneda: {
          select: {
            id: true,
            codigoSunat: true,
            simbolo: true,
          },
        },
        estado: {
          select: {
            id: true,
            descripcion: true,
            severityColor: true,
          },
        },
        preFactura: {
          select: {
            id: true,
            codigo: true,
            numeroDocumento: true,
          },
        },
        repuestos: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                descripcionBase: true,
                descripcionArmada: true,
              },
            },
            moneda: {
              select: {
                id: true,
                simbolo: true,
              },
            },
            ordenCompra: {
              select: {
                id: true,
                numeroDocumento: true,
              },
            },
          },
          orderBy: {
            numeroLinea: "asc",
          },
        },
      },
      orderBy: {
        numeroLinea: "asc",
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detContratistasOT.findUnique({
      where: { id },
      include: {
        otMantenimiento: true,
        contratista: true,
        productoServicio: true,
        activo: true,
        moneda: true,
        estado: true,
        preFactura: true,
        repuestos: {
          include: {
            producto: true,
            moneda: true,
            ordenCompra: true,
          },
          orderBy: {
            numeroLinea: "asc",
          },
        },
      },
    });

    if (!detalle) throw new NotFoundError("DetContratistasOT no encontrado");
    return detalle;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (
      !data.otMantenimientoId ||
      !data.numeroLinea ||
      !data.contratistaId ||
      !data.productoServicioId ||
      !data.servicioDescripcion ||
      data.montoPactado === undefined ||
      data.saldo === undefined ||
      !data.monedaId ||
      !data.estadoId
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios: otMantenimientoId, numeroLinea, contratistaId, productoServicioId, servicioDescripcion, montoPactado, saldo, monedaId, estadoId.",
      );
    }

    await validarForaneas(data);

    // Calcular saldo si no viene
    const montoPactado = Number(data.montoPactado);
    const montoPagado = Number(data.montoPagado || 0);
    const saldo = montoPactado - montoPagado;

    const nuevo = await prisma.detContratistasOT.create({
      data: {
        otMantenimientoId: BigInt(data.otMantenimientoId),
        numeroLinea: Number(data.numeroLinea),
        contratistaId: BigInt(data.contratistaId),
        productoServicioId: BigInt(data.productoServicioId),
        activoId: data.activoId ? BigInt(data.activoId) : null,
        servicioDescripcion: data.servicioDescripcion,
        montoPactado: montoPactado,
        montoPagado: montoPagado,
        saldo: saldo,
        monedaId: BigInt(data.monedaId),
        estadoId: BigInt(data.estadoId),
        preFacturaId: data.preFacturaId ? BigInt(data.preFacturaId) : null,
        urlDocumentoContratista: data.urlDocumentoContratista || null,
        urlFotosProductos: data.urlFotosProductos || null,
        urlFotosAntes: data.urlFotosAntes || null,
        urlFotosDespues: data.urlFotosDespues || null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        creadoPor: data.creadoPor ? BigInt(data.creadoPor) : null,
        actualizadoPor: data.actualizadoPor
          ? BigInt(data.actualizadoPor)
          : null,
      },
      include: {
        contratista: true,
        productoServicio: true,
        activo: true,
        moneda: true,
        estado: true,
        preFactura: true,
      },
    });

    return nuevo;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detContratistasOT.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("DetContratistasOT no encontrado");

    await validarForaneas(data);

    // Recalcular saldo si se modifican los montos
    const dataActualizada = { ...data };
    if (data.montoPactado !== undefined || data.montoPagado !== undefined) {
      const montoPactado = Number(
        data.montoPactado !== undefined
          ? data.montoPactado
          : existente.montoPactado,
      );
      const montoPagado = Number(
        data.montoPagado !== undefined
          ? data.montoPagado
          : existente.montoPagado,
      );
      dataActualizada.saldo = montoPactado - montoPagado;
    }

    // Convertir BigInt
    if (dataActualizada.otMantenimientoId)
      dataActualizada.otMantenimientoId = BigInt(
        dataActualizada.otMantenimientoId,
      );
    if (dataActualizada.contratistaId)
      dataActualizada.contratistaId = BigInt(dataActualizada.contratistaId);
    if (dataActualizada.productoServicioId)
      dataActualizada.productoServicioId = BigInt(
        dataActualizada.productoServicioId,
      );
    if (dataActualizada.activoId)
      dataActualizada.activoId = BigInt(dataActualizada.activoId);
    if (dataActualizada.monedaId)
      dataActualizada.monedaId = BigInt(dataActualizada.monedaId);
    if (dataActualizada.estadoId)
      dataActualizada.estadoId = BigInt(dataActualizada.estadoId);
    if (dataActualizada.preFacturaId)
      dataActualizada.preFacturaId = BigInt(dataActualizada.preFacturaId);
    if (dataActualizada.creadoPor)
      dataActualizada.creadoPor = BigInt(dataActualizada.creadoPor);
    if (dataActualizada.actualizadoPor)
      dataActualizada.actualizadoPor = BigInt(dataActualizada.actualizadoPor);

    dataActualizada.actualizadoEn = new Date();

    return await prisma.detContratistasOT.update({
      where: { id },
      data: dataActualizada,
      include: {
        contratista: true,
        productoServicio: true,
        activo: true,
        moneda: true,
        estado: true,
        preFactura: true,
        repuestos: {
          include: {
            producto: true,
            moneda: true,
          },
        },
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detContratistasOT.findUnique({
      where: { id },
      include: { repuestos: true },
    });
    if (!existente) throw new NotFoundError("DetContratistasOT no encontrado");

    // Los repuestos se eliminan automáticamente por onDelete: Cascade
    await prisma.detContratistasOT.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
