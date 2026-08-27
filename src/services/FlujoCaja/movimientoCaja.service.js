import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import fs from "fs";
import path from "path";

const incluirRelaciones = {
  cuentaCorrienteOrigen: {
    select: {
      id: true,
      numeroCuenta: true,
      banco: { select: { id: true, nombre: true } },
      moneda: { select: { id: true, simbolo: true } },
    },
  },
  cuentaCorrienteDestino: {
    select: {
      id: true,
      numeroCuenta: true,
      banco: { select: { id: true, nombre: true } },
      moneda: { select: { id: true, simbolo: true } },
    },
  },
  medioPago: true,
  entidadComercial: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true,
    },
  },
  estadoMovimientoCaja: {
    select: {
      id: true,
      descripcion: true,
      severityColor: true,
    },
  },
  empresaOrigen: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true,
    },
  },
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true,
    },
  },
  moneda: {
    select: {
      id: true,
      simbolo: true,
      codigoSunat: true,
    },
  },
  tipoMovimiento: {
    select: {
      id: true,
      nombre: true,
      esIngreso: true,
      esTransferencia: true,
    },
  },
  ctaCteEntidad: {
    select: {
      id: true,
      numeroCuenta: true,
      numeroCuentaCCI: true,
      numeroTelefonoBilletera: true,
      BilleteraDigital: true,
      banco: {
        select: {
          id: true,
          nombre: true,
        },
      },
      moneda: {
        select: {
          id: true,
          simbolo: true,
          codigoSunat: true,
        },
      },
      entidadComercial: {
        select: {
          id: true,
          razonSocial: true,
          numeroDocumento: true,
        },
      },
    },
  },
  producto: {
    select: {
      id: true,
      descripcionArmada: true,
      codigo: true,
    },
  },
  centroCosto: true,
  personalAprobador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
  personalRechazador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
  movimientoOriginal: {
    select: {
      id: true,
      monto: true,
      descripcion: true,
      fechaOperacionMovCaja: true,
    },
  },
};

// ============================================
// CONFIGURACIÓN DE ORÍGENES PARA TESORERÍA
// IDs verificados desde SubmoduloSistema
// ============================================
const ORIGENES_MOVIMIENTO_TESORERIA = {
  PAGO_CXC: {
    tipo: 'INGRESO',
    submoduloOrigenId: Number(116),  // Pagos Cuentas Por Cobrar
    descripcionTemplate: (data) => `Cobro ${data.numeroDocumento || 'Cliente'}`,
  },
  PAGO_CXP: {
    tipo: 'EGRESO',
    submoduloOrigenId: Number(115),  // Pagos Cuentas por Pagar
    descripcionTemplate: (data) => `Pago ${data.numeroDocumento || 'Proveedor'}`,
  },
};

/**
 * Crea un MovimientoCaja desde Tesorería (CxC, CxP, etc.)
 * Patrón centralizado para garantizar trazabilidad
 * @param {Object} tx - Transacción Prisma activa
 * @param {Object} params - Parámetros del movimiento
 * @returns {Promise<MovimientoCaja>}
 */
