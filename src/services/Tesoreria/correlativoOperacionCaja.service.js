import prisma from '../../config/prismaClient.js';
import { DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para gestión de correlativos de operaciones de caja y bancos
 * Genera números correlativos únicos por empresa para trazabilidad
 * Documentado en español.
 */

/**
 * Generar siguiente correlativo para una empresa
 */
const generarCorrelativo = async (empresaId, tx = null) => {
  const client = tx || prisma;

  try {
    const empresaActualizada = await client.empresa.update({
      where: { id: Number(empresaId) },
      data: {
        ultimoCorrelativoOperacionCaja: {
          increment: 1
        }
      },
      select: {
        ultimoCorrelativoOperacionCaja: true
      }
    });

    return empresaActualizada.ultimoCorrelativoOperacionCaja;
  } catch (error) {
    console.error('Error al generar correlativo:', error);
    throw new DatabaseError('Error al generar número de correlativo de operación.');
  }
};

/**
 * Obtener último correlativo de una empresa (sin incrementar)
 */
const obtenerUltimoCorrelativo = async (empresaId) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: Number(empresaId) },
      select: {
        ultimoCorrelativoOperacionCaja: true
      }
    });

    if (!empresa) {
      throw new ValidationError('Empresa no encontrada.');
    }

    return empresa.ultimoCorrelativoOperacionCaja;
  } catch (error) {
    console.error('Error al obtener último correlativo:', error);
    throw new DatabaseError('Error al consultar correlativo de operación.');
  }
};

/**
 * Consultar todas las operaciones con un correlativo específico
 */
const consultarOperacionPorCorrelativo = async (empresaId, correlativo) => {
  try {
    // Buscar todos los movimientos de caja con este correlativo
    const movimientosCaja = await prisma.movimientoCaja.findMany({
      where: {
        refOperacionEspecializadaMovCaja: Number(correlativo),
        empresaId: Number(empresaId)
      },
      include: {
        tipoMovimiento: true,
        moneda: true,
        medioPago: true,
        cuentaCorrienteOrigen: true,
        cuentaCorrienteDestino: true,
        estado: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    // Buscar pagos relacionados
    const [
      pagosCxC,
      pagosCxP,
      pagosDeudaPersonal,
      pagosDeudaTributaria,
      pagosLetraCambio,
      cuotasPrestamo,
      asignaciones
    ] = await Promise.all([
      prisma.pagoCuentaPorCobrar.findMany({
        where: { refOperacionEspecializadaMovCaja: Number(correlativo) },
        include: {
          cuentaPorCobrar: {
            include: {
              entidadComercial: true,
              moneda: true
            }
          }
        }
      }),
      prisma.pagoCuentaPorPagar.findMany({
        where: { refOperacionEspecializadaMovCaja: Number(correlativo) },
        include: {
          cuentaPorPagar: {
            include: {
              entidadComercial: true,
              moneda: true
            }
          }
        }
      }),
      prisma.pagoDeudaPersonal.findMany({
        where: { refOperacionEspecializadaMovCaja: Number(correlativo) },
        include: {
          deudaConPersonal: {
            include: {
              personal: true,
              tipoDeuda: true,
              moneda: true
            }
          }
        }
      }),
      prisma.pagoDeudaTributaria.findMany({
        where: { refOperacionEspecializadaMovCaja: Number(correlativo) },
        include: {
          deudaTributaria: {
            include: {
              tipoDeuda: true,
              moneda: true
            }
          }
        }
      }),
      prisma.pagoLetraCambio.findMany({
        where: { refOperacionEspecializadaMovCaja: Number(correlativo) },
        include: {
          letraCambio: {
            include: {
              entidadComercial: true,
              moneda: true
            }
          }
        }
      }),
      prisma.cuotaPrestamo.findMany({
        where: { refOperacionEspecializadaMovCaja: Number(correlativo) },
        include: {
          prestamoBancario: {
            include: {
              entidadFinanciera: true,
              moneda: true,
              tipoPrestamo: true
            }
          }
        }
      }),
      prisma.detMovsEntregaRendir.findMany({
        where: { refOperacionEspecializadaMovCaja: Number(correlativo) },
        include: {
          entregaARendir: {
            include: {
              responsable: true,
              moneda: true
            }
          }
        }
      })
    ]);

    return {
      correlativo: correlativo,
      empresaId: empresaId,
      movimientosCaja: movimientosCaja,
      pagos: {
        cuentasPorCobrar: pagosCxC,
        cuentasPorPagar: pagosCxP,
        deudasPersonal: pagosDeudaPersonal,
        deudasTributarias: pagosDeudaTributaria,
        letrasCambio: pagosLetraCambio,
        cuotasPrestamo: cuotasPrestamo,
        asignaciones: asignaciones
      },
      totalMovimientos: movimientosCaja.length,
      totalPagos: pagosCxC.length + pagosCxP.length + pagosDeudaPersonal.length +
        pagosDeudaTributaria.length + pagosLetraCambio.length +
        cuotasPrestamo.length + asignaciones.length
    };
  } catch (error) {
    console.error('Error al consultar operación por correlativo:', error);
    throw new DatabaseError('Error al consultar operación.');
  }
};

export default {
  generarCorrelativo,
  obtenerUltimoCorrelativo,
  consultarOperacionPorCorrelativo
};