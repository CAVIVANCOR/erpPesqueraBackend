import descargaFaenaPescaService from '../../services/Pesca/descargaFaenaPesca.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DescargaFaenaPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const descargas = await descargaFaenaPescaService.listar();
    res.json(toJSONBigInt(descargas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const descarga = await descargaFaenaPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(descarga));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorFaena(req, res, next) {
  try {
    const faenaPescaId = req.params.faenaPescaId;
    
    // Validar que el parámetro existe y es un número válido
    if (!faenaPescaId || isNaN(faenaPescaId)) {
      return res.status(400).json({ 
        error: 'faenaPescaId es requerido y debe ser un número válido' 
      });
    }
    
    const faenaPescaIdBigInt = BigInt(faenaPescaId);
    const descargas = await descargaFaenaPescaService.obtenerPorFaena(faenaPescaIdBigInt);
    res.json(toJSONBigInt(descargas));
  } catch (err) {
    console.error('Error en obtenerPorFaena controller:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await descargaFaenaPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await descargaFaenaPescaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await descargaFaenaPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
