import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import { DIAS_HABILES_PROTESTO } from "../../utils/letrasCambio.constants.js";
import {
  num,
  r2,
  aCentimos,
  deCentimos,
  sumarDiasHabiles,
  formatearFecha,
  obtenerEstadosLetra,
  obtenerTipoDocumentoLetra,
  numeroLetraDesdeId,
} from "./letraCambioBase.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: REFINANCIACIÓN DE LETRAS DE CAMBIO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Una letra que no se puede pagar se refinancia en N letras nuevas que suman exactamente su saldo de capital
 * (p. ej. 1,000 en 2 letras de 500). Los intereses y la mora NO se capitalizan: se ingresan a mano el día en
 * que se paga cada letra. Por eso la refinanciación no genera asiento: el capital sigue en la misma cuenta
 * de letras (por pagar o por cobrar).
 *
 *   - La letra origen pasa a REFINANCIADA (renovada = true) y su saldo de capital a cero.
 *   - Las letras nuevas apuntan a la origen (letraRenovadaId) y heredan sus partes y las facturas que respaldan:
 *     el capital que le faltaba pagar a cada factura se reparte entre las letras nuevas.
 *   - El capital de cada factura sigue contando entre TODAS sus letras (las refinanciadas incluidas): la
 *     detracción, retención y percepción se resuelven cuando se cancela la última.
 */

const ESTADOS_REFINANCIABLES = ["VIGENTE", "VENCIDA", "PROTESTADA", "PAGADA_PARCIAL"];

/**
 * datos: { letraId, fechaRefinanciacion, letras: [{ fechaVencimiento, monto, observaciones? }], observaciones?, usuarioId }
 */
