// src/controllers/Almacen/generarKardex.controller.js
import generarKardexService from '../../services/Almacen/generarKardex.service.js';
import kardexSaldosSAPService from '../../services/Almacen/kardexSaldosSAP.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import prisma from '../../config/prismaClient.js';

/**
 * Controlador para Generación de Kardex
 * Documentado en español.
 */

/**
 * Genera Kardex completo para un MovimientoAlmacen
 */
export async function generarKardex(req, res, next) {
  try {
    const movimientoAlmacenId = BigInt(req.params.movimientoAlmacenId);
    const resultado = await generarKardexService.generarKardexMovimiento(movimientoAlmacenId);
    res.status(200).json(toJSONBigInt({
      success: true,
      message: 'Kardex generado exitosamente',
      data: resultado
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Regenera kardex y saldos usando sistema SAP
 * Elimina kardex anterior y recalcula todo desde cero
 */
export async function regenerarKardexSAP(req, res, next) {
  try {
    const movimientoId = BigInt(req.params.id);

    const resultado = await prisma.$transaction(async (tx) => {
      return await kardexSaldosSAPService.regenerarKardexYSaldosCompletoSAP(movimientoId, tx);
    });

    res.status(200).json(toJSONBigInt({
      success: true,
      mensaje: 'Kardex y saldos regenerados exitosamente usando sistema SAP',
      data: resultado
    }));
  } catch (err) {
    next(err);
  }
}