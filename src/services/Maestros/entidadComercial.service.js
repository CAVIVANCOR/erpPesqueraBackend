import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para EntidadComercial
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de numeroDocumento+empresaId y existencia de claves foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos de la entidad comercial
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarEntidadComercial(data, excluirId = null) {
  // Validar unicidad de numeroDocumento+empresaId
  if (data.numeroDocumento && data.empresaId) {
    const where = excluirId
      ? {
        numeroDocumento: data.numeroDocumento,
        empresaId: data.empresaId,
        id: { not: excluirId },
      }
      : {
        numeroDocumento: data.numeroDocumento,
        empresaId: data.empresaId,
      };
    const existe = await prisma.entidadComercial.findFirst({ where });
    if (existe)
      throw new ConflictError(
        "Ya existe una entidad comercial con ese número de documento para la empresa.",
      );
  }
  // Validar existencia de claves foráneas obligatorias
  const claves = [
    { campo: "empresaId", modelo: "empresa" },
    { campo: "tipoDocumentoId", modelo: "tiposDocIdentidad" },
    { campo: "tipoEntidadId", modelo: "tipoEntidad" },
    { campo: "formaPagoId", modelo: "formaPago" },
    { campo: "vendedorId", modelo: "personal" },
    { campo: "agenciaEnvioId", modelo: "entidadComercial" }, // autoconsulta para agencia
  ];
  for (const ref of claves) {
    if (data[ref.campo]) {
      const existe = await prisma[ref.modelo].findUnique({
        where: { id: data[ref.campo] },
      });
      if (!existe)
        throw new ValidationError(`Referencia foránea inválida: ${ref.campo}`);
    }
  }
  // Validar agrupacionEntidadId si se provee
  if (data.agrupacionEntidadId) {
    const agrup = await prisma.agrupacionEntidad.findUnique({
      where: { id: data.agrupacionEntidadId },
    });
    if (!agrup)
      throw new ValidationError("Agrupación de entidad no existente.");
  }
}

/**
 * Función auxiliar para merge inteligente de campos
 * Si ambos tienen valor y son diferentes, concatena con " + "
 */
function mergeInteligente(valorOrigen, valorDestino) {
  const esVacioOrigen =
    !valorOrigen ||
    (typeof valorOrigen === "string" && valorOrigen.trim() === "");
  const esVacioDestino =
    !valorDestino ||
    (typeof valorDestino === "string" && valorDestino.trim() === "");

  if (!esVacioOrigen && esVacioDestino) {
    return valorOrigen;
  }

  if (esVacioOrigen && !esVacioDestino) {
    return valorDestino;
  }

  if (!esVacioOrigen && !esVacioDestino) {
    const strOrigen = valorOrigen.toString().trim();
    const strDestino = valorDestino.toString().trim();
    if (strOrigen === strDestino) {
      return valorDestino;
    }
    return `${valorDestino} + ${valorOrigen}`;
  }

  return valorDestino;
}

/**
 * Lista todas las entidades comerciales, incluyendo relaciones principales.
 */
