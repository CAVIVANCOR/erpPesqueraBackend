import prisma from '../../config/prismaClient.js';
import { DatabaseError, ValidationError, NotFoundError } from '../../utils/errors.js';

const listarBalance = async (filtros) => {
  try {

    if (!filtros.empresaId || !filtros.periodoContableId) {
      throw new ValidationError('Empresa y Periodo son requeridos');
    }

    const where = {};
    const whereAsiento = {
      empresaId: Number(filtros.empresaId),
      periodoContableId: Number(filtros.periodoContableId),
    };

    if (filtros.fechaDesde || filtros.fechaHasta) {
      whereAsiento.fechaAsiento = {};
      if (filtros.fechaDesde) whereAsiento.fechaAsiento.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) whereAsiento.fechaAsiento.lte = new Date(filtros.fechaHasta);
    }

    // Filtro por tipo de libro (FISCAL/GERENCIAL)
    // FISCAL (false): Solo asientos con esGerencial = false
    // GERENCIAL (true): Todos los asientos (sin filtro)
    if (filtros.esGerencial === false) {
      whereAsiento.esGerencial = false;
    }
    // Si esGerencial === true, NO se agrega filtro (muestra TODO)

    // Filtro por tipo de libro SUNAT (ID)
    if (filtros.tipoLibroId) {
      whereAsiento.tipoLibroId = Number(filtros.tipoLibroId);
    }

    // Filtro por moneda
    if (filtros.monedaId) {
      whereAsiento.monedaId = Number(filtros.monedaId);
    }

    if (filtros.soloSaldosIniciales) {
      whereAsiento.esSaldoInicial = true;
    } else {
      whereAsiento.esSaldoInicial = false;
    }

    whereAsiento.estadoId = { in: [Number(76), Number(77)] };

    where.asientoContable = whereAsiento;

    if (filtros.codigoCuentaInicia) {
      where.planCuenta = {
        codigoCuenta: { startsWith: filtros.codigoCuentaInicia }
      };
    }

    const lineas = await prisma.detalleAsientoContable.findMany({
      where,
      include: {
        asientoContable: {
          include: {
            estado: true,
            moneda: true,
            tipoLibroContableSunat: true,
          }
        },
        planCuenta: true,
        moneda: true,
        submoduloOrigenLinea: true,
      },
      orderBy: [
        { planCuenta: { codigoCuenta: 'asc' } },
        { asientoContable: { fechaAsiento: 'asc' } },
      ],
    });

    // Calcular saldos iniciales SOLO si NO es balance de apertura
    let lineasSaldoInicial = [];
    if (!filtros.soloSaldosIniciales) {
      const whereSaldoInicial = {
        empresaId: Number(filtros.empresaId),
        periodoContableId: Number(filtros.periodoContableId),
        estadoId: { in: [Number(76), Number(77)] },
        esSaldoInicial: true,
      };
      if (filtros.esGerencial === false) {
        whereSaldoInicial.esGerencial = false;
      }
      // Si esGerencial === true, NO se agrega filtro (muestra TODO)
      if (filtros.tipoLibroId) {
        whereSaldoInicial.tipoLibroId = Number(filtros.tipoLibroId);
      }
      if (filtros.monedaId) {
        whereSaldoInicial.monedaId = Number(filtros.monedaId);
      }

      // Si hay rango de fechas, también incluir movimientos previos al rango
      if (filtros.fechaDesde) {
        const whereSaldoInicialMovimientos = {
          empresaId: Number(filtros.empresaId),
          periodoContableId: Number(filtros.periodoContableId),
          fechaAsiento: { lt: new Date(filtros.fechaDesde) },
          estadoId: { in: [Number(76), Number(77)] },
          esSaldoInicial: false,
        };
       if (filtros.esGerencial === false) {
          whereSaldoInicialMovimientos.esGerencial = false;
        }
        // Si esGerencial === true, NO se agrega filtro (muestra TODO)
        if (filtros.tipoLibroId) {
          whereSaldoInicialMovimientos.tipoLibroId = Number(filtros.tipoLibroId);
        }
        if (filtros.monedaId) {
          whereSaldoInicialMovimientos.monedaId = Number(filtros.monedaId);
        }

        const lineasMovimientosPrevios = await prisma.detalleAsientoContable.findMany({
          where: { asientoContable: whereSaldoInicialMovimientos },
          include: { planCuenta: true },
        });

        lineasSaldoInicial = [
          ...(await prisma.detalleAsientoContable.findMany({
            where: { asientoContable: whereSaldoInicial },
            include: { planCuenta: true },
          })),
          ...lineasMovimientosPrevios
        ];
      } else {
        lineasSaldoInicial = await prisma.detalleAsientoContable.findMany({
          where: { asientoContable: whereSaldoInicial },
          include: { planCuenta: true },
        });
      }
    }

    // Pre-cargar todas las cuentas padre necesarias
    const codigosAgrupacion = new Set();
    if (filtros.nivelDetalle) {
      for (const linea of lineas) {
        const codigoAgrupacion = linea.planCuenta.codigoCuenta.substring(0, filtros.nivelDetalle);
        codigosAgrupacion.add(codigoAgrupacion);
      }
      for (const linea of lineasSaldoInicial) {
        const codigoAgrupacion = linea.planCuenta.codigoCuenta.substring(0, filtros.nivelDetalle);
        codigosAgrupacion.add(codigoAgrupacion);
      }
    }

    const cuentasPadreMap = new Map();
    if (codigosAgrupacion.size > 0) {

      const cuentasPadre = await prisma.planCuentasContable.findMany({
        where: {
          codigoCuenta: { in: Array.from(codigosAgrupacion) },
        },
      });

      for (const cuenta of cuentasPadre) {
        cuentasPadreMap.set(cuenta.codigoCuenta, cuenta);
      }

    }

    const cuentasMap = new Map();
    let totalDebe = 0;
    let totalHaber = 0;
    let contadorLineas = 0;

    // PROCESAR SALDOS INICIALES PRIMERO
    for (const linea of lineasSaldoInicial) {
      const cuenta = linea.planCuenta;
      let codigoAgrupacion = cuenta.codigoCuenta;
      if (filtros.nivelDetalle) {
        codigoAgrupacion = cuenta.codigoCuenta.substring(0, filtros.nivelDetalle);
      }
      const cuentaKey = codigoAgrupacion;

      if (!cuentasMap.has(cuentaKey)) {
        const cuentaPadre = cuentasPadreMap.get(codigoAgrupacion);
        cuentasMap.set(cuentaKey, {
          cuentaId: cuentaPadre?.id || cuenta.id,
          codigoCuenta: codigoAgrupacion,
          nombreCuenta: cuentaPadre?.nombreCuenta || cuenta.nombreCuenta,
          nivel: cuentaPadre?.nivel || cuenta.nivel,
          tipoCuenta: cuentaPadre?.tipoCuenta || cuenta.tipoCuenta,
          naturaleza: cuentaPadre?.naturaleza || cuenta.naturaleza,
          tipoLibroId: null,
          monedaId: null,
          saldoInicialDebe: 0,
          saldoInicialHaber: 0,
          debe: 0,
          haber: 0,
          saldo: 0,
          saldoFinalDebe: 0,
          saldoFinalHaber: 0,
          cantidadMovimientos: 0,
          movimientos: [],
        });
      }

      const cuentaData = cuentasMap.get(cuentaKey);
      cuentaData.saldoInicialDebe += Number(linea.debe);
      cuentaData.saldoInicialHaber += Number(linea.haber);
    }

    // PROCESAR MOVIMIENTOS DEL PERIODO
    for (const linea of lineas) {
      contadorLineas++;
      const cuenta = linea.planCuenta;

      let codigoAgrupacion = cuenta.codigoCuenta;
      if (filtros.nivelDetalle) {
        codigoAgrupacion = cuenta.codigoCuenta.substring(0, filtros.nivelDetalle);
      }

      const cuentaKey = codigoAgrupacion;

      if (!cuentasMap.has(cuentaKey)) {
        const cuentaPadre = cuentasPadreMap.get(codigoAgrupacion);

        cuentasMap.set(cuentaKey, {
          cuentaId: cuentaPadre?.id || cuenta.id,
          codigoCuenta: codigoAgrupacion,
          nombreCuenta: cuentaPadre?.nombreCuenta || cuenta.nombreCuenta,
          nivel: cuentaPadre?.nivel || cuenta.nivel,
          tipoCuenta: cuentaPadre?.tipoCuenta || cuenta.tipoCuenta,
          naturaleza: cuentaPadre?.naturaleza || cuenta.naturaleza,
          tipoLibroId: linea.asientoContable.tipoLibroId,
          monedaId: linea.asientoContable.monedaId,
          saldoInicialDebe: 0,
          saldoInicialHaber: 0,
          debe: 0,
          haber: 0,
          saldo: 0,
          saldoFinalDebe: 0,
          saldoFinalHaber: 0,
          cantidadMovimientos: 0,
          movimientos: [],
        });
      }

      const cuentaData = cuentasMap.get(cuentaKey);
      const debe = Number(linea.debe);
      const haber = Number(linea.haber);

      // Si es balance de apertura, los asientos van en "movimientos"
      // Si es balance normal, solo van en "movimientos" los asientos normales
      if (filtros.soloSaldosIniciales) {
        // Balance de apertura: todo va a movimientos
        cuentaData.debe += debe;
        cuentaData.haber += haber;
        cuentaData.cantidadMovimientos++;
        totalDebe += debe;
        totalHaber += haber;
      } else {
        // Balance normal: solo movimientos normales
        cuentaData.debe += debe;
        cuentaData.haber += haber;
        cuentaData.cantidadMovimientos++;
        totalDebe += debe;
        totalHaber += haber;
      }

      if (!cuentaData.tipoLibroId) cuentaData.tipoLibroId = linea.asientoContable.tipoLibroId;
      if (!cuentaData.monedaId) cuentaData.monedaId = linea.asientoContable.monedaId;

      cuentaData.movimientos.push({
        id: linea.id,
        numeroLinea: linea.numeroLinea,
        glosa: linea.glosa,
        debe,
        haber,
        fechaAsiento: linea.asientoContable.fechaAsiento,
        numeroAsiento: linea.asientoContable.numeroAsiento,
        esSaldoInicial: linea.asientoContable.esSaldoInicial,
        estadoAsiento: linea.asientoContable.estado,
        tipoLibro: linea.asientoContable.tipoLibro,
        submoduloOrigenLineaId: linea.submoduloOrigenLineaId,
        procesoOrigenLineaId: linea.procesoOrigenLineaId,
        submoduloOrigenLinea: linea.submoduloOrigenLinea,
        asientoContableId: linea.asientoContableId,
      });
    }

    // Redondear totales a 2 decimales para evitar errores de precisión
    totalDebe = Math.round(totalDebe * 100) / 100;
    totalHaber = Math.round(totalHaber * 100) / 100;

    for (const cuenta of cuentasMap.values()) {
      cuenta.saldo = cuenta.debe - cuenta.haber;

      // Calcular saldo inicial neto
      const saldoInicialNeto = cuenta.saldoInicialDebe - cuenta.saldoInicialHaber;

      // Calcular saldo final neto
      const saldoFinalNeto = saldoInicialNeto + cuenta.saldo;

      // Distribuir en debe/haber según signo
      if (saldoFinalNeto >= 0) {
        cuenta.saldoFinalDebe = Math.round(saldoFinalNeto * 100) / 100;
        cuenta.saldoFinalHaber = 0;
      } else {
        cuenta.saldoFinalDebe = 0;
        cuenta.saldoFinalHaber = Math.round(Math.abs(saldoFinalNeto) * 100) / 100;
      }

      // Distribuir saldo inicial en debe/haber
      if (saldoInicialNeto >= 0) {
        cuenta.saldoInicialDebe = Math.round(saldoInicialNeto * 100) / 100;
        cuenta.saldoInicialHaber = 0;
      } else {
        cuenta.saldoInicialDebe = 0;
        cuenta.saldoInicialHaber = Math.round(Math.abs(saldoInicialNeto) * 100) / 100;
      }
    }

    let cuentas = Array.from(cuentasMap.values());
    cuentas.sort((a, b) => a.codigoCuenta.localeCompare(b.codigoCuenta));
    cuentas.forEach(c => {
      if (c.movimientos && c.movimientos.length > 0) {
        const tieneSI = c.movimientos.some(m => m.esSaldoInicial);
        const tieneMov = c.movimientos.some(m => !m.esSaldoInicial);
      }
    });
    const diferencia = Math.round((totalDebe - totalHaber) * 100) / 100;
    const estaCuadrado = Math.abs(diferencia) < 0.02;

    const estadisticas = calcularEstadisticas(cuentas);

    return {
      cuentas,
      totales: {
        totalDebe,
        totalHaber,
        diferencia,
        estaCuadrado,
      },
      estadisticas,
      filtrosAplicados: filtros,
    };
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR EN BALANCE DE COMPROBACIÓN');
    console.error('❌ ========================================');
    console.error('❌ Error completo:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ ========================================');

    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError('Error al generar balance de comprobación', error);
  }
};

