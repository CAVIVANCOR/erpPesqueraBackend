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
    console.log('📅 BACKEND - Datos recibidos:', {
      id,
      cesado: req.body.cesado,
      fechaCese: req.body.fechaCese,
      fechaIngreso: req.body.fechaIngreso
    });
    const actualizado = await personalService.actualizar(id, req.body);
    console.log('📅 BACKEND - Datos guardados:', {
      id: actualizado.id,
      cesado: actualizado.cesado,
      fechaCese: actualizado.fechaCese,
      fechaIngreso: actualizado.fechaIngreso
    });
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

/**
 * Busca personal por número de documento (DNI).
 * Si encuentra múltiples registros, retorna el que tiene marcaAsistencia = true.
 * Endpoint: GET /api/personal/buscar-por-dni/:dni
 */
export async function buscarPorDNI(req, res, next) {
  try {
    const { dni } = req.params;
    const personal = await personalService.buscarPorDNI(dni);
    
    if (!personal) {
      return res.status(404).json({ 
        encontrado: false, 
        mensaje: 'No se encontró personal con ese número de documento' 
      });
    }
    
    res.json(toJSONBigInt({ 
      encontrado: true, 
      personal 
    }));
  } catch (err) {
    next(err);
  }
}