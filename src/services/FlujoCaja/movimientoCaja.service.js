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
  empresaDestino: {
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
      empresaOrigenId,
      empresaDestinoId,
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

    if (cuentaCorrienteDestinoId && empresaDestinoId) {
      const ultimoSaldoDestino = await prisma.saldoCuentaCorriente.findFirst({
        where: { cuentaCorrienteId: cuentaCorrienteDestinoId },
        orderBy: { fecha: "desc" },
      });

      const saldoAnteriorDestino = ultimoSaldoDestino
        ? Number(ultimoSaldoDestino.saldoActual)
        : 0;
      const montoDecimal = Number(monto);

      const saldoDestino = await prisma.saldoCuentaCorriente.create({
        data: {
          cuentaCorrienteId: cuentaCorrienteDestinoId,
          empresaId: empresaDestinoId,
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
    empresaOrigenId,
    empresaDestinoId,
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

  if (tipoMov.esTransferencia) {
    if (!empresaOrigenId || !empresaDestinoId) {
      throw new ValidationError(
        "Las transferencias requieren empresa origen Y empresa destino",
      );
    }
    const empresaOrigen = await prisma.empresa.findUnique({
      where: { id: empresaOrigenId },
    });
    if (!empresaOrigen)
      throw new ValidationError("Empresa origen no existente");

    const empresaDestino = await prisma.empresa.findUnique({
      where: { id: empresaDestinoId },
    });
    if (!empresaDestino)
      throw new ValidationError("Empresa destino no existente");
  } else if (tipoMov.esIngreso) {
    if (!empresaDestinoId) {
      throw new ValidationError("Los ingresos requieren empresa destino");
    }
    if (empresaOrigenId) {
      throw new ValidationError("Los ingresos no deben tener empresa origen");
    }
    const empresaDestino = await prisma.empresa.findUnique({
      where: { id: empresaDestinoId },
    });
    if (!empresaDestino)
      throw new ValidationError("Empresa destino no existente");
  } else {
    if (!empresaOrigenId) {
      throw new ValidationError("Los egresos requieren empresa origen");
    }
    if (empresaDestinoId) {
      throw new ValidationError("Los egresos no deben tener empresa destino");
    }
    const empresaOrigen = await prisma.empresa.findUnique({
      where: { id: empresaOrigenId },
    });
    if (!empresaOrigen)
      throw new ValidationError("Empresa origen no existente");
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
      data.estadoId = BigInt(20);
    }

    const moduloOrigen = data.moduloOrigenMotivoOperacionId
      ? Number(data.moduloOrigenMotivoOperacionId)
      : null;
    const origenId = data.origenMotivoOperacionId;

    let movimientoCreado;

    if (moduloOrigen === 2 && origenId) {
      const detMov = await prisma.detMovsEntregaRendir.findUnique({
        where: { id: BigInt(origenId) },
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
          where: { id: BigInt(origenId) },
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
        estadoId: BigInt(21),
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
      empresaOrigenId:
        movimientoOriginal.empresaDestinoId ||
        movimientoOriginal.empresaOrigenId,
      empresaDestinoId: movimientoOriginal.empresaOrigenId,
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
};