function calcularEstadisticas(cuentas) {
  const porTipo = {};
  const top10Movimientos = [];
  const topGastos = [];
  const topIngresos = [];

  for (const cuenta of cuentas) {
    const tipo = cuenta.tipoCuenta || 'SIN_TIPO';
    if (!porTipo[tipo]) {
      porTipo[tipo] = { cantidad: 0, totalDebe: 0, totalHaber: 0 };
    }
    porTipo[tipo].cantidad++;
    porTipo[tipo].totalDebe += cuenta.debe;
    porTipo[tipo].totalHaber += cuenta.haber;

    if (cuenta.cantidadMovimientos > 0) {
      top10Movimientos.push({
        codigoCuenta: cuenta.codigoCuenta,
        nombreCuenta: cuenta.nombreCuenta,
        cantidadMovimientos: cuenta.cantidadMovimientos,
      });
    }

    if (cuenta.tipoCuenta === 'GASTO' && cuenta.debe > 0) {
      topGastos.push({
        codigoCuenta: cuenta.codigoCuenta,
        nombreCuenta: cuenta.nombreCuenta,
        monto: cuenta.debe,
      });
    }

    if (cuenta.tipoCuenta === 'INGRESO' && cuenta.haber > 0) {
      topIngresos.push({
        codigoCuenta: cuenta.codigoCuenta,
        nombreCuenta: cuenta.nombreCuenta,
        monto: cuenta.haber,
      });
    }
  }

  top10Movimientos.sort((a, b) => b.cantidadMovimientos - a.cantidadMovimientos);
  topGastos.sort((a, b) => b.monto - a.monto);
  topIngresos.sort((a, b) => b.monto - a.monto);

  return {
    porTipo,
    top10Movimientos: top10Movimientos.slice(0, 10),
    topGastos: topGastos.slice(0, 10),
    topIngresos: topIngresos.slice(0, 10),
  };
}

