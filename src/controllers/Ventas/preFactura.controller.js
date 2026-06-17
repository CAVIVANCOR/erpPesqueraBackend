import preFacturaService from '../../services/Ventas/preFactura.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import prisma from '../../config/prismaClient.js';

/**
 * Controlador para PreFactura
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const pfs = await preFacturaService.listar();
    res.json(toJSONBigInt(pfs));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pf = await preFacturaService.obtenerPorId(id);
    res.json(toJSONBigInt(pf));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await preFacturaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await preFacturaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {

  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id ? Number(req.user.id) : null;

    if (!usuarioId) {
      return res.status(401).json({
        error: "Usuario no autenticado"
      });
    }

    const resultado = await preFacturaService.eliminar(id, usuarioId);

    const response = toJSONBigInt({
      success: resultado.success,
      mensaje: resultado.mensaje,
      resultados: resultado.resultados
    });

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function aprobar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const aprobada = await preFacturaService.aprobar(id);
    res.json(toJSONBigInt(aprobada));
  } catch (err) {
    next(err);
  }
}

export async function anular(req, res, next) {
  try {
    const id = Number(req.params.id);
    const anulada = await preFacturaService.anular(id);
    res.json(toJSONBigInt(anulada));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene series de documentos filtradas
 * Query params: empresaId, tipoDocumentoId
 */
export async function obtenerSeriesDoc(req, res, next) {
  try {
    const { empresaId, tipoDocumentoId } = req.query;

    if (!empresaId || !tipoDocumentoId) {
      return res.status(400).json({
        error: 'Parámetros faltantes',
        mensaje: 'Se requieren empresaId y tipoDocumentoId'
      });
    }

    const series = await prisma.serieDoc.findMany({
      where: {
        empresaId: Number(empresaId),
        tipoDocumentoId: Number(tipoDocumentoId),
        activo: true
      },
      orderBy: { serie: 'asc' }
    });

    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}

/**
 * ========================================
 * CONTROLADORES DE GENERACIÓN DE COMPROBANTES
 * ========================================
 */

/**
 * Genera una Factura Electrónica desde una PreFactura
 * POST /api/prefactura/:id/generar-factura
 */
export async function generarFactura(req, res, next) {
  try {
    const preFacturaId = Number(req.params.id);
    const datosFactura = req.body;

    const comprobante = await preFacturaService.generarFacturaDesdePreFactura(preFacturaId, datosFactura);

    res.status(201).json(toJSONBigInt({
      success: true,
      mensaje: 'Factura generada exitosamente',
      comprobante
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Genera una Boleta Electrónica desde una PreFactura
 * POST /api/prefactura/:id/generar-boleta
 */
export async function generarBoleta(req, res, next) {
  try {
    const preFacturaId = Number(req.params.id);
    const datosBoleta = req.body;

    const comprobante = await preFacturaService.generarBoletaDesdePreFactura(preFacturaId, datosBoleta);

    res.status(201).json(toJSONBigInt({
      success: true,
      mensaje: 'Boleta generada exitosamente',
      comprobante
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Particionar PreFactura: Clona en DOS copias idénticas con estado PENDIENTE
 * PUT /api/pre-facturas/:id/partir
 */
export async function partirPreFactura(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await preFacturaService.partirPreFactura(id);

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
 * Facturar PreFactura Negra (Gerencial)
 * POST /api/prefactura/:id/facturar-negra
 */
export async function facturarPreFacturaNegra(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await preFacturaService.facturarPreFacturaNegra(id);

    res.status(200).json(toJSONBigInt({
      success: true,
      mensaje: "CxC Negra (Gerencial) generada exitosamente",
      data: resultado
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Facturar PreFactura Blanca (SUNAT)
 * POST /api/prefactura/:id/facturar-blanca
 */
export async function facturarPreFacturaBlanca(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await preFacturaService.facturarPreFacturaBlanca(id);

    res.status(200).json(toJSONBigInt({
      success: true,
      mensaje: "CxC Blanca y Comprobante Electrónico generados exitosamente",
      data: resultado
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Genera un borrador de asiento contable para una PreFactura
 * GET /api/pre-facturas/:id/borrador-asiento
 */
export async function generarBorradorAsiento(req, res, next) {
  try {
    const preFacturaId = Number(req.params.id);
    const borrador = await preFacturaService.generarBorradorAsiento(preFacturaId);
    res.json(toJSONBigInt(borrador));
  } catch (err) {
    console.error("🔴 [CONTROLLER] generarBorradorAsiento - ERROR:", err);
    next(err);
  }
}

/**
 * Guarda el asiento contable editado por el usuario
 * POST /api/pre-facturas/:id/guardar-asiento
 */
export async function guardarAsientoContable(req, res, next) {
  try {
    const preFacturaId = Number(req.params.id);
    const { asientoData } = req.body;
    const creadoPor = req.user?.id || null;

    const asiento = await preFacturaService.guardarAsientoContable(
      preFacturaId,
      asientoData,
      creadoPor,
    );

    res.status(201).json(toJSONBigInt(asiento));
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina un asiento contable específico
 * DELETE /api/pre-facturas/:id/asiento/:asientoId
 */
export async function eliminarAsientoContable(req, res, next) {
  try {
    const asientoId = Number(req.params.asientoId);
    await preFacturaService.eliminarAsientoContable(asientoId);
    res.status(200).json({
      success: true,
      message: "Asiento contable eliminado correctamente",
    });
  } catch (err) {
    next(err);
  }
}



/**
 * Genera un MovimientoAlmacen desde una PreFactura aprobada
 */
export async function generarMovimiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id;
    const datosKardex = req.body;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const resultado = await preFacturaService.generarKardex(
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
 * Regenera el kardex de una PreFactura
 * Elimina el movimiento existente y crea uno nuevo
 */
export const regenerarKardex = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const resultado = await preFacturaService.regenerarKardex(
      Number(id),
      Number(usuarioId)
    );

    res.json(toJSONBigInt(resultado));
  } catch (error) {
    next(error);
  }
};

// Obtener PreFacturas por empresa, cliente y fecha límite
export const obtenerPreFacturasPorCliente = async (req, res, next) => {
  try {
    const { empresaId, clienteId, fechaLimite } = req.query;

    const where = {
      tipoDocumentoId: {
        notIn: [8, 9]
      }
    };

    if (empresaId) {
      where.empresaId = Number(empresaId);
    }

    if (clienteId) {
      where.clienteId = Number(clienteId);
    }

    if (fechaLimite) {
      where.fechaDocumento = {
        lte: new Date(fechaLimite),
      };
    }

    const preFacturas = await preFacturaService.obtenerTodos(where);
    res.json(toJSONBigInt(preFacturas));
  } catch (err) {
    next(err);
  }
};