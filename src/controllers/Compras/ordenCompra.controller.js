import ordenCompraService from '../../services/Compras/ordenCompra.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para OrdenCompra
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const ordenes = await ordenCompraService.listar();
    res.json(toJSONBigInt(ordenes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orden = await ordenCompraService.obtenerPorId(id);
    res.json(toJSONBigInt(orden));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await ordenCompraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await ordenCompraService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id ? BigInt(req.user.id) : null;
    const resultado = await ordenCompraService.eliminar(id, usuarioId);
    res.status(200).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Aprueba una orden de compra
 */
export async function aprobar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const aprobado = await ordenCompraService.aprobar(id);
    res.json(toJSONBigInt(aprobado));
  } catch (err) {
    next(err);
  }
}

/**
 * Anula una orden de compra
 */
export async function anular(req, res, next) {
  try {
    const id = Number(req.params.id);
    const anulado = await ordenCompraService.anular(id);
    res.json(toJSONBigInt(anulado));
  } catch (err) {
    next(err);
  }
}


/**
 * Reactivar Orden de Compra
 * PUT /api/ordenes-compra/:id/reactivar
 */
export async function reactivarDocumentoOrdenCompra(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id;

    const resultado = await ordenCompraService.reactivarDocumentoOrdenCompra(
      id,
      usuarioId ? Number(usuarioId) : null
    );

    res.status(200).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}


/**
 * Genera un MovimientoAlmacen desde una Orden de Compra aprobada
 */
export async function generarMovimiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id;
    const datosKardex = req.body;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const resultado = await ordenCompraService.generarKardex(
      id,
      datosKardex,
      Number(usuarioId)
    );
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Genera el kardex (movimiento de almacén) desde una Orden de Compra aprobada
 */
export async function generarKardex(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const resultado = await ordenCompraService.generarKardex(id, Number(usuarioId));
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Genera una Orden de Compra desde un Requerimiento aprobado
 */
export async function generarDesdeRequerimiento(req, res, next) {
  try {
    const { requerimientoCompraId } = req.body;
    const orden = await ordenCompraService.generarDesdeRequerimiento(requerimientoCompraId);
    res.status(201).json(toJSONBigInt(orden));
  } catch (err) {
    next(err);
  }
}

export const regenerarKardex = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const resultado = await ordenCompraService.regenerarKardex(
      Number(id),
      Number(usuarioId)
    );

    res.json(toJSONBigInt(resultado));
  } catch (error) {
    next(error);
  }
};

/**
 * Particionar OrdenCompra: Clona en DOS copias idénticas con estado PENDIENTE
 * PUT /api/ordenes-compra/:id/partir
 */
export async function partirOrdenCompra(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await ordenCompraService.partirOrdenCompra(id);

    res.status(200).json(toJSONBigInt({
      success: true,
      mensaje: resultado.mensaje,
      data: resultado
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Generar CuentaPorPagar desde OrdenCompra
 * POST /api/ordenes-compra/:id/generar-cxp
 */
export async function generarCuentaPorPagar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await ordenCompraService.generarCuentaPorPagar(id);

    res.status(200).json(toJSONBigInt({
      success: true,
      mensaje: resultado.mensaje,
      data: resultado
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Generar borrador de asiento contable para OrdenCompra
 * GET /api/ordenes-compra/:id/borrador-asiento
 */
export async function generarBorradorAsiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const borrador = await ordenCompraService.generarBorradorAsiento(id);

    res.status(200).json(toJSONBigInt({
      success: true,
      data: borrador
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Guardar asiento contable editado para OrdenCompra
 * POST /api/ordenes-compra/:id/guardar-asiento
 */
export async function guardarAsientoContable(req, res, next) {
  try {
    const id = Number(req.params.id);
    // Extraer asientoData correctamente
    let asientoData = req.body.asientoData || req.body;

    // Si viene envuelto en { success: true, data: {...} }, extraer data
    if (asientoData.success && asientoData.data) {
      asientoData = asientoData.data;
    }
    const creadoPor = req.usuario?.id ? Number(req.usuario.id) : null;

    const asiento = await ordenCompraService.guardarAsientoContable(
      id,
      asientoData,
      creadoPor
    );

    res.status(200).json(toJSONBigInt({
      success: true,
      mensaje: "Asiento contable guardado exitosamente",
      data: asiento
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar asiento contable de OrdenCompra
 * DELETE /api/ordenes-compra/asiento/:asientoId
 */
export async function eliminarAsientoContable(req, res, next) {
  try {
    const asientoId = Number(req.params.asientoId);
    await ordenCompraService.eliminarAsientoContable(asientoId);

    res.status(200).json(toJSONBigInt({
      success: true,
      mensaje: "Asiento contable eliminado exitosamente"
    }));
  } catch (err) {
    next(err);
  }
}


export async function asignarCentroCostoMasivo(req, res, next) {
  try {
    const { centroCostoId, ordenesIds } = req.body;

    if (!centroCostoId || !ordenesIds || !Array.isArray(ordenesIds) || ordenesIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "centroCostoId y ordenesIds son requeridos"
      });
    }

    const resultado = await ordenCompraService.asignarCentroCostoMasivo(centroCostoId, ordenesIds);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}