const generarFormatoSUNAT317 = async (filtros) => {
  try {
    if (!filtros.empresaId || !filtros.periodoContableId) {
      throw new ValidationError('Empresa y Periodo son obligatorios para exportar');
    }

    const resultado = await listarBalance(filtros);
    const cuentas = resultado.cuentas || [];

    if (cuentas.length === 0) {
      throw new NotFoundError('No hay cuentas para exportar con los filtros seleccionados');
    }

    // Obtener datos de empresa y periodo
    const empresa = await prisma.empresa.findUnique({
      where: { id: Number(filtros.empresaId) }
    });

    const periodo = await prisma.periodoContable.findUnique({
      where: { id: Number(filtros.periodoContableId) }
    });

    if (!empresa) {
      throw new NotFoundError('Empresa no encontrada');
    }

    if (!periodo) {
      throw new NotFoundError('Periodo contable no encontrado');
    }

    const ruc = empresa.ruc.padStart(11, '0');
    const anio = periodo.anio || periodo.año;
    const mes = String(periodo.mes).padStart(2, '0');
    const periodoSunat = `${anio}${mes}00`;
    const nombreArchivo = `LE${ruc}${periodoSunat}0317001111.txt`;

    let contenido = '';
    cuentas.forEach((cuenta) => {
      const saldoInicialDeudor = cuenta.saldoInicialDebe > 0 ? cuenta.saldoInicialDebe.toFixed(2) : '';
      const saldoInicialAcreedor = cuenta.saldoInicialHaber > 0 ? cuenta.saldoInicialHaber.toFixed(2) : '';
      const debe = cuenta.debe > 0 ? cuenta.debe.toFixed(2) : '';
      const haber = cuenta.haber > 0 ? cuenta.haber.toFixed(2) : '';
      const saldoFinalDeudor = cuenta.saldoFinalDebe > 0 ? cuenta.saldoFinalDebe.toFixed(2) : '';
      const saldoFinalAcreedor = cuenta.saldoFinalHaber > 0 ? cuenta.saldoFinalHaber.toFixed(2) : '';

      const saldoFinalNeto = (cuenta.saldoFinalDebe || 0) - (cuenta.saldoFinalHaber || 0);
      const activo = cuenta.tipoCuenta === 'ACTIVO' && saldoFinalNeto > 0 ? saldoFinalNeto.toFixed(2) : '';
      const pasivoPat = (cuenta.tipoCuenta === 'PASIVO' || cuenta.tipoCuenta === 'PATRIMONIO') && saldoFinalNeto < 0
        ? Math.abs(saldoFinalNeto).toFixed(2) : '';
      const perdida = cuenta.tipoCuenta === 'GASTO' && cuenta.debe > 0 ? cuenta.debe.toFixed(2) : '';
      const ganancia = cuenta.tipoCuenta === 'INGRESO' && cuenta.haber > 0 ? cuenta.haber.toFixed(2) : '';

      contenido += `${cuenta.codigoCuenta}|`;
      contenido += `${cuenta.nombreCuenta}|`;
      contenido += `${saldoInicialDeudor}|`;
      contenido += `${saldoInicialAcreedor}|`;
      contenido += `${debe}|`;
      contenido += `${haber}|`;
      contenido += `${saldoFinalDeudor}|`;
      contenido += `${saldoFinalAcreedor}|`;
      contenido += `${activo}|`;
      contenido += `${pasivoPat}|`;
      contenido += `${perdida}|`;
      contenido += `${ganancia}\n`;
    });

    return { contenido, nombreArchivo };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar formato SUNAT 3.17', err.message);
    }
    throw err;
  }
};

