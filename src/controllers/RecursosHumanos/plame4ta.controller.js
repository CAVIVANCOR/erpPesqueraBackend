import plame4taService from '../../services/RecursosHumanos/plame4ta.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listarRecibos(req, res, next) {
  try {
    res.json(toJSONBigInt(await plame4taService.listarRecibos(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function generarArchivos(req, res, next) {
  try {
    res.json(toJSONBigInt(await plame4taService.generarArchivos(req.query)));
  } catch (err) {
    next(err);
  }
}
