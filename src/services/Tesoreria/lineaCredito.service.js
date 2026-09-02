import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para LineaCredito
 * Gestiona líneas de crédito bancarias y sus préstamos vinculados.
 * Documentado en español.
 */

/**
 * Formatea una fecha a YYYY-MM-DD sin conversión de zona horaria
 * @param {Date} fecha - Fecha a formatear
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function formatearFechaISO(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Valida los datos de una línea de crédito.
 * @param {Object} data - Datos de la línea de crédito
 */
async function validarLineaCredito(data) {
  // Validar empresa
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa) {
      throw new ValidationError("La empresa referenciada no existe.");
    }
  }

  // Validar banco
  if (data.bancoId) {
    const banco = await prisma.banco.findUnique({
      where: { id: data.bancoId },
    });
    if (!banco) {
      throw new ValidationError("El banco referenciado no existe.");
    }
  }

  // Validar moneda
  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) {
      throw new ValidationError("La moneda referenciada no existe.");
    }
  }

  // Validar estado
  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: data.estadoId },
    });
    if (!estado) {
      throw new ValidationError("El estado referenciado no existe.");
    }
  }

  // Validar fechas
  if (data.fechaAprobacion && data.fechaVencimiento) {
    if (new Date(data.fechaVencimiento) <= new Date(data.fechaAprobacion)) {
      throw new ValidationError(
        "La fecha de vencimiento debe ser posterior a la fecha de aprobación.",
      );
    }
  }

  // Validar montos
  if (data.montoUtilizado && data.montoAprobado) {
    if (data.montoUtilizado > data.montoAprobado) {
      throw new ValidationError(
        "El monto utilizado no puede ser mayor al monto aprobado.",
      );
    }
  }
}

/**
 * Actualiza los saldos de una línea de crédito basándose en los préstamos vinculados.
 * @param {BigInt} lineaCreditoId - ID de la línea de crédito
 */
async function actualizarSaldosLinea(lineaCreditoId) {
  // Obtener préstamos vigentes vinculados a esta línea
  const prestamos = await prisma.prestamoBancario.findMany({
    where: {
      lineaCreditoId,
      estadoId: { in: [80n, 81n] }, // 80=DESEMBOLSADO, 81=VIGENTE
    },
  });

  // Sumar el saldo de capital de todos los préstamos vigentes
  const montoUtilizado = prestamos.reduce(
    (sum, p) => sum + parseFloat(p.saldoCapital),
    0,
  );

  const linea = await prisma.lineaCredito.findUnique({
    where: { id: lineaCreditoId },
  });

  const montoDisponible = parseFloat(linea.montoAprobado) - montoUtilizado;

  await prisma.lineaCredito.update({
    where: { id: lineaCreditoId },
    data: {
      montoUtilizado,
      montoDisponible,
    },
  });
}

/**
 * Consulta el tipo de cambio SUNAT para una fecha específica
 * Si no encuentra, busca el TC más cercano anterior a la fecha
 * @param {Date} fecha - Fecha para consultar el tipo de cambio
 * @returns {Object} { compra, venta, fecha } - Tipos de cambio y fecha usada
 */