const generarFormatoSUNAT316 = async (filtros) => {
  try {
    if (!filtros.empresaId || !filtros.periodoContableId) {
      throw new ValidationError('Empresa y Periodo son obligatorios para exportar');
    }

    const resultado = await listarBalance(filtros);
    const cuentas = (resultado.cuentas || []).filter(c =>
      c.tipoCuenta === 'ACTIVO' || c.tipoCuenta === 'PASIVO' || c.tipoCuenta === 'PATRIMONIO'
    );

    if (cuentas.length === 0) {
      throw new NotFoundError('No hay cuentas para exportar con los filtros seleccionados');
    }

    // Obtener datos de empresa y periodo
    const empresa = await prisma.empresa.findUnique({
      where: { id: Number(filtros.empresaId) }
    });

    const periodo = await prisma.periodoContable.findUnique({
      where: { id: Number(filtros.periodoContableId) }
    });

    if (!empresa) {
      throw new NotFoundError('Empresa no encontrada');
    }

    if (!periodo) {
      throw new NotFoundError('Periodo contable no encontrado');
    }

    const ruc = empresa.ruc.padStart(11, '0');
    const anio = periodo.anio || periodo.año;
    const mes = String(periodo.mes).padStart(2, '0');
    const periodoSunat = `${anio}${mes}00`;
    const nombreArchivo = `LE${ruc}${periodoSunat}031600001111.txt`;

    let contenido = '';
    let correlativo = 1;
    
    cuentas.forEach((cuenta) => {
      let saldoDeudor = 0;
      let saldoAcreedor = 0;
      
      if (cuenta.tipoCuenta === 'ACTIVO') {
        const saldoNeto = (cuenta.saldoFinalDebe || 0) - (cuenta.saldoFinalHaber || 0);
        if (saldoNeto > 0) {
          saldoDeudor = saldoNeto;
        } else if (saldoNeto < 0) {
          saldoAcreedor = Math.abs(saldoNeto);
        }
      } else if (cuenta.tipoCuenta === 'PASIVO' || cuenta.tipoCuenta === 'PATRIMONIO') {
        const saldoNeto = (cuenta.saldoFinalHaber || 0) - (cuenta.saldoFinalDebe || 0);
        if (saldoNeto > 0) {
          saldoAcreedor = saldoNeto;
        } else if (saldoNeto < 0) {
          saldoDeudor = Math.abs(saldoNeto);
        }
      }

      // Solo incluir cuentas con saldo
      if (saldoDeudor === 0 && saldoAcreedor === 0) return;

      const saldoDeudorStr = saldoDeudor > 0 ? saldoDeudor.toFixed(2) : '';
      const saldoAcreedorStr = saldoAcreedor > 0 ? saldoAcreedor.toFixed(2) : '';

      // Formato SUNAT 3.16
      contenido += `${periodoSunat}|`;                    // Periodo
      contenido += `M${String(correlativo).padStart(8, '0')}|`; // CUO (Código Único de Operación)
      contenido += `${String(correlativo).padStart(10, '0')}|`; // Correlativo
      contenido += `${cuenta.codigoCuenta}|`;             // Código de cuenta
      contenido += `${cuenta.nombreCuenta}|`;             // Descripción
      contenido += `${saldoDeudorStr}|`;                  // Saldo Deudor
      contenido += `${saldoAcreedorStr}|`;                // Saldo Acreedor
      contenido += `1\n`;                                 // Estado (1 = Activo)
      
      correlativo++;
    });

    return { contenido, nombreArchivo };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar formato SUNAT 3.16', err.message);
    }
    throw err;
  }
};

