import prestamoBancarioService from '../../services/Tesoreria/prestamoBancario.service.js';
import cuotaPrestamoService from '../../services/Tesoreria/cuotaPrestamo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
/**
 * Controlador para PrestamoBancario
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const prestamos = await prestamoBancarioService.listar();
    res.json(toJSONBigInt(prestamos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const prestamo = await prestamoBancarioService.obtenerPorId(id);
    res.json(toJSONBigInt(prestamo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await prestamoBancarioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await prestamoBancarioService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prestamoBancarioService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const prestamos = await prestamoBancarioService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(prestamos));
  } catch (err) {
    next(err);
  }
}

export async function listarVigentes(req, res, next) {
  try {
    const prestamos = await prestamoBancarioService.listarVigentes();
    res.json(toJSONBigInt(prestamos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerCronograma(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cronograma = await prestamoBancarioService.obtenerCronograma(id);
    res.json(toJSONBigInt(cronograma));
  } catch (err) {
    next(err);
  }
}

export async function recalcularCuotas(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await cuotaPrestamoService.recalcularCuotasPorPrestamo(id);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista préstamos bancarios por sublínea de crédito.
 */
export async function listarPorSublinea(req, res, next){
  try {
    const { sublineaCreditoId } = req.params;
    const prestamos = await prestamoBancarioService.listarPorSublinea(
      BigInt(sublineaCreditoId)
    );
    res.json(toJSONBigInt(prestamos));
  } catch (err) {
    next(err);
  }
}

export const obtenerPrestamosDisponiblesParaSublinea = async (req, res, next) => {
  try {
    const { lineaCreditoId, tipoPrestamoId } = req.query;
    
    if (!lineaCreditoId || !tipoPrestamoId) {
      return res.status(400).json({ 
        message: 'Se requieren lineaCreditoId y tipoPrestamoId' 
      });
    }

    const prestamos = await prestamoBancarioService.obtenerDisponiblesParaSublinea(
      BigInt(lineaCreditoId),
      BigInt(tipoPrestamoId)
    );
    
    res.json(toJSONBigInt(prestamos));  // CORRECTO - Serializa BigInt
  } catch (error) {
    next(error);
  }
};

export async function asignarPrestamoASublinea(req, res, next){
  try {
    const { id } = req.params;
    const { sublineaCreditoId } = req.body;
    
    const prestamo = await prestamoBancarioService.asignarASublinea(
      BigInt(id),
      BigInt(sublineaCreditoId)
    );
    
    res.json(toJSONBigInt(prestamo));
  } catch (error) {
    next(error);
  }
};

export async function desvincularPrestamoDeSublinea(req, res, next){
  try {
    const { id } = req.params;
    
    const prestamo = await prestamoBancarioService.desvincularDeSublinea(BigInt(id));
    
    res.json(toJSONBigInt(prestamo));
  } catch (error) {
    next(error);
  }
};