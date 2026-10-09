import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";
import documentoCompraPresupuestoService from "./documentoCompraPresupuesto.service.js";
import otMantenimientoService from "./otMantenimiento.service.js";

/**
 * Servicio CRUD para DetContratistasOT
 * Documentado en español.
 */

// Obtiene el TC del presupuesto: si el presupuesto está en la moneda de la OT no aplica (null);
// si difieren, usa el TC enviado o consulta SUNAT con la fechaPresupuesto.
async function resolverTipoCambio(data, ot) {
  const mismaMoneda = ot && Number(data.monedaId) === Number(ot.monedaId);
  if (mismaMoneda) return null;
  return await validarTipoCambio(data.tipoCambio, data.fechaPresupuesto);
}

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
        activo: true,
        moneda: true,
        estado: true,
        repuestos: {
          include: {
            producto: true,
            moneda: true,
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
      !data.servicioDescripcion ||
      !data.monedaId ||
      !data.estadoId
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios: otMantenimientoId, numeroLinea, contratistaId, servicioDescripcion, monedaId, estadoId.",
      );
    }

    await validarForaneas(data);

    const ot = await prisma.oTMantenimiento.findUnique({
      where: { id: BigInt(data.otMantenimientoId) },
    });
    const fechaPresupuesto = data.fechaPresupuesto
      ? new Date(data.fechaPresupuesto)
      : new Date();
    const tipoCambio = await resolverTipoCambio(
      { ...data, fechaPresupuesto },
      ot,
    );

    // La cabecera nace sin ítems (monto 0). montoPactado/saldo se recalculan desde los ítems.
    const nuevo = await prisma.detContratistasOT.create({
      data: {
        otMantenimientoId: BigInt(data.otMantenimientoId),
        numeroLinea: Number(data.numeroLinea),
        contratistaId: BigInt(data.contratistaId),
        activoId: data.activoId ? BigInt(data.activoId) : null,
        servicioDescripcion: data.servicioDescripcion,
        fechaPresupuesto,
        tipoCambio,
        montoPactado: Number(data.montoPactado || 0),
        montoFacturado: 0,
        montoPagado: Number(data.montoPagado || 0),
        saldo: Number(data.montoPactado || 0) - Number(data.montoPagado || 0),
        monedaId: BigInt(data.monedaId),
        estadoId: BigInt(data.estadoId),
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
        activo: true,
        moneda: true,
        estado: true,
      },
    });

    try {
      await documentoCompraPresupuestoService.recalcularMontosOT(nuevo.otMantenimientoId);
      await otMantenimientoService.actualizarEstadoOT(nuevo.otMantenimientoId);
    } catch (e) {
      console.error("No se pudieron recalcular los montos/estado de la OT:", e.message);
    }
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

    // fechaPresupuesto / tipoCambio: si cambia la fecha y no se envía TC, se consulta SUNAT.
    if (data.fechaPresupuesto !== undefined) {
      dataActualizada.fechaPresupuesto = data.fechaPresupuesto
        ? new Date(data.fechaPresupuesto)
        : null;
    }
    if (
      data.fechaPresupuesto !== undefined ||
      data.tipoCambio !== undefined ||
      data.monedaId !== undefined
    ) {
      const ot = await prisma.oTMantenimiento.findUnique({
        where: { id: existente.otMantenimientoId },
      });
      const datosTC = {
        monedaId: data.monedaId ?? existente.monedaId,
        fechaPresupuesto:
          dataActualizada.fechaPresupuesto ?? existente.fechaPresupuesto,
        tipoCambio:
          data.tipoCambio !== undefined ? data.tipoCambio : existente.tipoCambio,
      };
      dataActualizada.tipoCambio = await resolverTipoCambio(datosTC, ot);
    }

    // Convertir BigInt
    if (dataActualizada.otMantenimientoId)
      dataActualizada.otMantenimientoId = BigInt(
        dataActualizada.otMantenimientoId,
      );
    if (dataActualizada.contratistaId)
      dataActualizada.contratistaId = BigInt(dataActualizada.contratistaId);
    if (dataActualizada.activoId)
      dataActualizada.activoId = BigInt(dataActualizada.activoId);
    if (dataActualizada.monedaId)
      dataActualizada.monedaId = BigInt(dataActualizada.monedaId);
    if (dataActualizada.estadoId)
      dataActualizada.estadoId = BigInt(dataActualizada.estadoId);
    if (dataActualizada.creadoPor)
      dataActualizada.creadoPor = BigInt(dataActualizada.creadoPor);
    if (dataActualizada.actualizadoPor)
      dataActualizada.actualizadoPor = BigInt(dataActualizada.actualizadoPor);

    dataActualizada.actualizadoEn = new Date();

    const actualizado = await prisma.detContratistasOT.update({
      where: { id },
      data: dataActualizada,
      include: {
        contratista: true,
        activo: true,
        moneda: true,
        estado: true,
        repuestos: {
          include: {
            producto: true,
            moneda: true,
          },
        },
      },
    });

    // Si cambia fecha/TC/moneda del presupuesto, los totales de la OT cambian
    try {
      await documentoCompraPresupuestoService.recalcularMontosOT(actualizado.otMantenimientoId);
      await otMantenimientoService.actualizarEstadoOT(actualizado.otMantenimientoId);
    } catch (e) {
      console.error("No se pudieron recalcular los montos/estado de la OT:", e.message);
    }
    return actualizado;
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

    // No se puede eliminar si ya tiene documentos de compra generados
    const documentosGenerados = await prisma.ordenCompra.findFirst({
      where: {
        submoduloOrigenId: 158,
        procesoOrigenId: id,
        estadoId: { not: 40 },
      },
    });
    if (documentosGenerados) {
      throw new ValidationError(
        "No se puede eliminar el presupuesto porque ya tiene documentos de compra generados."
      );
    }

    // Los repuestos se eliminan automáticamente por onDelete: Cascade
    await prisma.detContratistasOT.delete({ where: { id } });
    try {
      await documentoCompraPresupuestoService.recalcularMontosOT(existente.otMantenimientoId);
      await otMantenimientoService.actualizarEstadoOT(existente.otMantenimientoId);
    } catch (e) {
      console.error("No se pudieron recalcular los montos/estado de la OT:", e.message);
    }
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