const listar = async () => {
  try {
    const entidades = await prisma.entidadComercial.findMany({
      include: {
        tipoDocumento: true,
        tipoEntidad: true,
        formaPago: true,
        agrupacionEntidad: true,
        contactos: true,
        direcciones: {
          include: {
            ubigeo: true,
          },
        },
        precios: true,
        vehiculos: true,
        lineasCredito: true,
      },
    });

    const entidadesConAuditoria = await Promise.all(
      entidades.map(async (entidad) => {
        // Búsqueda manual de empresa
        const empresaRaw = entidad.empresaId
          ? await prisma.empresa.findUnique({
            where: { id: entidad.empresaId },
            select: { id: true, razonSocial: true, nombreComercial: true },
          })
          : null;

        // Convertir BigInt a string manualmente para asegurar serialización
        const empresa = empresaRaw
          ? {
            id: empresaRaw.id.toString(),
            razonSocial: empresaRaw.razonSocial,
            nombreComercial: empresaRaw.nombreComercial,
          }
          : null;

        const personalCreador = entidad.creadoPor
          ? await prisma.personal.findUnique({
            where: { id: entidad.creadoPor },
            select: { id: true, nombres: true, apellidos: true },
          })
          : null;

        const personalActualizador = entidad.actualizadoPor
          ? await prisma.personal.findUnique({
            where: { id: entidad.actualizadoPor },
            select: { id: true, nombres: true, apellidos: true },
          })
          : null;

        return {
          ...entidad,
          empresa,
          personalCreador,
          personalActualizador,
        };
      }),
    );

    return entidadesConAuditoria;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene una entidad comercial por ID (incluyendo relaciones principales).
 */
const obtenerPorId = async (id) => {
  try {
    const entidad = await prisma.entidadComercial.findUnique({
      where: { id },
      include: {
        tipoDocumento: true,
        tipoEntidad: true,
        formaPago: true,
        agrupacionEntidad: true,
        contactos: true,
        direcciones: {
          include: {
            ubigeo: true,
          },
        },
        precios: true,
        vehiculos: true,
        lineasCredito: true,
      },
    });
    if (!entidad) throw new NotFoundError("Entidad comercial no encontrada");

    // Agregar manualmente las relaciones con Personal para auditoría
    const personalCreador = entidad.creadoPor
      ? await prisma.personal.findUnique({
        where: { id: entidad.creadoPor },
        select: { id: true, nombres: true, apellidos: true },
      })
      : null;

    const personalActualizador = entidad.actualizadoPor
      ? await prisma.personal.findUnique({
        where: { id: entidad.actualizadoPor },
        select: { id: true, nombres: true, apellidos: true },
      })
      : null;

    return {
      ...entidad,
      personalCreador,
      personalActualizador,
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea una entidad comercial validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarEntidadComercial(data);

    // Preparar datos con campos de auditoría
    const dataConAuditoria = {
      ...data,
      // Si creadoEn no viene o es null, asignar fecha actual
      creadoEn: data.creadoEn || new Date(),
      // Si actualizadoEn no viene o es null, asignar fecha actual
      actualizadoEn: data.actualizadoEn || new Date(),
      // creadoPor y actualizadoPor vienen del frontend, pero validar que sean números o null
      creadoPor: data.creadoPor ? Number(data.creadoPor) : null,
      actualizadoPor: data.actualizadoPor ? Number(data.actualizadoPor) : null,
    };

    const entidadCreada = await prisma.entidadComercial.create({
      data: dataConAuditoria,
    });

    // Agregar manualmente las relaciones con Personal para auditoría
    const personalCreador = entidadCreada.creadoPor
      ? await prisma.personal.findUnique({
        where: { id: entidadCreada.creadoPor },
        select: { id: true, nombres: true, apellidos: true },
      })
      : null;

    const personalActualizador = entidadCreada.actualizadoPor
      ? await prisma.personal.findUnique({
        where: { id: entidadCreada.actualizadoPor },
        select: { id: true, nombres: true, apellidos: true },
      })
      : null;

    return {
      ...entidadCreada,
      personalCreador,
      personalActualizador,
    };
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza una entidad comercial existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entidadComercial.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Entidad comercial no encontrada");
    await validarEntidadComercial(data, id);

    // Preparar datos con campos de auditoría
    const dataConAuditoria = {
      ...data,
      // Si creadoEn no viene o es null, mantener el existente o asignar fecha actual
      creadoEn: data.creadoEn || existente.creadoEn || new Date(),
      // Siempre actualizar actualizadoEn con la fecha actual
      actualizadoEn: new Date(),
      // Si creadoPor no viene o es null, mantener el existente
      creadoPor: data.creadoPor ? Number(data.creadoPor) : existente.creadoPor,
      // Siempre actualizar actualizadoPor
      actualizadoPor: data.actualizadoPor ? Number(data.actualizadoPor) : null,
    };

    const entidadActualizada = await prisma.entidadComercial.update({
      where: { id },
      data: dataConAuditoria,
    });

    // Agregar manualmente las relaciones con Personal para auditoría
    const personalCreador = entidadActualizada.creadoPor
      ? await prisma.personal.findUnique({
        where: { id: entidadActualizada.creadoPor },
        select: { id: true, nombres: true, apellidos: true },
      })
      : null;

    const personalActualizador = entidadActualizada.actualizadoPor
      ? await prisma.personal.findUnique({
        where: { id: entidadActualizada.actualizadoPor },
        select: { id: true, nombres: true, apellidos: true },
      })
      : null;

    return {
      ...entidadActualizada,
      personalCreador,
      personalActualizador,
    };
  } catch (err) {
    if (
      err instanceof ConflictError ||
      err instanceof NotFoundError ||
      err instanceof ValidationError
    )
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Elimina una entidad comercial por ID con verificación exhaustiva de uso en módulos operativos.
 * 
 * LÓGICA:
 * 1. Verifica si la entidad tiene operaciones en 32 modelos del sistema
 * 2. Si tiene operaciones: Retorna error detallado con conteo por módulo
 * 3. Si NO tiene operaciones: Elimina en cascada las 8 tablas maestras relacionadas
 * 
 * NOTA: Los permisos se validan en el middleware de autenticación (AccesosUsuario.puedeEliminar)
 * 
 * @param {BigInt} id - ID de la entidad comercial a eliminar
 * @returns {Promise<Object>} Resultado con success, mensaje y detalles
 */
const eliminar = async (id) => {
  try {
    // ========================================
    // PASO 1: VALIDACIONES PREVIAS
    // ========================================

    if (!id) {
      throw new ValidationError("El ID de la Entidad Comercial es obligatorio");
    }

    // Validar que la entidad existe
    const entidad = await prisma.entidadComercial.findUnique({
      where: { id },
      select: {
        id: true,
        razonSocial: true,
        numeroDocumento: true,
      },
    });

    if (!entidad) {
      throw new NotFoundError("Entidad comercial no encontrada");
    }

    // ========================================
    // PASO 2: VERIFICAR USO EN MÓDULOS OPERATIVOS (32 MODELOS)
    // ========================================
    // IMPORTANTE: Estos modelos NO se eliminan, solo se verifica si tienen registros
    // Si tienen registros, se bloquea la eliminación de la EntidadComercial

    const detalleUso = {};
    let totalOperaciones = 0;

    // 🔍 ALMACÉN E INVENTARIO (4 modelos)
    const movimientosAlmacen = await prisma.movimientoAlmacen.count({
      where: { entidadComercialId: id },
    });
    if (movimientosAlmacen > 0) {
      detalleUso.movimientosAlmacen = movimientosAlmacen;
      totalOperaciones += movimientosAlmacen;
    }

    const kardexAlmacenes = await prisma.kardexAlmacen.count({
      where: { clienteId: id },
    });
    if (kardexAlmacenes > 0) {
      detalleUso.kardexAlmacenes = kardexAlmacenes;
      totalOperaciones += kardexAlmacenes;
    }

    const saldosDetProductoCliente = await prisma.saldosDetProductoCliente.count({
      where: { clienteId: id },
    });
    if (saldosDetProductoCliente > 0) {
      detalleUso.saldosDetProductoCliente = saldosDetProductoCliente;
      totalOperaciones += saldosDetProductoCliente;
    }

    const saldosProductoCliente = await prisma.saldosProductoCliente.count({
      where: { clienteId: id },
    });
    if (saldosProductoCliente > 0) {
      detalleUso.saldosProductoCliente = saldosProductoCliente;
      totalOperaciones += saldosProductoCliente;
    }

    // 🔍 COMPRAS (4 modelos)
    const requerimientosCompra = await prisma.requerimientoCompra.count({
      where: { proveedorId: id },
    });
    if (requerimientosCompra > 0) {
      detalleUso.requerimientosCompra = requerimientosCompra;
      totalOperaciones += requerimientosCompra;
    }

    const detallesReqCompra = await prisma.detalleReqCompra.count({
      where: { proveedorId: id },
    });
    if (detallesReqCompra > 0) {
      detalleUso.detallesReqCompra = detallesReqCompra;
      totalOperaciones += detallesReqCompra;
    }

    const cotizacionesProveedores = await prisma.cotizacionProveedor.count({
      where: { proveedorId: id },
    });
    if (cotizacionesProveedores > 0) {
      detalleUso.cotizacionesProveedores = cotizacionesProveedores;
      totalOperaciones += cotizacionesProveedores;
    }

    const ordenesCompra = await prisma.ordenCompra.count({
      where: { proveedorId: id },
    });
    if (ordenesCompra > 0) {
      detalleUso.ordenesCompra = ordenesCompra;
      totalOperaciones += ordenesCompra;
    }

    // 🔍 VENTAS Y EXPORTACIÓN (4 modelos)
    const cotizacionesVentas = await prisma.cotizacionVentas.count({
      where: { clienteId: id },
    });
    if (cotizacionesVentas > 0) {
      detalleUso.cotizacionesVentas = cotizacionesVentas;
      totalOperaciones += cotizacionesVentas;
    }

    const preFacturas = await prisma.preFactura.count({
      where: { clienteId: id },
    });
    if (preFacturas > 0) {
      detalleUso.preFacturas = preFacturas;
      totalOperaciones += preFacturas;
    }

    const costosExportacionCotizacion = await prisma.costosExportacionCotizacion.count({
      where: { proveedorId: id },
    });
    if (costosExportacionCotizacion > 0) {
      detalleUso.costosExportacionCotizacion = costosExportacionCotizacion;
      totalOperaciones += costosExportacionCotizacion;
    }

    const costosExportacionPorIncoterm = await prisma.costoExportacionPorIncoterm.count({
      where: { proveedorDefaultId: id },
    });
    if (costosExportacionPorIncoterm > 0) {
      detalleUso.costosExportacionPorIncoterm = costosExportacionPorIncoterm;
      totalOperaciones += costosExportacionPorIncoterm;
    }

    // 🔍 CAJA Y TESORERÍA (2 modelos)
    const movimientosCaja = await prisma.movimientoCaja.count({
      where: { entidadComercialId: id },
    });
    if (movimientosCaja > 0) {
      detalleUso.movimientosCaja = movimientosCaja;
      totalOperaciones += movimientosCaja;
    }

    const detalleMovsEntregaRendir = await prisma.detMovsEntregaRendir.count({
      where: { entidadComercialId: id },
    });
    if (detalleMovsEntregaRendir > 0) {
      detalleUso.detalleMovsEntregaRendir = detalleMovsEntregaRendir;
      totalOperaciones += detalleMovsEntregaRendir;
    }

    // 🔍 PESCA (5 modelos)
    const descargasFaenaPesca = await prisma.descargaFaenaPesca.count({
      where: { clienteId: id },
    });
    if (descargasFaenaPesca > 0) {
      detalleUso.descargasFaenaPesca = descargasFaenaPesca;
      totalOperaciones += descargasFaenaPesca;
    }

    const descargasFaenaConsumo = await prisma.descargaFaenaConsumo.count({
      where: { clienteId: id },
    });
    if (descargasFaenaConsumo > 0) {
      detalleUso.descargasFaenaConsumo = descargasFaenaConsumo;
      totalOperaciones += descargasFaenaConsumo;
    }

    const comisionesFidelizacion = await prisma.comisionFidelizacion.count({
      where: { entidadComercialId: id },
    });
    if (comisionesFidelizacion > 0) {
      detalleUso.comisionesFidelizacion = comisionesFidelizacion;
      totalOperaciones += comisionesFidelizacion;
    }

    // DetCuotaPesca: Verifica 2 campos (entidadEmpresarialId, entidadComercialComisionistaAlquiler)
    const detCuotasPesca = await prisma.detCuotaPesca.count({
      where: {
        OR: [
          { entidadEmpresarialId: id },
          { entidadComercialComisionistaAlquiler: id },
        ],
      },
    });
    if (detCuotasPesca > 0) {
      detalleUso.detCuotasPesca = detCuotasPesca;
      totalOperaciones += detCuotasPesca;
    }

    // TemporadaPesca: Verifica 2 campos (entidadEmpresarialAlquiladaId, entidadComercialComisionistaAlquiler)
    const temporadasPesca = await prisma.temporadaPesca.count({
      where: {
        OR: [
          { entidadEmpresarialAlquiladaId: id },
          { entidadComercialComisionistaAlquiler: id },
        ],
      },
    });
    if (temporadasPesca > 0) {
      detalleUso.temporadasPesca = temporadasPesca;
      totalOperaciones += temporadasPesca;
    }

    // 🔍 MÓDULO FINANCIERO (9 modelos)
    const comprobantesElectronicos = await prisma.comprobanteElectronico.count({
      where: { entidadComercialId: id },
    });
    if (comprobantesElectronicos > 0) {
      detalleUso.comprobantesElectronicos = comprobantesElectronicos;
      totalOperaciones += comprobantesElectronicos;
    }

    const cuentasPorCobrar = await prisma.cuentaPorCobrar.count({
      where: { clienteId: id },
    });

    if (cuentasPorCobrar > 0) {
      detalleUso.cuentasPorCobrar = cuentasPorCobrar;
      totalOperaciones += cuentasPorCobrar;
    }

    const cuentasPorPagar = await prisma.cuentaPorPagar.count({
      where: { proveedorId: id },
    });
    if (cuentasPorPagar > 0) {
      detalleUso.cuentasPorPagar = cuentasPorPagar;
      totalOperaciones += cuentasPorPagar;
    }

    // LetraCambio: Verifica 3 campos (giradoId, beneficiarioId, avalId)
    const letrasGirado = await prisma.letraCambio.count({
      where: { giradoId: id },
    });
    const letrasBeneficiario = await prisma.letraCambio.count({
      where: { beneficiarioId: id },
    });
    const letrasAval = await prisma.letraCambio.count({
      where: { avalId: id },
    });
    const totalLetras = letrasGirado + letrasBeneficiario + letrasAval;
    if (totalLetras > 0) {
      detalleUso.letrasCambio = totalLetras;
      totalOperaciones += totalLetras;
    }

    // EndosoLetraCambio: Verifica 2 campos (endosanteId, endosatarioId)
    const endososComoEndosante = await prisma.endosoLetraCambio.count({
      where: { endosanteId: id },
    });
    const endososComoEndosatario = await prisma.endosoLetraCambio.count({
      where: { endosatarioId: id },
    });
    const totalEndosos = endososComoEndosante + endososComoEndosatario;
    if (totalEndosos > 0) {
      detalleUso.endososLetra = totalEndosos;
      totalOperaciones += totalEndosos;
    }

    const retenciones = await prisma.retencion.count({
      where: { proveedorId: id },
    });
    if (retenciones > 0) {
      detalleUso.retenciones = retenciones;
      totalOperaciones += retenciones;
    }

    const percepciones = await prisma.percepcion.count({
      where: { proveedorId: id },
    });
    if (percepciones > 0) {
      detalleUso.percepciones = percepciones;
      totalOperaciones += percepciones;
    }

    const detallesAsientos = await prisma.detalleAsientoContable.count({
      where: { entidadComercialId: id },
    });
    if (detallesAsientos > 0) {
      detalleUso.detallesAsientos = detallesAsientos;
      totalOperaciones += detallesAsientos;
    }

    const tiposDeudaTributaria = await prisma.tipoDeudaTributaria.count({
      where: { entidadRecaudadoraId: id },
    });
    if (tiposDeudaTributaria > 0) {
      detalleUso.tiposDeudaTributaria = tiposDeudaTributaria;
      totalOperaciones += tiposDeudaTributaria;
    }

    // 🔍 OTROS MÓDULOS (4 modelos)
    const contratosServicio = await prisma.contratoServicio.count({
      where: { clienteId: id },
    });
    if (contratosServicio > 0) {
      detalleUso.contratosServicio = contratosServicio;
      totalOperaciones += contratosServicio;
    }

    const accesosInstalacion = await prisma.accesoInstalacion.count({
      where: { entidadComercialId: id },
    });
    if (accesosInstalacion > 0) {
      detalleUso.accesosInstalacion = accesosInstalacion;
      totalOperaciones += accesosInstalacion;
    }

    const personalEnlazado = await prisma.personal.count({
      where: { enlaceEntidadComercialId: id },
    });
    if (personalEnlazado > 0) {
      detalleUso.personalEnlazado = personalEnlazado;
      totalOperaciones += personalEnlazado;
    }

    const tarifasRutaProveedor = await prisma.tarifaCostoExportacionRuta.count({
      where: { proveedorId: id },
    });
    if (tarifasRutaProveedor > 0) {
      detalleUso.tarifasRutaProveedor = tarifasRutaProveedor;
      totalOperaciones += tarifasRutaProveedor;
    }

    const detContratistasOT = await prisma.detContratistasOT.count({
      where: { contratistaId: id },
    });
    if (detContratistasOT > 0) {
      detalleUso.detContratistasOT = detContratistasOT;
      totalOperaciones += detContratistasOT;
    }

    // ========================================
    // PASO 3: DECISIÓN - BLOQUEAR O PERMITIR
    // ========================================

    if (totalOperaciones > 0) {
      // ❌ BLOQUEAR ELIMINACIÓN - Tiene operaciones
      return {
        success: false,
        mensaje: `No se puede eliminar la entidad comercial "${entidad.razonSocial}" porque tiene ${totalOperaciones} operaciones registradas en el sistema`,
        detalleUso: detalleUso,
        totalOperaciones: totalOperaciones,
      };
    }

    // ========================================
    // PASO 4: ELIMINAR EN CASCADA (SOLO SI NO TIENE OPERACIONES)
    // ========================================
    // Se eliminan las 8 tablas maestras relacionadas

    const resultados = {
      contactos: 0,
      direcciones: 0,
      precios: 0,
      vehiculos: 0,
      lineasCredito: 0,
      ctaCteEntidad: 0,
      detallesComisionFidelizacion: 0,
      plataformasRecepcionPesca: 0,
      entidadComercial: 0,
    };

    // 1. Eliminar ContactoEntidad
    const contactosResult = await prisma.contactoEntidad.deleteMany({
      where: { entidadComercialId: id },
    });
    resultados.contactos = Number(contactosResult.count);

    // 2. Eliminar DireccionEntidad
    const direccionesResult = await prisma.direccionEntidad.deleteMany({
      where: { entidadComercialId: id },
    });
    resultados.direcciones = Number(direccionesResult.count);

    // 3. Eliminar PrecioEntidad
    const preciosResult = await prisma.precioEntidad.deleteMany({
      where: { entidadComercialId: id },
    });
    resultados.precios = Number(preciosResult.count);

    // 4. Eliminar VehiculoEntidad
    const vehiculosResult = await prisma.vehiculoEntidad.deleteMany({
      where: { entidadComercialId: id },
    });
    resultados.vehiculos = Number(vehiculosResult.count);

    // 5. Eliminar LineaCreditoEntidad
    const lineasCreditoResult = await prisma.lineaCreditoEntidad.deleteMany({
      where: { entidadComercialId: id },
    });
    resultados.lineasCredito = Number(lineasCreditoResult.count);

    // 6. Eliminar CtaCteEntidad
    const ctaCteResult = await prisma.ctaCteEntidad.deleteMany({
      where: { entidadComercialId: id },
    });
    resultados.ctaCteEntidad = Number(ctaCteResult.count);

    // 7. Eliminar DetComisionFidelizacionEntidad
    const detallesComisionResult = await prisma.detComisionFidelizacionEntidad.deleteMany({
      where: { entidadComercialFidelizacionId: id },
    });
    resultados.detallesComisionFidelizacion = Number(detallesComisionResult.count);

    // 8. Eliminar DetPlataformaRecepcionPesca
    const plataformasResult = await prisma.detPlataformaRecepcionPesca.deleteMany({
      where: { entidadComercialId: id },
    });
    resultados.plataformasRecepcionPesca = Number(plataformasResult.count);

    // 9. Eliminar EntidadComercial
    await prisma.entidadComercial.delete({
      where: { id },
    });
    resultados.entidadComercial = 1;

    // ========================================
    // PASO 5: RETORNAR RESULTADO EXITOSO
    // ========================================

    return {
      success: true,
      mensaje: `Entidad comercial "${entidad.razonSocial}" eliminada exitosamente con todos sus registros relacionados`,
      resultados: resultados,
    };

  } catch (err) {
    if (
      err instanceof ValidationError ||
      err instanceof NotFoundError ||
      err instanceof ConflictError
    ) {
      throw err;
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene las agencias de envío (entidades comerciales del tipo "AGENCIA DE ENVIO")
 */
const obtenerAgenciasEnvio = async () => {
  try {
    // Primero buscar el ID del tipo de entidad "AGENCIA DE ENVIO"
    const tipoAgencia = await prisma.tipoEntidad.findFirst({
      where: { nombre: "AGENCIA DE ENVIO" },
    });

    if (!tipoAgencia) {
      return []; // Si no existe el tipo, retornar array vacío
    }

    // Buscar todas las entidades comerciales de este tipo
    return await prisma.entidadComercial.findMany({
      where: {
        tipoEntidadId: tipoAgencia.id,
        estado: true, // Solo agencias activas
      },
      select: {
        id: true,
        razonSocial: true,
        nombreComercial: true,
      },
      orderBy: {
        razonSocial: "asc",
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene los proveedores GPS (entidades comerciales del tipo "PROVEEDOR EQUIPOS GEOLOCALIZACION")
 */
const obtenerProveedoresGps = async () => {
  try {
    // Primero buscar el ID del tipo de entidad "PROVEEDOR EQUIPOS GEOLOCALIZACION"
    const tipoProveedorGps = await prisma.tipoEntidad.findFirst({
      where: { nombre: "PROVEEDOR EQUIPOS GEOLOCALIZACION" },
    });

    if (!tipoProveedorGps) {
      return []; // Si no existe el tipo, retornar array vacío
    }

    // Buscar todas las entidades comerciales de este tipo
    return await prisma.entidadComercial.findMany({
      where: {
        tipoEntidadId: tipoProveedorGps.id,
        estado: true, // Solo proveedores activos
      },
      select: {
        id: true,
        razonSocial: true,
        nombreComercial: true,
      },
      orderBy: {
        razonSocial: "asc",
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Clona una EntidadComercial y sus tablas relacionadas a empresas seleccionadas específicamente
 * @param {BigInt} entidadId - ID de la entidad comercial a clonar
 * @param {Array<BigInt>} empresasDestinoIds - Array de IDs de empresas destino
 * @returns {Object} Resumen de operaciones realizadas
 */
const clonarAEmpresasSeleccionadas = async (entidadId, empresasDestinoIds) => {
  try {
    // Obtener entidad origen con todas sus relaciones
    const entidadOrigen = await prisma.entidadComercial.findUnique({
      where: { id: entidadId },
      include: {
        direcciones: { include: { ubigeo: true } },
        contactos: true,
        ctaCteEntidad: { include: { banco: true, moneda: true } },
      },
    });

    if (!entidadOrigen) {
      throw new NotFoundError("Entidad comercial no encontrada");
    }

    // Obtener solo las empresas seleccionadas (excluyendo la empresa origen)
    const empresasDestino = await prisma.empresa.findMany({
      where: {
        id: {
          in: empresasDestinoIds,
          not: entidadOrigen.empresaId,
        },
        cesado: false, // Solo empresas activas
      },
    });

    if (empresasDestino.length === 0) {
      throw new ValidationError(
        "No se encontraron empresas válidas para clonar",
      );
    }

    const resumen = {
      empresasProcesadas: 0,
      entidadesCreadas: 0,
      entidadesActualizadas: 0,
      direccionesCreadas: 0,
      direccionesActualizadas: 0,
      contactosCreados: 0,
      contactosActualizados: 0,
      ctaCteCreadas: 0,
      ctaCteActualizadas: 0,
      errores: [],
      resultados: [],
    };

    // Procesar cada empresa seleccionada
    for (const empresaDestino of empresasDestino) {
      try {
        resumen.empresasProcesadas++;

        // Verificar si ya existe la entidad en esta empresa
        const entidadDestino = await prisma.entidadComercial.findFirst({
          where: {
            empresaId: empresaDestino.id,
            numeroDocumento: entidadOrigen.numeroDocumento,
          },
          include: {
            direcciones: true,
            contactos: true,
            ctaCteEntidad: true,
          },
        });

        let entidadDestinoId;

        if (!entidadDestino) {
          // CREAR nueva entidad
          const {
            id,
            empresaId,
            creadoEn,
            actualizadoEn,
            creadoPor,
            actualizadoPor,
            direcciones,
            contactos,
            ctaCteEntidad,
            tipoDocumento,
            tipoEntidad,
            formaPago,
            agrupacionEntidad,
            ...datosEntidad
          } = entidadOrigen;

          const nuevaEntidad = await prisma.entidadComercial.create({
            data: {
              ...datosEntidad,
              empresaId: empresaDestino.id,
              creadoEn: new Date(),
              actualizadoEn: new Date(),
            },
          });

          entidadDestinoId = nuevaEntidad.id;
          resumen.entidadesCreadas++;
        } else {
          // ACTUALIZAR entidad existente
          const camposTexto = [
            "nombreComercial",
            "observaciones",
            "codigoErpFinanciero",
          ];
          const dataActualizar = {};

          for (const campo of camposTexto) {
            if (entidadOrigen[campo] !== undefined) {
              dataActualizar[campo] = mergeInteligente(
                entidadOrigen[campo],
                entidadDestino[campo],
              );
            }
          }

          const camposBooleanos = [
            "esCliente",
            "esProveedor",
            "esCorporativo",
            "custodiaStock",
            "controlLote",
            "controlFechaVenc",
            "controlFechaProd",
            "controlFechaIngreso",
            "controlSerie",
            "controlEnvase",
            "sujetoRetencion",
            "sujetoPercepcion",
            "esAgenteRetencion",
            "condicionHabidoSUNAT",
            "estadoActivoSUNAT",
          ];

          for (const campo of camposBooleanos) {
            if (!entidadDestino[campo] && entidadOrigen[campo]) {
              dataActualizar[campo] = entidadOrigen[campo];
            }
          }

          if (Object.keys(dataActualizar).length > 0) {
            await prisma.entidadComercial.update({
              where: { id: entidadDestino.id },
              data: {
                ...dataActualizar,
                actualizadoEn: new Date(),
              },
            });
          }

          entidadDestinoId = entidadDestino.id;
          resumen.entidadesActualizadas++;
        }

        // Clonar direcciones
        for (const direccion of entidadOrigen.direcciones) {
          const direccionExistente = entidadDestino?.direcciones.find(
            (d) => d.tipoDireccion === direccion.tipoDireccion,
          );

          if (!direccionExistente) {
            const { id, entidadComercialId, ubigeo, ...datosDireccion } =
              direccion;
            await prisma.direccionEntidad.create({
              data: {
                ...datosDireccion,
                entidadComercialId: entidadDestinoId,
              },
            });
            resumen.direccionesCreadas++;
          } else {
            resumen.direccionesActualizadas++;
          }
        }

        // Clonar contactos
        for (const contacto of entidadOrigen.contactos) {
          const contactoExistente = entidadDestino?.contactos.find(
            (c) =>
              c.email === contacto.email || c.telefono === contacto.telefono,
          );

          if (!contactoExistente) {
            const { id, entidadComercialId, ...datosContacto } = contacto;
            await prisma.contactoEntidad.create({
              data: {
                ...datosContacto,
                entidadComercialId: entidadDestinoId,
              },
            });
            resumen.contactosCreados++;
          } else {
            resumen.contactosActualizados++;
          }
        }

        // Clonar cuentas corrientes
        for (const cuenta of entidadOrigen.ctaCteEntidad) {
          const cuentaExistente = entidadDestino?.ctaCteEntidad.find(
            (c) =>
              c.numeroCuenta === cuenta.numeroCuenta &&
              c.bancoId === cuenta.bancoId,
          );

          if (!cuentaExistente) {
            const { id, entidadComercialId, banco, moneda, ...datosCuenta } =
              cuenta;
            await prisma.ctaCteEntidad.create({
              data: {
                ...datosCuenta,
                entidadComercialId: entidadDestinoId,
              },
            });
            resumen.ctaCteCreadas++;
          } else {
            resumen.ctaCteActualizadas++;
          }
        }

        // Agregar resultado exitoso
        resumen.resultados.push({
          empresaId: empresaDestino.id,
          razonSocial: empresaDestino.razonSocial,
          exito: true,
        });
      } catch (error) {
        console.error(
          `Error al clonar en empresa ${empresaDestino.razonSocial}:`,
          error,
        );
        resumen.errores.push({
          empresaId: empresaDestino.id,
          empresaNombre: empresaDestino.razonSocial,
          error: error.message,
        });
        resumen.resultados.push({
          empresaId: empresaDestino.id,
          razonSocial: empresaDestino.razonSocial,
          exito: false,
          error: error.message,
        });
      }
    }

    return resumen;
  } catch (error) {
    console.error("Error en clonarAEmpresasSeleccionadas:", error);
    throw new DatabaseError(`Error al clonar entidad: ${error.message}`);
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerAgenciasEnvio,
  obtenerProveedoresGps,
  clonarAEmpresasSeleccionadas,
};
