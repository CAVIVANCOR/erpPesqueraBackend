import otMantenimientoService from '../../services/Mantenimiento/otMantenimiento.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import prisma from '../../config/prismaClient.js';

/**
 * Controlador para OTMantenimiento
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const ots = await otMantenimientoService.listar();
    res.json(toJSONBigInt(ots));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const ot = await otMantenimientoService.obtenerPorId(id);
    res.json(toJSONBigInt(ot));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await otMantenimientoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await otMantenimientoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await otMantenimientoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function getSeriesDoc(req, res, next) {
  try {
    const { empresaId, tipoDocumentoId } = req.query;
    
    const where = {
      activo: true,
      ...(empresaId && { empresaId: BigInt(empresaId) }),
      ...(tipoDocumentoId && { tipoDocumentoId: BigInt(tipoDocumentoId) })
    };

    const series = await prisma.serieDoc.findMany({
      where,
      orderBy: { serie: 'asc' }
    });

    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}
