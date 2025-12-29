/**
 * Controlador para obtener enums de tesoreria
 * Documentado en español.
 */

/**
 * Obtiene todos los enums utilizados en el módulo de tesorería
 */
export async function obtenerEnumsTesoreria(req, res, next) {
  try {
    const enums = {
      tiposPrestamo: [
        { label: 'CAPITAL DE TRABAJO', value: 'CAPITAL_TRABAJO' },
        { label: 'ACTIVO FIJO', value: 'ACTIVO_FIJO' },
        { label: 'HIPOTECARIO', value: 'HIPOTECARIO' },
        { label: 'VEHICULAR', value: 'VEHICULAR' },
        { label: 'EQUIPAMIENTO', value: 'EQUIPAMIENTO' },
        { label: 'EXPANSION', value: 'EXPANSION' },
        { label: 'REFINANCIAMIENTO', value: 'REFINANCIAMIENTO' },
        { label: 'COMEX PRE-EMBARQUE', value: 'COMEX_PRE' },
        { label: 'COMEX POST-EMBARQUE', value: 'COMEX_POST' },
        { label: 'FINANCIAMIENTO ELECTRONICO COMPRAS', value: 'FEC' },
        { label: 'FACTORING', value: 'FACTORING' },
        { label: 'FACTORING INDIRECTO', value: 'FACTORING_INDIRECTO' },
        { label: 'LEASING VEHICULAR', value: 'LEASING_VEHICULAR' },
        { label: 'LEASING INMOBILIARIO', value: 'LEASING_INMOBILIARIO' },
        { label: 'WARRANT', value: 'WARRANT' }
      ],
      tiposAmortizacion: [
        { label: 'FRANCES (CUOTAS FIJAS)', value: 'FRANCES' },
        { label: 'ALEMAN (AMORTIZACION CONSTANTE)', value: 'ALEMAN' },
        { label: 'AMERICANO (SOLO INTERESES)', value: 'AMERICANO' }
      ],
      frecuenciasPago: [
        { label: 'DIAS', value: 'DIAS' },
        { label: 'MENSUAL', value: 'MENSUAL' },
        { label: 'BIMESTRAL', value: 'BIMESTRAL' },
        { label: 'TRIMESTRAL', value: 'TRIMESTRAL' },
        { label: 'CUATRIMESTRAL', value: 'CUATRIMESTRAL' },
        { label: 'SEMESTRAL', value: 'SEMESTRAL' },
        { label: 'ANUAL', value: 'ANUAL' }
      ],
      tiposTasa: [
        { label: 'EFECTIVA ANUAL', value: 'EFECTIVA_ANUAL' },
        { label: 'NOMINAL ANUAL', value: 'NOMINAL_ANUAL' },
        { label: 'EFECTIVA MENSUAL', value: 'EFECTIVA_MENSUAL' },
        { label: 'NOMINAL MENSUAL', value: 'NOMINAL_MENSUAL' },
        { label: 'EFECTIVA DIARIA', value: 'EFECTIVA_DIARIA' }
      ],
      tiposGarantia: [
        { label: 'HIPOTECARIA', value: 'HIPOTECARIA' },
        { label: 'PRENDARIA', value: 'PRENDARIA' },
        { label: 'FIANZA', value: 'FIANZA' },
        { label: 'SIN GARANTIA', value: 'SIN_GARANTIA' }
      ],
      tiposLineaCredito: [
        { label: 'REVOLVENTE', value: 'REVOLVENTE' },
        { label: 'CARTA DE CREDITO', value: 'CARTA_CREDITO' },
        { label: 'GARANTIA BANCARIA', value: 'GARANTIA_BANCARIA' },
        { label: 'SOBREGIRO', value: 'SOBREGIRO' }
      ],
      tiposInversion: [
        { label: 'DEPOSITO A PLAZO FIJO', value: 'PLAZO_FIJO' },
        { label: 'FONDO MUTUO', value: 'FONDO_MUTUO' },
        { label: 'BONOS', value: 'BONOS' },
        { label: 'ACCIONES', value: 'ACCIONES' },
        { label: 'CTS', value: 'CTS' }
      ],
      periodicidadesRendimiento: [
        { label: 'AL VENCIMIENTO', value: 'VENCIMIENTO' },
        { label: 'DIARIA', value: 'DIARIA' },
        { label: 'SEMANAL', value: 'SEMANAL' },
        { label: 'QUINCENAL', value: 'QUINCENAL' },
        { label: 'MENSUAL', value: 'MENSUAL' },
        { label: 'BIMESTRAL', value: 'BIMESTRAL' },
        { label: 'TRIMESTRAL', value: 'TRIMESTRAL' },
        { label: 'CUATRIMESTRAL', value: 'CUATRIMESTRAL' },
        { label: 'SEMESTRAL', value: 'SEMESTRAL' },
        { label: 'ANUAL', value: 'ANUAL' }
      ],
      opcionesRenovacion: [
        { label: 'SI', value: true },
        { label: 'NO', value: false }
      ]
    };

    res.json(enums);
  } catch (err) {
    next(err);
  }
}