async function crearMovimientoCajaDesdeTesoreria(tx, params) {
  const {
    origen,                 // 'PAGO_CXC', 'PAGO_CXP'
    tipoMovimientoId,
    empresaId,
    entidadComercialId,
    monto,
    monedaId,
    medioPagoId,
    cuentaCorrienteId,
    fechaOperacion,
    centroCostoId,
    numeroOperacion,
    observaciones,
    datosOrigen,
    estadoId,
    usuarioId,
  } = params;

  // Validar origen
  const config = ORIGENES_MOVIMIENTO_TESORERIA[origen];
  if (!config) {
    throw new ValidationError(`Origen de movimiento no válido: ${origen}`);
  }

  // Determinar campos según tipo
  const esIngreso = config.tipo === 'INGRESO';
  const empresaCampo = 'empresaId';
  const cuentaCampo = esIngreso ? 'cuentaCorrienteDestinoId' : 'cuentaCorrienteOrigenId';

  // Construir datos del movimiento
  const datosMovimiento = {
    [empresaCampo]: empresaId,
    [cuentaCampo]: cuentaCorrienteId,
    tipoMovimientoId,
    entidadComercialId,
    monto,
    monedaId,
    descripcion: config.descripcionTemplate(datosOrigen || {}),
    referenciaExtId: numeroOperacion,
    medioPagoId,
    usuarioId,
    estadoId: estadoId || Number(102), // Default: APROBADO
    fechaOperacionMovCaja: fechaOperacion,
    centroCostoId,

    // Trazabilidad
    moduloOrigenMotivoOperacionId: config.submoduloOrigenId,
    origenMotivoOperacionId: null, // Se actualiza después
    fechaMotivoOperacion: fechaOperacion,
    usuarioMotivoOperacionId: usuarioId,

    // Configuración contable
    generarAsientoContable: true,
    asientosGenerados: false,
    incluirEnReporteFiscal: true,
    operacionSinFactura: false,

    // Auditoría
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
  };

  // Agregar observaciones si existen
  if (observaciones) {
    datosMovimiento.descripcion += ` - ${observaciones}`;
  }

  // Crear el movimiento
  const movimiento = await tx.movimientoCaja.create({
    data: datosMovimiento,
  });

  return movimiento;
}


async function copiarPdfAMovimientoCaja(rutaOrigen, movimientoCajaId) {
  try {
    if (!rutaOrigen || !movimientoCajaId) return null;
    const rutaAbsolutaOrigen = path.join(process.cwd(), rutaOrigen);

    if (!fs.existsSync(rutaAbsolutaOrigen)) {
      console.warn(
        `[MOVIMIENTO CAJA] Archivo origen no existe: ${rutaAbsolutaOrigen}`,
      );
      return rutaOrigen;
    }

    const carpetaDestino = path.join(
      process.cwd(),
      "uploads",
      "pdf-system",
      "movimiento-caja-comprobante",
    );

    if (!fs.existsSync(carpetaDestino)) {
      fs.mkdirSync(carpetaDestino, { recursive: true });
    }

    const extension = path.extname(rutaOrigen);
    const nombreArchivo = `MOVIMIENTO-CAJA-COMPROBANTE-${movimientoCajaId}${extension}`;
    const rutaAbsolutaDestino = path.join(carpetaDestino, nombreArchivo);
    fs.copyFileSync(rutaAbsolutaOrigen, rutaAbsolutaDestino);
    const rutaRelativa = `/uploads/pdf-system/movimiento-caja-comprobante/${nombreArchivo}`;
    return rutaRelativa;
  } catch (error) {
    console.error("[MOVIMIENTO CAJA] Error al copiar archivo:", error);
    return rutaOrigen;
  }
}

