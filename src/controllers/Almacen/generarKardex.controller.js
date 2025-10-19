// src/controllers/Almacen/generarKardex.controller.js
import generarKardexService from '../../services/Almacen/generarKardex.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Genera Kardex completo para un MovimientoAlmacen
 * POST /api/generar-kardex/:movimientoAlmacenId
 */
export const generarKardex = async (req, res, next) => {
  try {
    const { movimientoAlmacenId } = req.params;
    const resultado = await generarKardexService.generarKardexMovimiento(BigInt(movimientoAlmacenId));
    
    res.status(200).json({
      success: true,
      message: 'Kardex generado exitosamente',
      data: toJSONBigInt(resultado)
    });
  } catch (error) {
    next(error);
  }
};