export async function refinanciar(datos) {
  const { letraId, letras, usuarioId } = datos;
  try {
    if (!letraId) throw new ValidationError("Seleccione la letra que se refinancia.");
    if (!datos.fechaRefinanciacion) throw new ValidationError("La fecha de refinanciación es obligatoria.");
    if (!Array.isArray(letras) || letras.length === 0) {
      throw new ValidationError("Indique las letras nuevas (fecha de vencimiento y monto).");
    }
    const fechaRefinanciacion = new Date(datos.fechaRefinanciacion);

    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "LetraCambio" WHERE id = ${BigInt(letraId)} FOR UPDATE`;
      const origen = await tx.letraCambio.findUnique({
        where: { id: BigInt(letraId) },
        include: { documentos: { orderBy: { id: "asc" } }, estado: true },
      });
      if (!origen) throw new NotFoundError("Letra de cambio no encontrada.");

      const estados = await obtenerEstadosLetra(tx);
      const refinanciables = ESTADOS_REFINANCIABLES.map((k) => Number(estados[k]));
      if (!refinanciables.includes(Number(origen.estadoId))) {
        throw new ValidationError(`La letra ${origen.numeroDocumento} está ${origen.estado.descripcion}: solo se refinancian letras con capital pendiente (vigentes, vencidas, protestadas o parcialmente pagadas).`);
      }
      const saldo = r2(num(origen.saldoCapital));
      if (saldo <= 0) throw new ValidationError(`La letra ${origen.numeroDocumento} no tiene capital pendiente.`);

      const montosCent = letras.map((l, i) => {
        const monto = num(l.monto);
        if (!(monto > 0)) throw new ValidationError(`El monto de la letra nueva ${i + 1} debe ser mayor a cero.`);
        if (!l.fechaVencimiento) throw new ValidationError(`La fecha de vencimiento de la letra nueva ${i + 1} es obligatoria.`);
        if (new Date(l.fechaVencimiento) < fechaRefinanciacion) {
          throw new ValidationError(`La letra nueva ${i + 1} vence antes de la fecha de refinanciación.`);
        }
        return aCentimos(monto);
      });
      const totalCent = montosCent.reduce((a, b) => a + b, 0n);
      if (totalCent !== aCentimos(saldo)) {
        throw new ValidationError(
          `Las letras nuevas suman ${deCentimos(totalCent).toFixed(2)} y deben sumar exactamente el saldo de capital de la letra ${origen.numeroDocumento} (${saldo.toFixed(2)}). Los intereses y la mora se ingresan al momento de cada pago.`,
        );
      }

      const tipoDocumento = await obtenerTipoDocumentoLetra(tx);
      const auditoria = usuarioId ? BigInt(usuarioId) : null;

      // ── Letras nuevas ──────────────────────────────────────
      const nuevas = [];
      for (const [i, l] of letras.entries()) {
        const vencimiento = new Date(l.fechaVencimiento);
        const creada = await tx.letraCambio.create({
          data: {
            tipoLetra: origen.tipoLetra,
            empresaId: origen.empresaId,
            tipoDocumentoId: tipoDocumento.id,
            fechaEmision: fechaRefinanciacion,
            fechaVencimiento: vencimiento,
            giradoId: origen.giradoId,
            beneficiarioId: origen.beneficiarioId,
            avalId: origen.avalId,
            monedaId: origen.monedaId,
            montoOriginal: deCentimos(montosCent[i]),
            saldoCapital: deCentimos(montosCent[i]),
            estadoId: estados.VIGENTE,
            letraRenovadaId: origen.id,
            fechaLimiteProtesto: sumarDiasHabiles(vencimiento, DIAS_HABILES_PROTESTO),
            ubicacionLetraId: origen.ubicacionLetraId,
            observaciones: l.observaciones || `REFINANCIACIÓN DE LA LETRA ${origen.numeroDocumento}${datos.observaciones ? ` - ${datos.observaciones}` : ""}`,
            creadoPor: auditoria,
          },
        });
        const numero = numeroLetraDesdeId(origen.tipoLetra, creada.id);
        nuevas.push(
          await tx.letraCambio.update({
            where: { id: creada.id },
            data: { numeroDocumento: numero, numSerieDoc: numero.split("-")[0], numCorreDoc: numero.split("-")[1] },
          }),
        );
      }

      // ── Facturas: lo que falta de cada una pasa a las letras nuevas ──
      const faltaCent = origen.documentos.map((d) => aCentimos(Math.max(0, num(d.montoCanjeado) - num(d.capitalPagado))));
      let d = 0;
      while (d < faltaCent.length && faltaCent[d] === 0n) d++;
      let resto = faltaCent[d];
      for (const [i, nueva] of nuevas.entries()) {
        let restoLetra = montosCent[i];
        while (restoLetra > 0n && d < faltaCent.length) {
          const tomar = restoLetra < resto ? restoLetra : resto;
          const doc = origen.documentos[d];
          await tx.letraCambioDocumento.create({
            data: {
              letraCambioId: nueva.id,
              cuentaPorPagarId: doc.cuentaPorPagarId,
              cuentaPorCobrarId: doc.cuentaPorCobrarId,
              montoCanjeado: deCentimos(tomar),
              capitalPagado: 0,
              creadoPor: auditoria,
            },
          });
          restoLetra -= tomar;
          resto -= tomar;
          while (resto === 0n && d < faltaCent.length) {
            d++;
            while (d < faltaCent.length && faltaCent[d] === 0n) d++;
            resto = faltaCent[d];
          }
        }
      }
      // La letra origen conserva de cada factura solo lo ya pagado
      for (const doc of origen.documentos) {
        await tx.letraCambioDocumento.update({ where: { id: doc.id }, data: { montoCanjeado: doc.capitalPagado } });
      }

      await tx.letraCambio.update({
        where: { id: origen.id },
        data: {
          estadoId: estados.REFINANCIADA,
          renovada: true,
          saldoCapital: 0,
          fechaRefinanciacion,
          actualizadoPor: auditoria,
          observaciones: [origen.observaciones, `REFINANCIADA EL ${formatearFecha(fechaRefinanciacion)} EN ${nuevas.map((n) => n.numeroDocumento).join(", ")}`].filter(Boolean).join(" | "),
        },
      });

      return {
        letraOrigen: { id: origen.id, numeroDocumento: origen.numeroDocumento, saldoRefinanciado: saldo },
        letrasNuevas: nuevas.map((n) => ({ id: n.id, numeroDocumento: n.numeroDocumento, fechaVencimiento: n.fechaVencimiento, montoOriginal: num(n.montoOriginal) })),
      };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al refinanciar la letra", err.message);
    throw err;
  }
}

/**
 * Revierte una refinanciación: elimina las letras nuevas y devuelve la origen a su estado anterior.
 * Solo si ninguna letra nueva tiene pagos, ni fue refinanciada o protestada.
 */
export async function revertirRefinanciacion({ letraId, usuarioId }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const origen = await tx.letraCambio.findUnique({
        where: { id: BigInt(letraId) },
        include: { documentos: true, pagos: true, renovaciones: { include: { documentos: true, pagos: true } } },
      });
      if (!origen) throw new NotFoundError("Letra de cambio no encontrada.");
      if (!origen.renovada || origen.renovaciones.length === 0) {
        throw new ValidationError(`La letra ${origen.numeroDocumento} no fue refinanciada.`);
      }
      for (const n of origen.renovaciones) {
        if (n.pagos.length > 0) throw new ValidationError(`La letra ${n.numeroDocumento}, nacida de la refinanciación, ya tiene pagos: revierta primero esos pagos en Tesorería.`);
        if (n.renovada) throw new ValidationError(`La letra ${n.numeroDocumento} fue refinanciada otra vez: revierta primero esa refinanciación.`);
        if (n.protestada) throw new ValidationError(`La letra ${n.numeroDocumento} está protestada: no se puede revertir la refinanciación.`);
      }

      const estados = await obtenerEstadosLetra(tx);
      // Lo que cada factura tenía en las letras nuevas vuelve a la letra origen
      const devolver = new Map();
      for (const n of origen.renovaciones) {
        for (const doc of n.documentos) {
          const clave = String(doc.cuentaPorPagarId || `C${doc.cuentaPorCobrarId}`);
          devolver.set(clave, (devolver.get(clave) || 0) + num(doc.montoCanjeado));
        }
      }
      await tx.letraCambioDocumento.deleteMany({ where: { letraCambioId: { in: origen.renovaciones.map((n) => n.id) } } });
      await tx.letraCambio.deleteMany({ where: { id: { in: origen.renovaciones.map((n) => n.id) } } });

      for (const doc of origen.documentos) {
        const clave = String(doc.cuentaPorPagarId || `C${doc.cuentaPorCobrarId}`);
        await tx.letraCambioDocumento.update({
          where: { id: doc.id },
          data: { montoCanjeado: r2(num(doc.montoCanjeado) + (devolver.get(clave) || 0)) },
        });
      }

      const capitalPagado = r2(origen.pagos.reduce((a, p) => a + num(p.montoCapital), 0));
      const saldoCapital = r2(num(origen.montoOriginal) - capitalPagado);
      const hoy = new Date();
      const estadoId = origen.protestada
        ? estados.PROTESTADA
        : new Date(origen.fechaVencimiento) < hoy
          ? estados.VENCIDA
          : capitalPagado > 0
            ? estados.PAGADA_PARCIAL
            : estados.VIGENTE;
      await tx.letraCambio.update({
        where: { id: origen.id },
        data: { estadoId, renovada: false, saldoCapital, fechaRefinanciacion: null, actualizadoPor: usuarioId ? BigInt(usuarioId) : null },
      });
      return { letraOrigen: { id: origen.id, numeroDocumento: origen.numeroDocumento, saldoCapital }, letrasEliminadas: origen.renovaciones.map((n) => n.numeroDocumento) };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al revertir la refinanciación", err.message);
    throw err;
  }
}

export default { refinanciar, revertirRefinanciacion };