async function actualizarSaldosCuentasCorrientes(movimiento) {
  try {
    const {
      id,
      cuentaCorrienteOrigenId,
      cuentaCorrienteDestinoId,
      empresaId,
      monto,
      centroCostoId,
    } = movimiento;
    const saldosGenerados = [];

    if (cuentaCorrienteOrigenId && empresaOrigenId) {
      const ultimoSaldoOrigen = await prisma.saldoCuentaCorriente.findFirst({
        where: { cuentaCorrienteId: cuentaCorrienteOrigenId },
        orderBy: { fecha: "desc" },
      });

      const saldoAnteriorOrigen = ultimoSaldoOrigen
        ? Number(ultimoSaldoOrigen.saldoActual)
        : 0;
      const montoDecimal = Number(monto);

      const saldoOrigen = await prisma.saldoCuentaCorriente.create({
        data: {
          cuentaCorrienteId: cuentaCorrienteOrigenId,
          empresaId: empresaOrigenId,
          fecha: new Date(),
          saldoAnterior: saldoAnteriorOrigen,
          ingresos: 0,
          egresos: montoDecimal,
          saldoActual: saldoAnteriorOrigen - montoDecimal,
          movimientoCajaId: id,
          centroCostoId: centroCostoId || null,
          conciliado: false,
        },
        include: {
          cuentaCorriente: {
            select: {
              numeroCuenta: true,
              banco: { select: { nombre: true } },
            },
          },
        },
      });
      saldosGenerados.push(saldoOrigen);
    }

    if (cuentaCorrienteDestinoId && empresaId) {
      const ultimoSaldoDestino = await prisma.saldoCuentaCorriente.findFirst({
        where: { cuentaCorrienteId: cuentaCorrienteDestinoId },
        orderBy: { fecha: "desc" },
      });

      const saldoAnteriorDestino = ultimoSaldoDestino
        ? Number(ultimoSaldoDestino.saldoActual)
        : 0;

      const saldoDestino = await prisma.saldoCuentaCorriente.create({
        data: {
          cuentaCorrienteId: cuentaCorrienteDestinoId,
          empresaId: empresaId,
          fecha: new Date(),
          saldoAnterior: saldoAnteriorDestino,
          ingresos: montoDecimal,
          egresos: 0,
          saldoActual: saldoAnteriorDestino + montoDecimal,
          movimientoCajaId: id,
          centroCostoId: centroCostoId || null,
          conciliado: false,
        },
        include: {
          cuentaCorriente: {
            select: {
              numeroCuenta: true,
              banco: { select: { nombre: true } },
            },
          },
        },
      });
      saldosGenerados.push(saldoDestino);
    }

    return saldosGenerados;
  } catch (err) {
    console.error("Error al actualizar saldos de cuentas corrientes:", err);
    throw new DatabaseError(
      "Error al actualizar saldos de cuentas corrientes",
      err.message,
    );
  }
}

