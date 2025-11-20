import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para DetMovsEntregaRendir
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const validaciones = [
    prisma.entregaARendir.findUnique({ where: { id: data.entregaARendirId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({
      where: { id: data.tipoMovimientoId },
    }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }),
  ];

  // Agregar validación de ModuloSistema si se proporciona moduloOrigenMovCajaId
  if (data.moduloOrigenMovCajaId) {
    validaciones.push(
      prisma.moduloSistema.findUnique({
        where: { id: data.moduloOrigenMovCajaId },
      })
    );
  }

  // Agregar validación de EntidadComercial si se proporciona entidadComercialId
  if (data.entidadComercialId) {
    validaciones.push(
      prisma.entidadComercial.findUnique({
        where: { id: data.entidadComercialId },
      })
    );
  }

  // Agregar validación de Moneda si se proporciona monedaId
  if (data.monedaId) {
    validaciones.push(
      prisma.moneda.findUnique({
        where: { id: data.monedaId },
      })
    );
  }

  const [
    entrega,
    responsable,
    tipoMovimiento,
    centroCosto,
    moduloSistema,
    entidadComercial,
    moneda,
  ] = await Promise.all(validaciones);

  if (!entrega) throw new ValidationError("El entregaARendirId no existe.");
  if (!responsable) throw new ValidationError("El responsableId no existe.");
  if (!tipoMovimiento)
    throw new ValidationError("El tipoMovimientoId no existe.");
  if (!centroCosto) throw new ValidationError("El centroCostoId no existe.");
  if (data.moduloOrigenMovCajaId && !moduloSistema)
    throw new ValidationError("El moduloOrigenMovCajaId no existe.");
  if (data.entidadComercialId && !entidadComercial)
    throw new ValidationError("El entidadComercialId no existe.");
  if (data.monedaId && !moneda)
    throw new ValidationError("El monedaId no existe.");
}

const listar = async () => {
  try {
    return await prisma.detMovsEntregaRendir.findMany({
      include: {
        tipoMovimiento: true,
        entidadComercial: true,
        moneda: true,
        producto: true,
        tipoDocumento: true,
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
    const mov = await prisma.detMovsEntregaRendir.findUnique({ where: { id } });
    if (!mov) throw new NotFoundError("DetMovsEntregaRendir no encontrado");
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = [
      "entregaARendirId",
      "responsableId",
      "fechaMovimiento",
      "tipoMovimientoId",
      "centroCostoId",
      "monto",
    ];
    for (const campo of obligatorios) {
      if (typeof data[campo] === "undefined" || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.detMovsEntregaRendir.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detMovsEntregaRendir.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("DetMovsEntregaRendir no encontrado");
    // Validar claves foráneas si cambian
    const claves = [
      "entregaARendirId",
      "responsableId",
      "tipoMovimientoId",
      "centroCostoId",
      "moduloOrigenMovCajaId",
      "entidadComercialId",
      "monedaId",
    ];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Preparar datos con SOLO campos escalares permitidos
    const datosActualizacion = {
      entregaARendirId: data.entregaARendirId,
      responsableId: data.responsableId,
      fechaMovimiento: data.fechaMovimiento,
      tipoMovimientoId: data.tipoMovimientoId,
      productoId: data.productoId,
      monto: data.monto,
      descripcion: data.descripcion,
      creadoEn: data.creadoEn,
      actualizadoEn: new Date(),
      centroCostoId: data.centroCostoId,
      urlComprobanteMovimiento: data.urlComprobanteMovimiento,
      validadoTesoreria: data.validadoTesoreria,
      fechaValidacionTesoreria: data.fechaValidacionTesoreria,
      operacionSinFactura: data.operacionSinFactura,
      fechaOperacionMovCaja: data.fechaOperacionMovCaja,
      operacionMovCajaId: data.operacionMovCajaId,
      moduloOrigenMovCajaId: data.moduloOrigenMovCajaId,
      entidadComercialId: data.entidadComercialId,
      monedaId: data.monedaId,
      urlComprobanteOperacionMovCaja: data.urlComprobanteOperacionMovCaja,
      tipoDocumentoId: data.tipoDocumentoId,
      numeroSerieComprobante: data.numeroSerieComprobante,
      numeroCorrelativoComprobante: data.numeroCorrelativoComprobante,
    };
    
    return await prisma.detMovsEntregaRendir.update({ where: { id }, data: datosActualizacion });
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
    const existente = await prisma.detMovsEntregaRendir.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("DetMovsEntregaRendir no encontrado");
    await prisma.detMovsEntregaRendir.delete({ where: { id } });
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