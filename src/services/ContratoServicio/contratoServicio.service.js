import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";

/**
 * Servicio CRUD para ContratoServicio
 * Gestiona contratos de servicio de alquiler de espacios y almacenamiento
 * Incluye validaciones de relaciones y campos de auditoría.
 * Documentado en español.
 */

/**
 * Genera código único para el contrato
 * Formato: CONT-YYYY-NNNNNN
 * Ejemplo: CONT-2024-000001
 */
async function generarCodigoContrato(empresaId) {
  const año = new Date().getFullYear();

  // Buscar el último contrato del año
  const ultimoContrato = await prisma.contratoServicio.findFirst({
    where: {
      empresaId,
      numeroCompleto: {
        startsWith: `CONT-${año}-`,
      },
    },
    orderBy: { id: "desc" },
  });

  let correlativo = 1;
  if (ultimoContrato) {
    // Extraer el correlativo del código: CONT-2024-000001
    const partes = ultimoContrato.numeroCompleto.split("-");
    correlativo = parseInt(partes[2]) + 1;
  }

  return `CONT-${año}-${String(correlativo).padStart(6, "0")}`;
}

/**
 * Lista todos los contratos con sus relaciones
 */
const listar = async () => {
  try {
    return await prisma.contratoServicio.findMany({
      include: {
        empresa: true,
        sede: true,
        activo: true,
        almacen: true,
        cliente: true,
        contactoCliente: true,
        responsable: true,
        aprobador: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        estadoContrato: true,
        detallesServicios: {
          include: {
            productoServicio: true,
          },
        },
      },
      orderBy: { fechaCelebracion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene un contrato por ID con todas sus relaciones
 */
const obtenerPorId = async (id) => {
  try {
    const contrato = await prisma.contratoServicio.findUnique({
      where: { id },
      include: {
        empresa: true,
        sede: true,
        activo: true,
        almacen: true,
        cliente: true,
        contactoCliente: true,
        responsable: true,
        aprobador: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        estadoContrato: true,
        detallesServicios: {
          include: {
            productoServicio: {
              include: {
                familia: true,
                unidadMedida: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
        prefacturas: {
          include: {
            cliente: true,
            moneda: true,
          },
          orderBy: { fechaDocumento: "desc" },
        },
      },
    });
    if (!contrato) throw new NotFoundError("Contrato no encontrado");
    return contrato;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene contratos por cliente
 */
const obtenerPorCliente = async (clienteId) => {
  try {
    return await prisma.contratoServicio.findMany({
      where: { clienteId },
      include: {
        empresa: true,
        sede: true,
        almacen: true,
        moneda: true,
        estadoContrato: true,
      },
      orderBy: { fechaCelebracion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene contratos por empresa
 */
const obtenerPorEmpresa = async (empresaId) => {
  try {
    return await prisma.contratoServicio.findMany({
      where: { empresaId },
      include: {
        cliente: true,
        sede: true,
        almacen: true,
        moneda: true,
        estadoContrato: true,
      },
      orderBy: { fechaCelebracion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea un nuevo contrato
 */
const crear = async (data) => {
  try {
    // Normalizar IDs a BigInt
    const empresaId = data.empresaId ? BigInt(data.empresaId) : undefined;
    const sedeId = data.sedeId ? BigInt(data.sedeId) : undefined;
    const activoId = data.activoId ? BigInt(data.activoId) : undefined;
    const almacenId = data.almacenId ? BigInt(data.almacenId) : undefined;
    const clienteId = data.clienteId ? BigInt(data.clienteId) : undefined;
    const contactoClienteId = data.contactoClienteId
      ? BigInt(data.contactoClienteId)
      : undefined;
    const responsableId = data.responsableId
      ? BigInt(data.responsableId)
      : undefined;
    const aprobadorId = data.aprobadorId ? BigInt(data.aprobadorId) : undefined;
    const tipoDocumentoId = data.tipoDocumentoId
      ? BigInt(data.tipoDocumentoId)
      : undefined;
    const serieDocId = data.serieDocId ? BigInt(data.serieDocId) : undefined;
    const monedaId = data.monedaId ? BigInt(data.monedaId) : undefined;
    const estadoContratoId = data.estadoContratoId
      ? BigInt(data.estadoContratoId)
      : undefined;
    const creadoPor = data.creadoPor ? BigInt(data.creadoPor) : undefined;
    const actualizadoPor = data.actualizadoPor
      ? BigInt(data.actualizadoPor)
      : undefined;
    const unidadNegocioId = data.unidadNegocioId
      ? BigInt(data.unidadNegocioId)
      : undefined;

    // Validar campos obligatorios
    if (
      !empresaId ||
      !sedeId ||
      !almacenId ||
      !clienteId ||
      !responsableId ||
      !tipoDocumentoId ||
      !serieDocId ||
      !monedaId ||
      !estadoContratoId
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios: empresaId, sedeId, almacenId, clienteId, responsableId, tipoDocumentoId, serieDocId, monedaId, estadoContratoId",
      );
    }

    // ✅ Validar y obtener tipo de cambio si es necesario
    const tipoCambioFinal = await validarTipoCambio(
      data.tipoCambio,
      data.fechaCelebracion || new Date(),
    );

    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Validar existencia de empresa
      const empresa = await tx.empresa.findUnique({ where: { id: empresaId } });
      if (!empresa) throw new ValidationError("Empresa no existente.");

      // 2. Validar existencia de cliente
      const cliente = await tx.entidadComercial.findUnique({
        where: { id: clienteId },
      });
      if (!cliente) throw new ValidationError("Cliente no existente.");

      // 3. Validar existencia de responsable
      const responsable = await tx.personal.findUnique({
        where: { id: responsableId },
      });
      if (!responsable) throw new ValidationError("Responsable no existente.");

      // 4. Validar aprobador si se proporciona
      if (aprobadorId) {
        const aprobador = await tx.personal.findUnique({
          where: { id: aprobadorId },
        });
        if (!aprobador) throw new ValidationError("Aprobador no existente.");
      }

      // 5. Obtener la serie seleccionada
      const serie = await tx.serieDoc.findUnique({
        where: { id: serieDocId },
      });

      if (!serie) {
        throw new ValidationError("Serie de documento no encontrada.");
      }

      // 6. Calcular nuevo correlativo
      const nuevoCorrelativo = Number(serie.correlativo) + 1;

      // 7. Generar números con formato
      const numSerie = String(serie.serie).padStart(
        serie.numCerosIzqSerie,
        "0",
      );
      const numCorre = String(nuevoCorrelativo).padStart(
        serie.numCerosIzqCorre,
        "0",
      );
      const numeroCompleto = `${numSerie}-${numCorre}`;

      // 8. Actualizar el correlativo en SerieDoc
      await tx.serieDoc.update({
        where: { id: serieDocId },
        data: { correlativo: BigInt(nuevoCorrelativo) },
      });

      // 9. Calcular fechaFinContrato si no viene (1 año después de fechaInicioContrato)
      let fechaFinContrato = data.fechaFinContrato;
      if (!fechaFinContrato && data.fechaInicioContrato) {
        const fechaInicio = new Date(data.fechaInicioContrato);
        fechaFinContrato = new Date(fechaInicio);
        fechaFinContrato.setFullYear(fechaFinContrato.getFullYear() + 1);
      }

      // 10. Crear objeto limpio solo con campos del modelo (patrón estándar)
      const datosLimpios = {
        empresaId,
        sedeId,
        activoId,
        almacenId,
        clienteId,
        contactoClienteId,
        responsableId,
        aprobadorId,
        tipoDocumentoId,
        serieDocId,
        numeroSerie: numSerie,
        numeroCorrelativo: nuevoCorrelativo,
        numeroCompleto,
        fechaCelebracion: data.fechaCelebracion,
        fechaInicioContrato: data.fechaInicioContrato,
        fechaFinContrato,
        fechaInicioCobro: data.fechaInicioCobro,
        periodicidadCobro:
          data.periodicidadCobro !== undefined ? data.periodicidadCobro : 1,
        textoEsenciaContrato: data.textoEsenciaContrato,
        urlContratoPdf: data.urlContratoPdf,
        incluyeLuz: data.incluyeLuz !== undefined ? data.incluyeLuz : false,
        porcentajeRecargoLuz: data.porcentajeRecargoLuz,
        costoPorKilovatio: data.costoPorKilovatio,
        monedaId,
        tipoCambio: tipoCambioFinal, // ✅ Usar valor validado
        estadoContratoId,
        creadoPor,
        creadoEn: data.creadoEn || new Date(),
        actualizadoPor,
        actualizadoEn: data.actualizadoEn || new Date(),
        unidadNegocioId,
      };

      // 11. Crear el contrato con los números generados (patrón estándar)
      const contratoCreado = await tx.contratoServicio.create({
        data: datosLimpios,
        include: {
          empresa: true,
          sede: true,
          activo: true,
          almacen: true,
          cliente: true,
          contactoCliente: true,
          responsable: true,
          aprobador: true,
          tipoDocumento: true,
          serieDoc: true,
          moneda: true,
          estadoContrato: true,
        },
      });

      return contratoCreado;
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza un contrato existente
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.contratoServicio.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Contrato no encontrado");

    // Validar referencias si cambian
    if (data.empresaId && data.empresaId !== existente.empresaId) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: data.empresaId },
      });
      if (!empresa) throw new ValidationError("Empresa no existente.");
    }

    if (data.clienteId && data.clienteId !== existente.clienteId) {
      const cliente = await prisma.entidadComercial.findUnique({
        where: { id: data.clienteId },
      });
      if (!cliente) throw new ValidationError("Cliente no existente.");
    }

    if (data.responsableId && data.responsableId !== existente.responsableId) {
      const responsable = await prisma.personal.findUnique({
        where: { id: data.responsableId },
      });
      if (!responsable) throw new ValidationError("Responsable no existente.");
    }

    if (data.aprobadorId && data.aprobadorId !== existente.aprobadorId) {
      const aprobador = await prisma.personal.findUnique({
        where: { id: data.aprobadorId },
      });
      if (!aprobador) throw new ValidationError("Aprobador no existente.");
    }

    // ✅ Validar y obtener tipo de cambio si es necesario
    if (data.hasOwnProperty("tipoCambio")) {
      data.tipoCambio = await validarTipoCambio(
        data.tipoCambio,
        data.fechaCelebracion || existente.fechaCelebracion,
      );
    }

    // Extraer y remover campos que no deben actualizarse
    const {
      detalles,
      empresaId,
      clienteId,
      tipoDocumentoId,
      serieDocId,
      numeroSerie,
      numeroCorrelativo,
      numeroCompleto,
      ...dataSinCamposInmutables
    } = data;

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...dataSinCamposInmutables,
      creadoEn: data.creadoEn || existente.creadoEn || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      actualizadoEn: data.actualizadoEn || new Date(),
    };

    return await prisma.contratoServicio.update({
      where: { id },
      data: datosConAuditoria,
      include: {
        empresa: true,
        sede: true,
        activo: true,
        almacen: true,
        cliente: true,
        contactoCliente: true,
        responsable: true,
        aprobador: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        estadoContrato: true,
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

/**
 * Elimina un contrato
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.contratoServicio.findUnique({
      where: { id },
      include: {
        detallesServicios: true,
        prefacturas: true,
      },
    });
    if (!existente) throw new NotFoundError("Contrato no encontrado");

    // Validar que no tenga dependencias
    if (existente.detallesServicios && existente.detallesServicios.length > 0) {
      throw new ConflictError(
        "No se puede eliminar porque tiene servicios asociados.",
      );
    }
    if (existente.prefacturas && existente.prefacturas.length > 0) {
      throw new ConflictError(
        "No se puede eliminar porque tiene prefacturas asociadas.",
      );
    }

    await prisma.contratoServicio.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene series de documentos filtradas
 * @param {string|number} empresaId - ID de la empresa (opcional)
 * @param {string|number} tipoDocumentoId - ID del tipo de documento (opcional)
 * @returns {Promise<Array>} Series de documentos que cumplen los filtros
 */
const obtenerSeriesDoc = async (empresaId, tipoDocumentoId) => {
  try {
    const where = {
      activo: true, // Solo series activas
    };

    if (empresaId) where.empresaId = BigInt(empresaId);
    if (tipoDocumentoId) where.tipoDocumentoId = BigInt(tipoDocumentoId);

    const series = await prisma.serieDoc.findMany({
      where,
      orderBy: {
        serie: "asc",
      },
    });

    return series;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene contratos vigentes por cliente
 */
const obtenerContratosVigentes = async (clienteId) => {
  try {
    const estadoVigente = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDe: 10, // CONTRATO_SERVICIO
        nombre: "VIGENTE",
      },
    });

    if (!estadoVigente) {
      throw new ValidationError(
        "No se encontró el estado VIGENTE para contratos",
      );
    }

    return await prisma.contratoServicio.findMany({
      where: {
        clienteId,
        estadoContratoId: estadoVigente.id,
        fechaInicioContrato: {
          lte: new Date(),
        },
        OR: [
          { fechaFinContrato: null },
          { fechaFinContrato: { gte: new Date() } },
        ],
      },
      include: {
        empresa: true,
        sede: true,
        almacen: true,
        moneda: true,
        detallesServicios: {
          include: {
            productoServicio: true,
          },
        },
      },
      orderBy: { fechaCelebracion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorCliente,
  obtenerPorEmpresa,
  crear,
  actualizar,
  eliminar,
  obtenerSeriesDoc,
  obtenerContratosVigentes,
};