async function validarReferenciasMovimientoCaja(data) {
  const {
    cuentaCorrienteOrigenId,
    cuentaCorrienteDestinoId,
    empresaId,
    tipoMovimientoId,
    monedaId,
    usuarioId,
    medioPagoId,
    centroCostoId,
    moduloOrigenMotivoOperacionId,
    usuarioMotivoOperacionId,
    entidadComercialId,
  } = data;

  if (!tipoMovimientoId) {
    throw new ValidationError("Tipo de movimiento es obligatorio");
  }
  const tipoMov = await prisma.tipoMovEntregaRendir.findUnique({
    where: { id: tipoMovimientoId },
  });
  if (!tipoMov) throw new ValidationError("Tipo de movimiento no existente");

  if (tipoMov.esTransferencia) {
    if (!cuentaCorrienteOrigenId || !cuentaCorrienteDestinoId) {
      throw new ValidationError(
        "Las transferencias requieren cuenta origen Y cuenta destino",
      );
    }
    const cuentaOrigen = await prisma.cuentaCorriente.findUnique({
      where: { id: cuentaCorrienteOrigenId },
    });
    if (!cuentaOrigen)
      throw new ValidationError("Cuenta corriente origen no existente");

    const cuentaDestino = await prisma.cuentaCorriente.findUnique({
      where: { id: cuentaCorrienteDestinoId },
    });
    if (!cuentaDestino)
      throw new ValidationError("Cuenta corriente destino no existente");
  } else if (tipoMov.esIngreso) {
    if (!cuentaCorrienteDestinoId) {
      throw new ValidationError("Los ingresos requieren cuenta destino");
    }
    if (cuentaCorrienteOrigenId) {
      throw new ValidationError("Los ingresos no deben tener cuenta origen");
    }
    const cuentaDestino = await prisma.cuentaCorriente.findUnique({
      where: { id: cuentaCorrienteDestinoId },
    });
    if (!cuentaDestino)
      throw new ValidationError("Cuenta corriente destino no existente");
  } else {
    if (!cuentaCorrienteOrigenId) {
      throw new ValidationError("Los egresos requieren cuenta origen");
    }
    if (cuentaCorrienteDestinoId) {
      throw new ValidationError("Los egresos no deben tener cuenta destino");
    }
    const cuentaOrigen = await prisma.cuentaCorriente.findUnique({
      where: { id: cuentaCorrienteOrigenId },
    });
    if (!cuentaOrigen)
      throw new ValidationError("Cuenta corriente origen no existente");
  }

    if (!empresaId) {
    throw new ValidationError("El campo empresaId es obligatorio");
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
  });
  if (!empresa) {
    throw new ValidationError("Empresa no existente");
  }
  if (entidadComercialId) {
    const entidadComercial = await prisma.entidadComercial.findUnique({
      where: { id: entidadComercialId },
    });
    if (!entidadComercial)
      throw new ValidationError("Entidad comercial no existente");
  }

  if (data.cuentaDestinoEntidadComercialId) {
    const ctaCteEntidad = await prisma.ctaCteEntidad.findUnique({
      where: { id: data.cuentaDestinoEntidadComercialId },
      include: { entidadComercial: true },
    });
    if (!ctaCteEntidad)
      throw new ValidationError("Cuenta de entidad comercial no existente");

    if (
      entidadComercialId &&
      ctaCteEntidad.entidadComercialId !== entidadComercialId
    ) {
      throw new ValidationError(
        "La cuenta seleccionada no pertenece a la entidad comercial especificada",
      );
    }
  }

  if (!monedaId) {
    throw new ValidationError("Moneda es obligatoria");
  }
  const moneda = await prisma.moneda.findUnique({ where: { id: monedaId } });
  if (!moneda) throw new ValidationError("Moneda no existente");

  if (usuarioId) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) throw new ValidationError("Usuario no existente");
  }

  if (medioPagoId) {
    const medioPago = await prisma.medioPago.findUnique({
      where: { id: medioPagoId },
    });
    if (!medioPago) throw new ValidationError("Medio de pago no existente");
  }

  if (centroCostoId) {
    const centroCosto = await prisma.centroCosto.findUnique({
      where: { id: centroCostoId },
    });
    if (!centroCosto) throw new ValidationError("Centro de costo no existente");
  }

  if (moduloOrigenMotivoOperacionId) {
    const moduloOrigen = await prisma.moduloSistema.findUnique({
      where: { id: moduloOrigenMotivoOperacionId },
    });
    if (!moduloOrigen) throw new ValidationError("Módulo origen no existente");
  }

  if (usuarioMotivoOperacionId) {
    const usuarioMotivo = await prisma.personal.findUnique({
      where: { id: usuarioMotivoOperacionId },
    });
    if (!usuarioMotivo)
      throw new ValidationError("Usuario motivo operación no existente");
  }
}

const listar = async () => {
  return prisma.movimientoCaja.findMany({ include: incluirRelaciones });
};

