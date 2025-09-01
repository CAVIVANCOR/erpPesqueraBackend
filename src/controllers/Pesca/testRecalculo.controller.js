import testRecalculoService from '../../services/Pesca/testRecalculo.service.js';

/**
 * Controlador para probar y verificar los cálculos de toneladas
 */

/**
 * GET /api/test-recalculo/verificar
 * Verifica que los cálculos de toneladas estén funcionando correctamente
 */
const verificarCalculos = async (req, res) => {
  try {
    const resultado = await testRecalculoService.verificarCalculosCompletos();
    
    res.status(200).json({
      message: 'Verificación de cálculos completada',
      data: resultado
    });
  } catch (error) {
    console.error('Error en verificación de cálculos:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * GET /api/test-recalculo/muestra
 * Obtiene una muestra de datos para verificar
 */
const obtenerMuestra = async (req, res) => {
  try {
    const muestra = await testRecalculoService.obtenerMuestraDatos();
    
    if (!muestra) {
      return res.status(404).json({
        message: 'No se encontraron datos para verificar'
      });
    }
    
    res.status(200).json({
      message: 'Muestra de datos obtenida exitosamente',
      data: muestra
    });
  } catch (error) {
    console.error('Error obteniendo muestra:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * GET /api/test-recalculo/cala/:id
 * Verifica los datos de una cala específica
 */
const verificarCala = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await testRecalculoService.verificarDatosCala(id);
    
    if (!resultado) {
      return res.status(404).json({
        message: `Cala ${id} no encontrada`
      });
    }
    
    res.status(200).json({
      message: `Verificación de Cala ${id} completada`,
      data: resultado
    });
  } catch (error) {
    console.error('Error verificando cala:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * GET /api/test-recalculo/faena/:id
 * Verifica los datos de una faena específica
 */
const verificarFaena = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await testRecalculoService.verificarDatosFaena(id);
    
    if (!resultado) {
      return res.status(404).json({
        message: `Faena ${id} no encontrada`
      });
    }
    
    res.status(200).json({
      message: `Verificación de Faena ${id} completada`,
      data: resultado
    });
  } catch (error) {
    console.error('Error verificando faena:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

export default {
  verificarCalculos,
  obtenerMuestra,
  verificarCala,
  verificarFaena
};
