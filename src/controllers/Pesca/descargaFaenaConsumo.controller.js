import descargaFaenaConsumoService from '../../services/Pesca/descargaFaenaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DescargaFaenaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const descargas = await descargaFaenaConsumoService.listar();
    res.json(toJSONBigInt(descargas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const descarga = await descargaFaenaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(descarga));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await descargaFaenaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await descargaFaenaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await descargaFaenaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Finaliza una descarga de consumo y genera automáticamente:
 * - Movimiento de INGRESO (De MEGUI a Almacén)
 * - Movimiento de SALIDA (De Almacén a Cliente)
 * - PreFactura (si existe precio configurado)
 * - Kardex para ambos movimientos
 */
export async function finalizarDescarga(req, res, next) {
  try {
    const descargaId = Number(req.params.id);
    const { novedadPescaConsumoId } = req.body;
    const usuarioId = req.user?.personalId ? BigInt(req.user.personalId) : null;

    // Importar el servicio de finalización
    const { default: finalizarDescargaConsumoService } = 
      await import('../../services/Pesca/finalizarDescargaConsumoConMovimientos.service.js');

    const resultado = await finalizarDescargaConsumoService.finalizarDescargaConsumoConMovimientos(
      descargaId,
      novedadPescaConsumoId,
      usuarioId
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
