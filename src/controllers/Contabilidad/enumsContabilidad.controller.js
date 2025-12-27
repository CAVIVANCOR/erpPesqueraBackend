/**
 * Controlador para obtener enums de contabilidad
 * Documentado en español.
 */

/**
 * Obtiene todos los enums utilizados en el módulo de contabilidad
 */
export async function obtenerEnumsContabilidad(req, res, next) {
  try {
    const enums = {
      nivelesCuenta: [
        { label: 'CLASE', value: 'CLASE' },
        { label: 'CUENTA', value: 'CUENTA' },
        { label: 'SUBCUENTA', value: 'SUBCUENTA' },
        { label: 'DIVISIONARIA', value: 'DIVISIONARIA' },
        { label: 'SUBDIVISIONARIA', value: 'SUBDIVISIONARIA' }
      ],
      naturalezasCuenta: [
        { label: 'DEUDORA', value: 'DEUDORA' },
        { label: 'ACREEDORA', value: 'ACREEDORA' }
      ],
      tiposCuenta: [
        { label: 'ACTIVO', value: 'ACTIVO' },
        { label: 'PASIVO', value: 'PASIVO' },
        { label: 'PATRIMONIO', value: 'PATRIMONIO' },
        { label: 'INGRESO', value: 'INGRESO' },
        { label: 'GASTO', value: 'GASTO' }
      ]
    };

    res.json(enums);
  } catch (err) {
    next(err);
  }
}
