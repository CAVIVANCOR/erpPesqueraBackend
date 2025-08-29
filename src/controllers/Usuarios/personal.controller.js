import personalService from '../../services/Usuarios/personal.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Personal
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const { empresaId, esVendedor } = req.query;
    const filtros = {};
    
    if (empresaId) {
      filtros.empresaId = Number(empresaId);
    }
    
    if (esVendedor !== undefined) {
      filtros.esVendedor = esVendedor === 'true';
    }
    
    const personal = await personalService.listar(filtros);
    res.json(toJSONBigInt(personal));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const persona = await personalService.obtenerPorId(id);
    res.json(toJSONBigInt(persona));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await personalService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await personalService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await personalService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista personal con cargo "BAHIA COMERCIAL" filtrado por empresa
 */
export async function listarPersonalxDescripCargo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const descripcionCargo = req.params.descripcionCargo;
    const personal = await personalService.listarPersonalxDescripCargo(empresaId,descripcionCargo);
    res.json(toJSONBigInt(personal));
  } catch (err) {
    next(err);
  }
}
