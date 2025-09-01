import recalcularToneladasService from '../../services/Pesca/recalcularToneladas.service.js';

/**
 * Controlador para recalcular toneladas por registro específico
 */

/**
 * POST /api/recalcular-toneladas/cala/:id
 * Recalcula toneladas de una cala específica
 */
const recalcularCala = async (req, res) => {
  try {
    const { id } = req.params;
    const toneladas = await recalcularToneladasService.recalcularToneladasCala(id);
    
    res.status(200).json({
      message: `Toneladas de Cala ${id} recalculadas exitosamente`,
      data: { calaId: id, toneladas }
    });
  } catch (error) {
    console.error('Error recalculando cala:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * POST /api/recalcular-toneladas/faena/:id
 * Recalcula toneladas de una faena específica
 */
const recalcularFaena = async (req, res) => {
  try {
    const { id } = req.params;
    const toneladas = await recalcularToneladasService.recalcularToneladasFaena(id);
    
    res.status(200).json({
      message: `Toneladas de Faena ${id} recalculadas exitosamente`,
      data: { faenaId: id, toneladas }
    });
  } catch (error) {
    console.error('Error recalculando faena:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * POST /api/recalcular-toneladas/temporada/:id
 * Recalcula toneladas de una temporada específica
 */
const recalcularTemporada = async (req, res) => {
  try {
    const { id } = req.params;
    const toneladas = await recalcularToneladasService.recalcularToneladasTemporada(id);
    
    res.status(200).json({
      message: `Toneladas de Temporada ${id} recalculadas exitosamente`,
      data: { temporadaId: id, toneladas }
    });
  } catch (error) {
    console.error('Error recalculando temporada:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * POST /api/recalcular-toneladas/cascada-cala/:id
 * Recalcula en cascada desde una cala hacia arriba
 */
const recalcularCascadaCala = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await recalcularToneladasService.recalcularCascadaDesdeCala(id);
    
    res.status(200).json({
      message: `Recálculo en cascada desde Cala ${id} completado exitosamente`,
      data: resultado
    });
  } catch (error) {
    console.error('Error en recálculo cascada desde cala:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * POST /api/recalcular-toneladas/cascada-faena/:id
 * Recalcula en cascada desde una faena hacia arriba
 */
const recalcularCascadaFaena = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await recalcularToneladasService.recalcularCascadaDesdeFaena(id);
    
    res.status(200).json({
      message: `Recálculo en cascada desde Faena ${id} completado exitosamente`,
      data: resultado
    });
  } catch (error) {
    console.error('Error en recálculo cascada desde faena:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

export default {
  recalcularCala,
  recalcularFaena,
  recalcularTemporada,
  recalcularCascadaCala,
  recalcularCascadaFaena
};
