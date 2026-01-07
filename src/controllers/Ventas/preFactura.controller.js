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
    await preFacturaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
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
        empresaId: BigInt(empresaId),
        tipoDocumentoId: BigInt(tipoDocumentoId),
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