async function obtenerTipoCambio(fecha) {
  try {
    const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;

    if (!token) {
      console.warn(
        "⚠️ Token de API no configurado, usando TC por defecto 3.75",
      );
      return {
        compra: 3.75,
        venta: 3.75,
        fecha: formatearFechaISO(fecha),
      };
    }

    // Formatear fecha a YYYY-MM-DD sin conversión UTC
    const fechaFormateada = formatearFechaISO(fecha);
    const hoy = formatearFechaISO(new Date());

    // Si la fecha es futura, usar la fecha de hoy
    const fechaConsulta = fechaFormateada > hoy ? hoy : fechaFormateada;

    // Intentar obtener TC de la fecha exacta
    let url = `https://api.decolecta.com/v1/tipo-cambio/sunat?date=${fechaConsulta}`;

    let response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Si encontró el TC de la fecha exacta, retornarlo
    if (response.ok) {
      const data = await response.json();
      // La API devuelve buy_price y sell_price, no compra y venta
      const compra = parseFloat(data.buy_price || 3.75);
      const venta = parseFloat(data.sell_price || 3.75);
      return {
        compra,
        venta,
        fecha: data.date || fechaConsulta,
      };
    }

    // Si la respuesta no es OK, mostrar el error
    const errorText = await response.text();
    const fechaObj = new Date(fechaConsulta);
    const month = fechaObj.getMonth() + 1;
    const year = fechaObj.getFullYear();

    url = `https://api.decolecta.com/v1/tipo-cambio/sunat?month=${month}&year=${year}`;
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { compra: 3.75, venta: 3.75, fecha: fechaConsulta };
    }
    const dataArray = await response.json();
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return { compra: 3.75, venta: 3.75, fecha: fechaConsulta };
    }

    // Filtrar solo fechas <= a la fecha de consulta
    const tiposCambioAnteriores = dataArray.filter(
      (tc) => tc.date <= fechaConsulta,
    );

    if (tiposCambioAnteriores.length === 0) {
      // Si no hay anteriores, usar el más reciente disponible
      dataArray.sort((a, b) => b.date.localeCompare(a.date));
      const tcMasReciente = dataArray[0];
      const compra = parseFloat(tcMasReciente.buy_price || 3.75);
      const venta = parseFloat(tcMasReciente.sell_price || 3.75);
      return {
        compra,
        venta,
        fecha: tcMasReciente.date,
      };
    }

    // Ordenar por fecha descendente y tomar el más reciente (más cercano)
    tiposCambioAnteriores.sort((a, b) => b.date.localeCompare(a.date));
    const tcMasCercano = tiposCambioAnteriores[0];
    const compra = parseFloat(tcMasCercano.buy_price || 3.75);
    const venta = parseFloat(tcMasCercano.sell_price || 3.75);
    return {
      compra,
      venta,
      fecha: tcMasCercano.date,
    };
  } catch (error) {
    return {
      compra: 3.75,
      venta: 3.75,
      fecha: formatearFechaISO(fecha),
    };
  }
}

/**
 * Lista todas las líneas de crédito.
 */
