import precioEntidadService from '../../services/Maestros/precioEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para PrecioEntidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const precios = await precioEntidadService.listar();
    res.json(toJSONBigInt(precios));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const precios = await precioEntidadService.obtenerPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(precios));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPrecioEspecialActivo(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const productoId = Number(req.params.productoId);
    const precio = await precioEntidadService.obtenerPrecioEspecialActivo(entidadComercialId, productoId);
    res.json(toJSONBigInt(precio));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const precio = await precioEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(precio));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await precioEntidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await precioEntidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await precioEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}


/**
 * Obtiene el precio vigente para un producto en una fecha específica
 * Busca primero precio especial del cliente, luego precio global de la empresa
 */
export async function obtenerPrecioVigente(req, res, next) {
  try {
    const { empresaId, empresaEntidadComercialId, especieId, clienteId, fechaDescarga } = req.query;

    // Validar parámetros requeridos
    if (!empresaId || !empresaEntidadComercialId || !especieId || !fechaDescarga) {
      return res.status(400).json({
        message: 'Faltan parámetros requeridos: empresaId, empresaEntidadComercialId, especieId, fechaDescarga'
      });
    }

    const resultado = await precioEntidadService.obtenerPrecioVigente(
      Number(empresaId),
      Number(empresaEntidadComercialId),
      Number(especieId),
      clienteId ? Number(clienteId) : null,
      new Date(fechaDescarga)
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
};



/**
 * Obtiene el precio de venta vigente para un producto en PreFactura
 * Query params: productoId, clienteId (opcional), empresaEntidadComercialId, fechaDocumento
 */
export async function obtenerPrecioVentaVigente(req, res, next) {
  try {
    const { productoId, clienteId, empresaEntidadComercialId, fechaDocumento } = req.query;

    if (!productoId || !empresaEntidadComercialId || !fechaDocumento) {
      return res.status(400).json({
        error: 'productoId, empresaEntidadComercialId y fechaDocumento son obligatorios',
      });
    }

    const resultado = await precioEntidadService.obtenerPrecioVentaVigente(
      Number(productoId),
      clienteId ? Number(clienteId) : null,
      Number(empresaEntidadComercialId),
      fechaDocumento,
    );

    res.json(toJSONBigInt(resultado));
  } catch (error) {
    next(error);
  }
}


/**
 * Obtiene precio de combustible vigente
 * @route GET /api/precios-entidad/combustible
 * @param {string} req.query.entidadComercialId - ID de la entidad comercial
 * @param {string} req.query.fechaReferencia - Fecha de referencia ISO
 */
export async function obtenerPrecioCombustibleVigente(req, res, next) {
  try {
    const { entidadComercialId, fechaReferencia } = req.query;

    // Validar parámetros requeridos
    if (!entidadComercialId) {
      return res.status(400).json({
        error: 'El parámetro entidadComercialId es requerido'
      });
    }

    if (!fechaReferencia) {
      return res.status(400).json({
        error: 'El parámetro fechaReferencia es requerido'
      });
    }

    const precio = await precioEntidadService.obtenerPrecioCombustibleVigente(
      entidadComercialId,
      fechaReferencia
    );

    if (!precio) {
      return res.status(404).json({
        error: 'No se encontró precio de combustible vigente'
      });
    }

    res.json(toJSONBigInt(precio));
  } catch (err) {
    console.error('Error en obtenerPrecioCombustibleVigente controller:', err);
    next(err);
  }
}