const obtenerPorId = async (id) => {
  try {
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id },
      include: incluirRelaciones,
    });
    if (!movimiento)
      throw new NotFoundError("Movimiento de caja no encontrado");
    return movimiento;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarReferenciasMovimientoCaja(data);

    if (!data.estadoId) {
      data.estadoId = Number(20);
    }

    const moduloOrigen = data.moduloOrigenMotivoOperacionId
      ? Number(data.moduloOrigenMotivoOperacionId)
      : null;
    const origenId = data.origenMotivoOperacionId;

    let movimientoCreado;

    if (moduloOrigen === 2 && origenId) {
      const detMov = await prisma.detMovsEntregaRendir.findUnique({
        where: { id: Number(origenId) },
        select: {
          urlComprobanteMovimiento: true,
          productoId: true,
        },
      });
      if (detMov) {
        if (detMov.productoId) {
          data.productoId = detMov.productoId;
        }

        if (detMov.urlComprobanteMovimiento) {
          movimientoCreado = await prisma.movimientoCaja.create({ data });
          const nuevaRuta = await copiarPdfAMovimientoCaja(
            detMov.urlComprobanteMovimiento,
            movimientoCreado.id,
          );
          if (nuevaRuta && nuevaRuta !== detMov.urlComprobanteMovimiento) {
            await prisma.movimientoCaja.update({
              where: { id: movimientoCreado.id },
              data: { urlDocumentoMovCaja: nuevaRuta },
            });
          }

          return movimientoCreado;
        }
      }
    } else if (moduloOrigen === 3 && origenId) {
      const detMovConsumo =
        await prisma.detMovsEntRendirPescaConsumo.findUnique({
          where: { id: Number(origenId) },
          select: { urlComprobanteMovimiento: true },
        });

      if (detMovConsumo && detMovConsumo.urlComprobanteMovimiento) {
        movimientoCreado = await prisma.movimientoCaja.create({ data });

        const nuevaRuta = await copiarPdfAMovimientoCaja(
          detMovConsumo.urlComprobanteMovimiento,
          movimientoCreado.id,
        );

        if (nuevaRuta && nuevaRuta !== detMovConsumo.urlComprobanteMovimiento) {
          await prisma.movimientoCaja.update({
            where: { id: movimientoCreado.id },
            data: { urlDocumentoMovCaja: nuevaRuta },
          });
        }

        return movimientoCreado;
      }
    }

    movimientoCreado = await prisma.movimientoCaja.create({ data });
    return movimientoCreado;
  } catch (err) {
    if (err.name === "PrismaClientValidationError") {
      const match = err.message.match(/Argument `(\w+)` is missing/);
      if (match) {
        const campoFaltante = match[1];
        const nombresCampos = {
          cuentaCorrienteOrigenId: "Cuenta Corriente Origen",
          empresaOrigenId: "Empresa Origen",
          tipoMovimientoId: "Tipo de Movimiento",
          monedaId: "Moneda",
          monto: "Monto",
          estadoId: "Estado",
        };
        const nombreAmigable = nombresCampos[campoFaltante] || campoFaltante;
        throw new ValidationError(
          `El campo "${nombreAmigable}" es obligatorio para crear el movimiento de caja.`,
        );
      }
      throw new ValidationError(
        "Faltan campos obligatorios para crear el movimiento de caja. Por favor, complete todos los campos requeridos.",
      );
    }

    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movimientoCaja.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Movimiento de Caja No Encontrado");

    const soloActualizacionPDF =
      Object.keys(data).length <= 2 &&
      (data.urlComprobanteOperacionMovCaja !== undefined ||
        data.urlDocumentoMovCaja !== undefined);

    if (!soloActualizacionPDF) {
      await validarReferenciasMovimientoCaja(data);
    }

    const actualizado = await prisma.movimientoCaja.update({
      where: { id },
      data,
    });
    return actualizado;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Movimiento de caja no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    await prisma.movimientoCaja.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Movimiento de caja no encontrado");
    if (err.code === "P2003")
      throw new ConflictError(
        "No se puede eliminar el movimiento de caja porque está asociado a otros registros.",
      );
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const validarMovimiento = async (id, usuarioId) => {
  try {
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id },
    });
    if (!movimiento)
      throw new NotFoundError("Movimiento de caja no encontrado");

    if (Number(movimiento.estadoId) !== 20) {
      throw new ValidationError(
        "Solo se pueden validar movimientos en estado PENDIENTE",
      );
    }

    // ========================================
    // ✅ VERIFICAR SI YA EXISTEN SALDOS GENERADOS
    // ========================================
    const saldosExistentes = await prisma.saldoCuentaCorriente.findMany({
      where: { movimientoCajaId: id },
    });

    if (saldosExistentes.length > 0) {
      // ========================================
      // ✅ VERIFICAR PERMISO puedeReactivarDocs
      // ========================================
      if (!usuarioId) {
        throw new ValidationError(
          "Usuario no autenticado para re-validar movimientos con saldos generados",
        );
      }

      // Buscar el submódulo de movimientoCaja
      const submodulo = await prisma.submoduloSistema.findFirst({
        where: {
          ruta: "movimientoCaja",
          activo: true,
        },
        select: { id: true, nombre: true },
      });

      if (!submodulo) {
        throw new ValidationError(
          "Submódulo de Movimiento de Caja no encontrado",
        );
      }

      // Verificar si el usuario es superusuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { esSuperUsuario: true },
      });

      let tienePermiso = false;

      if (usuario?.esSuperUsuario) {
        tienePermiso = true;
      } else {
        // Buscar acceso del usuario al submódulo
        const acceso = await prisma.accesosUsuario.findFirst({
          where: {
            usuarioId,
            submoduloId: submodulo.id,
            activo: true,
          },
          select: {
            puedeReactivarDocs: true,
          },
        });

        if (!acceso) {
          throw new ValidationError(
            `No tiene acceso al módulo '${submodulo.nombre}'`,
          );
        }

        tienePermiso = acceso.puedeReactivarDocs;
      }

      if (!tienePermiso) {
        throw new ValidationError(
          'No tiene permiso para re-validar movimientos con saldos generados. Se requiere el permiso "Reactivar Documentos".',
        );
      }

      // ========================================
      // ✅ ELIMINAR SALDOS EXISTENTES
      // ========================================
      await prisma.saldoCuentaCorriente.deleteMany({
        where: { movimientoCajaId: id },
      });
    }

    const fechaActual = new Date();
    const movimientoActualizado = await prisma.movimientoCaja.update({
      where: { id },
      data: {
        estadoId: Number(21),
        fechaActualizacion: fechaActual,
      },
    });

    const moduloOrigen = movimiento.moduloOrigenMotivoOperacionId
      ? Number(movimiento.moduloOrigenMotivoOperacionId)
      : null;
    const origenId = movimiento.origenMotivoOperacionId;

    if (moduloOrigen === 2) {
      const detMov = await prisma.detMovsEntregaRendir.findUnique({
        where: { id: origenId },
      });

      if (!detMov) {
        throw new ValidationError(
          "La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntregaRendir",
        );
      }

      await prisma.detMovsEntregaRendir.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          entidadComercialId: movimiento.entidadComercialId,
          monedaId: movimiento.monedaId,
          operacionSinFactura: movimiento.operacionSinFactura,
          urlComprobanteOperacionMovCaja:
            movimiento.urlComprobanteOperacionMovCaja,
          urlComprobanteMovimiento: movimiento.urlDocumentoMovCaja,
          productoId: movimiento.productoId,
          actualizadoEn: fechaActual,
        },
      });
    } else if (moduloOrigen === 3) {
      const detMovConsumo =
        await prisma.detMovsEntRendirPescaConsumo.findUnique({
          where: { id: origenId },
        });

      if (!detMovConsumo) {
        throw new ValidationError(
          "La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntRendirPescaConsumo",
        );
      }

      await prisma.detMovsEntRendirPescaConsumo.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          entidadComercialId: movimiento.entidadComercialId,
          monedaId: movimiento.monedaId,
          operacionSinFactura: movimiento.operacionSinFactura,
          actualizadoEn: fechaActual,
        },
      });
    } else if (moduloOrigen === 4) {
      const detMovCompras =
        await prisma.detMovsEntregaRendirPCompras.findUnique({
          where: { id: origenId },
        });

      if (!detMovCompras) {
        throw new ValidationError(
          "La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntregaRendirPCompras",
        );
      }

      await prisma.detMovsEntregaRendirPCompras.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          operacionSinFactura: movimiento.operacionSinFactura,
          urlComprobanteOperacionMovCaja:
            movimiento.urlComprobanteOperacionMovCaja,
          urlComprobanteMovimiento: movimiento.urlDocumentoMovCaja,
          actualizadoEn: fechaActual,
        },
      });
    } else if (moduloOrigen === 5) {
      const detMovVentas = await prisma.detMovsEntregaRendirPVentas.findUnique({
        where: { id: origenId },
      });

      if (!detMovVentas) {
        throw new ValidationError(
          "La operación de Movimiento de Caja No encuentra el Origen de la Operación en DetMovsEntregaRendirPVentas",
        );
      }

      await prisma.detMovsEntregaRendirPVentas.update({
        where: { id: origenId },
        data: {
          validadoTesoreria: true,
          fechaValidacionTesoreria: fechaActual,
          fechaOperacionMovCaja: movimiento.fechaOperacionMovCaja,
          operacionMovCajaId: movimiento.id,
          operacionSinFactura: movimiento.operacionSinFactura,
          urlComprobanteOperacionMovCaja:
            movimiento.urlComprobanteOperacionMovCaja,
          urlComprobanteMovimiento: movimiento.urlDocumentoMovCaja,
          fechaActualizacion: fechaActual,
        },
      });
    } else if (moduloOrigen === null || moduloOrigen === 0) {
    } else {
      throw new ValidationError(`Módulo origen no soportado: ${moduloOrigen}`);
    }

    // ========================================
    // ✅ GENERAR NUEVOS SALDOS
    // ========================================
    const saldosGenerados = await actualizarSaldosCuentasCorrientes(
      movimientoActualizado,
    );

    return {
      movimiento: movimientoActualizado,
      saldosGenerados,
    };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code === "P2025") throw new NotFoundError("Registro no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const aprobar = async (id, aprobadoPorId) => {
  try {
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id },
    });
    if (!movimiento)
      throw new NotFoundError("Movimiento de caja no encontrado");

    if (movimiento.aprobadoPorId) {
      throw new ValidationError("El movimiento ya fue aprobado anteriormente");
    }

    if (movimiento.rechazadoPorId) {
      throw new ValidationError("No se puede aprobar un movimiento rechazado");
    }

    const actualizado = await prisma.movimientoCaja.update({
      where: { id },
      data: {
        aprobadoPorId,
        fechaAprobacion: new Date(),
        fechaActualizacion: new Date(),
      },
      include: incluirRelaciones,
    });

    return actualizado;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Movimiento de caja no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const rechazar = async (id, rechazadoPorId, motivoRechazo) => {
  try {
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id },
    });
    if (!movimiento)
      throw new NotFoundError("Movimiento de caja no encontrado");

    if (movimiento.aprobadoPorId) {
      throw new ValidationError(
        "No se puede rechazar un movimiento ya aprobado",
      );
    }

    if (!motivoRechazo || motivoRechazo.trim() === "") {
      throw new ValidationError("El motivo de rechazo es obligatorio");
    }

    const actualizado = await prisma.movimientoCaja.update({
      where: { id },
      data: {
        rechazadoPorId,
        fechaRechazo: new Date(),
        motivoRechazo: motivoRechazo.trim(),
        fechaActualizacion: new Date(),
      },
      include: incluirRelaciones,
    });

    return actualizado;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Movimiento de caja no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const revertir = async (id, motivoReversion, usuarioId) => {
  try {
    const movimientoOriginal = await prisma.movimientoCaja.findUnique({
      where: { id },
      include: incluirRelaciones,
    });

    if (!movimientoOriginal)
      throw new NotFoundError("Movimiento de caja no encontrado");

    const yaRevertido = await prisma.movimientoCaja.findFirst({
      where: {
        movimientoRevertidoId: id,
        esReversion: true,
      },
    });

    if (yaRevertido) {
      throw new ValidationError(
        "Este movimiento ya fue revertido anteriormente",
      );
    }

    if (!motivoReversion || motivoReversion.trim() === "") {
      throw new ValidationError("El motivo de reversión es obligatorio");
    }

    const datosReversion = {
      empresaId: movimientoOriginal.empresaId,
      tipoMovimientoId: movimientoOriginal.tipoMovimientoId,
      entidadComercialId: movimientoOriginal.entidadComercialId,
      monto: movimientoOriginal.monto,
      monedaId: movimientoOriginal.monedaId,
      descripcion: `REVERSIÓN: ${movimientoOriginal.descripcion || ""}`,
      cuentaCorrienteOrigenId:
        movimientoOriginal.cuentaCorrienteDestinoId ||
        movimientoOriginal.cuentaCorrienteOrigenId,
      cuentaCorrienteDestinoId: movimientoOriginal.cuentaCorrienteOrigenId,
      estadoId: movimientoOriginal.estadoId,
      centroCostoId: movimientoOriginal.centroCostoId,
      usuarioId,
      esReversion: true,
      movimientoRevertidoId: id,
      motivoReversion: motivoReversion.trim(),
      fechaOperacionMovCaja: new Date(),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    };

    const movimientoReversion = await prisma.movimientoCaja.create({
      data: datosReversion,
      include: incluirRelaciones,
    });

    await actualizarSaldosCuentasCorrientes(movimientoReversion);
    return movimientoReversion;
  } catch (err) {
    if (err.code === "P2025")
      throw new NotFoundError("Movimiento de caja no encontrado");
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Listar movimientos con filtros avanzados para vista de Tesorería
 * @param {Object} filtros - Filtros opcionales
 * @param {Number} filtros.empresaId - ID de empresa
 * @param {String} filtros.origen - 'CXC' | 'CXP' | 'TRANSFERENCIA' | 'OTRO'
 * @param {Number} filtros.cuentaCorrienteId - ID de cuenta corriente (origen o destino)
 * @param {Date} filtros.fechaDesde - Fecha desde
 * @param {Date} filtros.fechaHasta - Fecha hasta
 * @param {Number} filtros.estadoId - ID de estado
 * @param {Number} filtros.limite - Cantidad de registros (default: 100)
 * @param {Number} filtros.pagina - Página actual (default: 1)
 * @returns {Object} Movimientos paginados con metadata
 */
const listarConFiltrosAvanzados = async (filtros = {}) => {
  try {
    const {
      empresaId,
      origen,
      cuentaCorrienteId,
      fechaDesde,
      fechaHasta,
      estadoId,
      limite = 100,
      pagina = 1,
    } = filtros;

    // ========================================
    // CONSTRUIR WHERE
    // ========================================
    const where = {};

    if (empresaId) {
      where.empresaId = Number(empresaId);
    }

    if (cuentaCorrienteId) {
      where.OR = [
        { cuentaCorrienteOrigenId: Number(cuentaCorrienteId) },
        { cuentaCorrienteDestinoId: Number(cuentaCorrienteId) },
      ];
    }

    if (estadoId) {
      where.estadoId = Number(estadoId);
    }

    // Filtro por fecha
    if (fechaDesde || fechaHasta) {
      where.fechaOperacionMovCaja = {};
      if (fechaDesde) {
        where.fechaOperacionMovCaja.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        where.fechaOperacionMovCaja.lte = new Date(fechaHasta);
      }
    }

    // Filtro por origen (basado en relaciones)
    if (origen === "CXC") {
      where.pagosCuentaPorCobrar = {
        some: {},
      };
    } else if (origen === "CXP") {
      where.pagosCuentaPorPagar = {
        some: {},
      };
    } else if (origen === "TRANSFERENCIA") {
      where.tipoMovimiento = {
        esTransferencia: true,
      };
    }

    // ========================================
    // PAGINACIÓN
    // ========================================
    const skip = (pagina - 1) * limite;

    // Contar total
    const total = await prisma.movimientoCaja.count({ where });

    // Consultar movimientos
    const movimientos = await prisma.movimientoCaja.findMany({
      where,
      include: incluirRelaciones,
      orderBy: {
        fechaOperacionMovCaja: "desc",
      },
      skip,
      take: limite,
    });

    return {
      data: movimientos,
      metadata: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar movimientos con filtros avanzados",
        err.message,
      );
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
  validarMovimiento,
  aprobar,
  rechazar,
  revertir,
  listarConFiltrosAvanzados, // ✅ AGREGAR ESTA LÍNEA
  crearMovimientoCajaDesdeTesoreria,  // ✅ NUEVA FUNCIÓN
  actualizarSaldosCuentasCorrientes,  // ✅ EXPORTAR EXISTENTE
  ORIGENES_MOVIMIENTO_TESORERIA,  // ✅ EXPORTAR CONSTANTES
};