const listar = async () => {
  try {
    const lineas = await prisma.lineaCredito.findMany({
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        prestamos: {
          where: { estadoId: { in: [80n, 81n] } }, // DESEMBOLSADO o VIGENTE
          orderBy: { fechaDesembolso: "desc" },
          select: {
            id: true,
            numeroPrestamo: true,
            montoDesembolsado: true,
            saldoCapital: true,
            fechaDesembolso: true,
            fechaContrato: true,
            moneda: {
              select: {
                id: true,
                codigoSunat: true,
              },
            },
          },
        },
        sublineas: {
          include: {
            tipoPrestamo: true,
            sobregiros: {
              where: {
                activo: true,
              },
            },
            prestamos: {
              include: {
                estado: true,
                moneda: true,
              },
              orderBy: { fechaDesembolso: "desc" },
            },
          },
          orderBy: { tipoPrestamoId: "asc" },
        },
      },
      orderBy: { fechaAprobacion: "desc" },
    });

    // ✅ CALCULAR montoUtilizado y montoDisponible CON CONVERSIÓN DE MONEDA
    const lineasConSaldos = await Promise.all(
      lineas.map(async (linea) => {
        const monedaLinea = linea.moneda; // Moneda de la línea de crédito
        // Sumar el MONTO DESEMBOLSADO de todos los préstamos vigentes CON CONVERSIÓN
        let montoUtilizado = 0;

        for (const prestamo of linea.prestamos) {
          const montoDesembolsado = parseFloat(prestamo.montoDesembolsado || 0);
          const monedaPrestamo = prestamo.moneda;

          let montoEnMonedaLinea = montoDesembolsado;

          // ✅ CONVERTIR SI LAS MONEDAS SON DIFERENTES
          if (
            monedaPrestamo &&
            monedaLinea &&
            monedaPrestamo.id !== monedaLinea.id
          ) {
            // Obtener tipo de cambio de la fecha del contrato
            const fechaTC = prestamo.fechaDesembolso;
            const tipoCambio = await obtenerTipoCambio(fechaTC);

            // Si la línea es USD y el préstamo es PEN: dividir por TC venta
            // Si la línea es PEN y el préstamo es USD: multiplicar por TC compra
            if (
              monedaLinea.codigoSunat === "USD" &&
              monedaPrestamo.codigoSunat === "PEN"
            ) {
              // Convertir PEN a USD: dividir por tipo de cambio venta
              montoEnMonedaLinea = montoDesembolsado / tipoCambio.venta;
            } else if (
              monedaLinea.codigoSunat === "PEN" &&
              monedaPrestamo.codigoSunat === "USD"
            ) {
              // Convertir USD a PEN: multiplicar por TC Venta (estándar del sistema: siempre sell_price)
              montoEnMonedaLinea = montoDesembolsado * tipoCambio.venta;
            } else {
            }
          } else {
          }

          montoUtilizado += montoEnMonedaLinea;
        }
        const montoAprobado = parseFloat(linea.montoAprobado || 0);

        // Calcular total de sobregiros de todas las sublíneas
        let totalSobregiros = 0;
        if (linea.sublineas) {
          linea.sublineas.forEach((sublinea) => {
            if (sublinea.sobregiros) {
              sublinea.sobregiros.forEach((sobregiro) => {
                totalSobregiros += parseFloat(sobregiro.montoAutorizado || 0);
              });
            }
          });
        }

        // ✅ CALCULAR totalSobregiros PARA CADA SUBLÍNEA
        const sublineasConTotales = linea.sublineas.map((sublinea) => {
          const totalSobregiros = sublinea.sobregiros.reduce((sum, sobregiro) => {
            return sum + parseFloat(sobregiro.montoAutorizado || 0);
          }, 0);

          return {
            ...sublinea,
            totalSobregiros,
          };
        });

        const montoDisponible = montoAprobado - montoUtilizado;
        return {
          ...linea,
          montoUtilizado,
          montoDisponible,
          totalSobregiros,
          sublineas: sublineasConTotales, // ✅ Reemplazar sublíneas con totales calculados
        };
      }),
    );

    return lineasConSaldos;
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una línea de crédito por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const linea = await prisma.lineaCredito.findUnique({
      where: { id },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        prestamos: {
          orderBy: { fechaDesembolso: "desc" },
          include: {
            moneda: true,
            estado: true,
          },
        },
      },
    });
    if (!linea) throw new NotFoundError("Línea de crédito no encontrada");
    return linea;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva línea de crédito.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (
      !data.empresaId ||
      !data.bancoId ||
      !data.montoAprobado ||
      !data.monedaId ||
      !data.tasaInteres ||
      !data.fechaAprobacion ||
      !data.fechaVencimiento ||
      !data.estadoId
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios para crear la línea de crédito.",
      );
    }

    await validarLineaCredito(data);

    // Calcular montos iniciales
    const montoUtilizado = 0;
    const montoDisponible = parseFloat(data.montoAprobado);

    return await prisma.lineaCredito.create({
      data: {
        ...data,
        montoUtilizado,
        montoDisponible,
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Actualiza una línea de crédito existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.lineaCredito.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Línea de crédito no encontrada");

    await validarLineaCredito({ ...data, id });

    return await prisma.lineaCredito.update({
      where: { id },
      data,
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        prestamos: {
          orderBy: { fechaDesembolso: "desc" },
        },
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Elimina una línea de crédito por ID.
 * Valida que no tenga préstamos vigentes.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.lineaCredito.findUnique({
      where: { id },
      include: {
        prestamos: true,
      },
    });

    if (!existente) throw new NotFoundError("Línea de crédito no encontrada");

    // Validar que no tenga préstamos vigentes
    const prestamosVigentes = existente.prestamos.filter(
      (p) => p.estadoId === 80n || p.estadoId === 81n, // DESEMBOLSADO o VIGENTE
    );
    if (prestamosVigentes.length > 0) {
      throw new ConflictError(
        "No se puede eliminar la línea de crédito porque tiene préstamos vigentes.",
      );
    }

    await prisma.lineaCredito.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista líneas de crédito por empresa.
 */
const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.lineaCredito.findMany({
      where: { empresaId },
      include: {
        banco: true,
        moneda: true,
        estado: true,
        prestamos: {
          where: { estadoId: { in: [80n, 81n] } },
        },
      },
      orderBy: { fechaAprobacion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista líneas de crédito vigentes.
 */
const listarVigentes = async () => {
  try {
    // Estado: 87=VIGENTE
    return await prisma.lineaCredito.findMany({
      where: {
        estadoId: 87n,
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
      },
      orderBy: { fechaVencimiento: "asc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista préstamos de una línea de crédito.
 */
const listarPrestamos = async (lineaCreditoId) => {
  try {
    return await prisma.prestamoBancario.findMany({
      where: { lineaCreditoId },
      include: {
        moneda: true,
        estado: true,
        cuotas: {
          orderBy: { numeroCuota: "asc" },
        },
      },
      orderBy: { fechaDesembolso: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene reporte de líneas disponibles con 3 secciones:
 * 1. Resumen por banco y moneda
 * 2. Detalle por línea con tipos de préstamo
 * 3. Factoring indirecto por banco con clientes
 */
const obtenerReporteLineasDisponibles = async (empresaId) => {
  try {
    const lineas = await prisma.lineaCredito.findMany({
      where: {
        empresaId,
        estadoId: 87n, // Solo VIGENTE
      },
      include: {
        banco: true,
        moneda: true,
        estado: true,
        prestamos: {
          where: {
            estadoId: { in: [80n, 81n] }, // DESEMBOLSADO o VIGENTE
          },
          include: {
            tipoPrestamo: true,
          },
        },
      },
    });

    // ========================================
    // SECCIÓN 1: RESUMEN POR BANCO Y MONEDA
    // ========================================
    const resumenBancos = {};

    lineas.forEach((linea) => {
      const key = `${linea.banco.id}-${linea.moneda.id}`;
      const montoUtilizado = linea.prestamos.reduce((sum, prestamo) => {
        return sum + parseFloat(prestamo.saldoCapital || 0);
      }, 0);

      const montoAprobado = parseFloat(linea.montoAprobado || 0);
      const montoDisponible = montoAprobado - montoUtilizado;

      if (!resumenBancos[key]) {
        resumenBancos[key] = {
          banco: linea.banco.nombre,
          moneda: linea.moneda.codigoSunat,
          limite: 0,
          utilizado: 0,
          disponible: 0,
          porcentajeUtilizado: 0,
        };
      }

      resumenBancos[key].limite += montoAprobado;
      resumenBancos[key].utilizado += montoUtilizado;
      resumenBancos[key].disponible += montoDisponible;
    });

    // Calcular porcentajes del resumen
    const resumen = Object.values(resumenBancos).map((item) => {
      item.porcentajeUtilizado =
        item.limite > 0
          ? parseFloat(((item.utilizado / item.limite) * 100).toFixed(2))
          : 0;
      return item;
    });

    // Totales del resumen
    const totalesResumen = resumen.reduce(
      (acc, item) => {
        acc.limite += item.limite;
        acc.utilizado += item.utilizado;
        acc.disponible += item.disponible;
        return acc;
      },
      { limite: 0, utilizado: 0, disponible: 0 },
    );

    totalesResumen.porcentajeUtilizado =
      totalesResumen.limite > 0
        ? parseFloat(
          ((totalesResumen.utilizado / totalesResumen.limite) * 100).toFixed(
            2,
          ),
        )
        : 0;

    // ========================================
    // SECCIÓN 2: DETALLE POR BANCO Y LÍNEA
    // ========================================
    const detalleBancos = {};

    lineas.forEach((linea) => {
      const bancoId = linea.banco.id.toString();
      const montoUtilizado = linea.prestamos.reduce((sum, prestamo) => {
        return sum + parseFloat(prestamo.saldoCapital || 0);
      }, 0);

      const montoAprobado = parseFloat(linea.montoAprobado || 0);
      const montoDisponible = montoAprobado - montoUtilizado;

      if (!detalleBancos[bancoId]) {
        detalleBancos[bancoId] = {
          banco: linea.banco.nombre,
          lineas: [],
        };
      }

      // Agrupar préstamos por tipo
      const prestamosPorTipo = {};
      linea.prestamos.forEach((prestamo) => {
        const tipoNombre = prestamo.tipoPrestamo?.nombre || "SIN TIPO";
        if (!prestamosPorTipo[tipoNombre]) {
          prestamosPorTipo[tipoNombre] = {
            tipo: tipoNombre,
            saldo: 0,
          };
        }
        prestamosPorTipo[tipoNombre].saldo += parseFloat(
          prestamo.saldoCapital || 0,
        );
      });

      detalleBancos[bancoId].lineas.push({
        id: linea.id.toString(),
        moneda: linea.moneda.codigoSunat,
        limite: montoAprobado,
        utilizado: montoUtilizado,
        disponible: montoDisponible,
        tasa: parseFloat(linea.tasaInteres || 0),
        tiposPrestamo: Object.values(prestamosPorTipo),
      });
    });

    const detalle = Object.values(detalleBancos);

    // ========================================
    // SECCIÓN 3: FACTORING INDIRECTO
    // ========================================
    // Buscar préstamos de tipo "FACTORING INDIRECTO"
    const factoringIndirecto = {};

    for (const linea of lineas) {
      for (const prestamo of linea.prestamos) {
        const tipoNombre = prestamo.tipoPrestamo?.nombre || "";

        // Verificar si es factoring indirecto
        if (
          tipoNombre.toUpperCase().includes("FACTORING") &&
          tipoNombre.toUpperCase().includes("INDIRECTO")
        ) {
          const bancoId = linea.banco.id.toString();

          if (!factoringIndirecto[bancoId]) {
            factoringIndirecto[bancoId] = {
              banco: linea.banco.nombre,
              moneda: linea.moneda.codigoSunat,
              clientes: [],
            };
          }

          // Obtener información del cliente desde el préstamo
          // Nota: Necesitarás ajustar esto según tu modelo
          // Si tienes una relación con EntidadComercial o similar
          const cliente = {
            nombre: prestamo.beneficiario || "CLIENTE NO ESPECIFICADO",
            monto: parseFloat(prestamo.saldoCapital || 0),
          };

          factoringIndirecto[bancoId].clientes.push(cliente);
        }
      }
    }

    // Calcular totales por banco en factoring
    Object.values(factoringIndirecto).forEach((banco) => {
      banco.total = banco.clientes.reduce(
        (sum, cliente) => sum + cliente.monto,
        0,
      );
    });

    const factoring = Object.values(factoringIndirecto);

    // ========================================
    // RETORNAR ESTRUCTURA COMPLETA
    // ========================================
    return {
      resumen: {
        bancos: resumen,
        totales: totalesResumen,
      },
      detalle: detalle,
      factoring: factoring,
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  listarVigentes,
  listarPrestamos,
  obtenerReporteLineasDisponibles,
  actualizarSaldosLinea,
  obtenerTipoCambio,
};