const generarFormatoSUNAT320 = async (filtros) => {
  try {
    if (!filtros.empresaId || !filtros.periodoContableId) {
      throw new ValidationError('Empresa y Periodo son obligatorios para exportar');
    }

    const resultado = await listarBalance(filtros);
    const cuentas = (resultado.cuentas || []).filter(c =>
      c.tipoCuenta === 'INGRESO' || c.tipoCuenta === 'GASTO'
    );

    if (cuentas.length === 0) {
      throw new NotFoundError('No hay cuentas para exportar con los filtros seleccionados');
    }

    // Obtener datos de empresa y periodo
    const empresa = await prisma.empresa.findUnique({
      where: { id: Number(filtros.empresaId) }
    });

    const periodo = await prisma.periodoContable.findUnique({
      where: { id: Number(filtros.periodoContableId) }
    });

    if (!empresa) {
      throw new NotFoundError('Empresa no encontrada');
    }

    if (!periodo) {
      throw new NotFoundError('Periodo contable no encontrado');
    }

    const ruc = empresa.ruc.padStart(11, '0');
    const anio = periodo.anio || periodo.año;
    const mes = String(periodo.mes).padStart(2, '0');
    const periodoSunat = `${anio}${mes}00`;
    const nombreArchivo = `LE${ruc}${periodoSunat}0320001111.txt`;

    let contenido = '';
    cuentas.forEach((cuenta) => {
      const monto = cuenta.tipoCuenta === 'INGRESO' ? (cuenta.haber || 0) : (cuenta.debe || 0);
      const montoStr = monto > 0 ? monto.toFixed(2) : '';

      contenido += `${cuenta.codigoCuenta}|`;
      contenido += `${cuenta.nombreCuenta}|`;
      contenido += `${cuenta.tipoCuenta}|`;
      contenido += `${montoStr}\n`;
    });

    return { contenido, nombreArchivo };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar formato SUNAT 3.20', err.message);
    }
    throw err;
  }
};


export default {
  listarBalance,
  generarFormatoSUNAT317,
  generarFormatoSUNAT316,
  generarFormatoSUNAT320,
};