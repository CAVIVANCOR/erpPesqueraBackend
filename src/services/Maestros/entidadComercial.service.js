import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntidadComercial
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de numeroDocumento+empresaId y existencia de claves foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos de la entidad comercial
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarEntidadComercial(data, excluirId = null) {
  // Validar unicidad de numeroDocumento+empresaId
  if (data.numeroDocumento && data.empresaId) {
    const where = excluirId ? {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId,
      id: { not: excluirId }
    } : {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId
    };
    const existe = await prisma.entidadComercial.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una entidad comercial con ese número de documento para la empresa.');
  }
  // Validar existencia de claves foráneas obligatorias
  const claves = [
    { campo: 'empresaId', modelo: 'empresa' },
    { campo: 'tipoDocumentoId', modelo: 'tiposDocIdentidad' },
    { campo: 'tipoEntidadId', modelo: 'tipoEntidad' },
    { campo: 'formaPagoId', modelo: 'formaPago' },
    { campo: 'vendedorId', modelo: 'personal' },
    { campo: 'agenciaEnvioId', modelo: 'entidadComercial' } // autoconsulta para agencia
  ];
  for (const ref of claves) {
    if (data[ref.campo]) {
      const existe = await prisma[ref.modelo].findUnique({ where: { id: data[ref.campo] } });
      if (!existe) throw new ValidationError(`Referencia foránea inválida: ${ref.campo}`);
    }
  }
  // Validar agrupacionEntidadId si se provee
  if (data.agrupacionEntidadId) {
    const agrup = await prisma.agrupacionEntidad.findUnique({ where: { id: data.agrupacionEntidadId } });
    if (!agrup) throw new ValidationError('Agrupación de entidad no existente.');
  }
}

/**
 * Función auxiliar para merge inteligente de campos
 * Si ambos tienen valor y son diferentes, concatena con " + "
 */
function mergeInteligente(valorOrigen, valorDestino) {
  const esVacioOrigen = !valorOrigen || (typeof valorOrigen === 'string' && valorOrigen.trim() === '');
  const esVacioDestino = !valorDestino || (typeof valorDestino === 'string' && valorDestino.trim() === '');
  
  if (!esVacioOrigen && esVacioDestino) {
    return valorOrigen;
  }
  
  if (esVacioOrigen && !esVacioDestino) {
    return valorDestino;
  }
  
  if (!esVacioOrigen && !esVacioDestino) {
    const strOrigen = valorOrigen.toString().trim();
    const strDestino = valorDestino.toString().trim();
    if (strOrigen === strDestino) {
      return valorDestino;
    }
    return `${valorDestino} + ${valorOrigen}`;
  }
  
  return valorDestino;
}

/**
 * Lista todas las entidades comerciales, incluyendo relaciones principales.
 */
const listar = async () => {
  try {
    const entidades = await prisma.entidadComercial.findMany({
      include: {
        tipoDocumento: true,
        tipoEntidad: true,
        formaPago: true,
        agrupacionEntidad: true,
        contactos: true,
        direcciones: {
          include: {
            ubigeo: true
          }
        },
        precios: true,
        vehiculos: true,
        lineasCredito: true
      }
    });

    const entidadesConAuditoria = await Promise.all(
      entidades.map(async (entidad) => {
        const personalCreador = entidad.creadoPor
          ? await prisma.personal.findUnique({
              where: { id: entidad.creadoPor },
              select: { id: true, nombres: true, apellidos: true }
            })
          : null;

        const personalActualizador = entidad.actualizadoPor
          ? await prisma.personal.findUnique({
              where: { id: entidad.actualizadoPor },
              select: { id: true, nombres: true, apellidos: true }
            })
          : null;

        const empresa = entidad.empresaId
          ? await prisma.empresa.findUnique({
              where: { id: entidad.empresaId },
              select: { id: true, razonSocial: true, nombreComercial: true }
            })
          : null;

        return {
          ...entidad,
          personalCreador,
          personalActualizador,
          empresa
        };
      })
    );

    return entidadesConAuditoria;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una entidad comercial por ID (incluyendo relaciones principales).
 */
const obtenerPorId = async (id) => {
  try {
    const entidad = await prisma.entidadComercial.findUnique({
      where: { id },
      include: {
        tipoDocumento: true,
        tipoEntidad: true,
        formaPago: true,
        agrupacionEntidad: true,
        contactos: true,
        direcciones: {
          include: {
            ubigeo: true
          }
        },
        precios: true,
        vehiculos: true,
        lineasCredito: true
      }
    });
    if (!entidad) throw new NotFoundError('Entidad comercial no encontrada');

    // Agregar manualmente las relaciones con Personal para auditoría
    const personalCreador = entidad.creadoPor
      ? await prisma.personal.findUnique({
          where: { id: entidad.creadoPor },
          select: { id: true, nombres: true, apellidos: true }
        })
      : null;

    const personalActualizador = entidad.actualizadoPor
      ? await prisma.personal.findUnique({
          where: { id: entidad.actualizadoPor },
          select: { id: true, nombres: true, apellidos: true }
        })
      : null;

    return {
      ...entidad,
      personalCreador,
      personalActualizador
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una entidad comercial validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarEntidadComercial(data);
    
    // Preparar datos con campos de auditoría
    const dataConAuditoria = {
      ...data,
      // Si creadoEn no viene o es null, asignar fecha actual
      creadoEn: data.creadoEn || new Date(),
      // Si actualizadoEn no viene o es null, asignar fecha actual
      actualizadoEn: data.actualizadoEn || new Date(),
      // creadoPor y actualizadoPor vienen del frontend, pero validar que sean números o null
      creadoPor: data.creadoPor ? Number(data.creadoPor) : null,
      actualizadoPor: data.actualizadoPor ? Number(data.actualizadoPor) : null
    };

    const entidadCreada = await prisma.entidadComercial.create({ data: dataConAuditoria });

    // Agregar manualmente las relaciones con Personal para auditoría
    const personalCreador = entidadCreada.creadoPor
      ? await prisma.personal.findUnique({
          where: { id: entidadCreada.creadoPor },
          select: { id: true, nombres: true, apellidos: true }
        })
      : null;

    const personalActualizador = entidadCreada.actualizadoPor
      ? await prisma.personal.findUnique({
          where: { id: entidadCreada.actualizadoPor },
          select: { id: true, nombres: true, apellidos: true }
        })
      : null;

    return {
      ...entidadCreada,
      personalCreador,
      personalActualizador
    };
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una entidad comercial existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entidadComercial.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Entidad comercial no encontrada');
    await validarEntidadComercial(data, id);
    
    // Preparar datos con campos de auditoría
    const dataConAuditoria = {
      ...data,
      // Si creadoEn no viene o es null, mantener el existente o asignar fecha actual
      creadoEn: data.creadoEn || existente.creadoEn || new Date(),
      // Siempre actualizar actualizadoEn con la fecha actual
      actualizadoEn: new Date(),
      // Si creadoPor no viene o es null, mantener el existente
      creadoPor: data.creadoPor ? Number(data.creadoPor) : existente.creadoPor,
      // Siempre actualizar actualizadoPor
      actualizadoPor: data.actualizadoPor ? Number(data.actualizadoPor) : null
    };

    const entidadActualizada = await prisma.entidadComercial.update({ 
      where: { id }, 
      data: dataConAuditoria 
    });

    // Agregar manualmente las relaciones con Personal para auditoría
    const personalCreador = entidadActualizada.creadoPor
      ? await prisma.personal.findUnique({
          where: { id: entidadActualizada.creadoPor },
          select: { id: true, nombres: true, apellidos: true }
        })
      : null;

    const personalActualizador = entidadActualizada.actualizadoPor
      ? await prisma.personal.findUnique({
          where: { id: entidadActualizada.actualizadoPor },
          select: { id: true, nombres: true, apellidos: true }
        })
      : null;

    return {
      ...entidadActualizada,
      personalCreador,
      personalActualizador
    };
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una entidad comercial por ID, validando existencia y que no tenga relaciones dependientes.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.entidadComercial.findUnique({
      where: { id },
      include: {
        contactos: true,
        direcciones: true,
        precios: true,
        vehiculos: true,
        lineasCredito: true,
        movimientosAlmacen: true,
        kardexAlmacenes: true,
        requerimientosCompra: true,
        ordenesCompra: true,
        preFacturas: true
      }
    });
    if (!existente) throw new NotFoundError('Entidad comercial no encontrada');
    const dependientes = [
      'contactos', 'direcciones', 'precios', 'vehiculos', 'lineasCredito',
      'movimientosAlmacen', 'kardexAlmacenes', 'requerimientosCompra', 'ordenesCompra', 'preFacturas'
    ];
    for (const rel of dependientes) {
      if (Array.isArray(existente[rel]) && existente[rel].length > 0) {
        throw new ConflictError(`No se puede eliminar la entidad comercial porque tiene ${rel} asociados.`);
      }
    }
    await prisma.entidadComercial.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene las agencias de envío (entidades comerciales del tipo "AGENCIA DE ENVIO")
 */
const obtenerAgenciasEnvio = async () => {
  try {
    // Primero buscar el ID del tipo de entidad "AGENCIA DE ENVIO"
    const tipoAgencia = await prisma.tipoEntidad.findFirst({
      where: { nombre: "AGENCIA DE ENVIO" }
    });
    
    if (!tipoAgencia) {
      return []; // Si no existe el tipo, retornar array vacío
    }
    
    // Buscar todas las entidades comerciales de este tipo
    return await prisma.entidadComercial.findMany({
      where: { 
        tipoEntidadId: tipoAgencia.id,
        estado: true // Solo agencias activas
      },
      select: {
        id: true,
        razonSocial: true,
        nombreComercial: true
      },
      orderBy: {
        razonSocial: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene los proveedores GPS (entidades comerciales del tipo "PROVEEDOR EQUIPOS GEOLOCALIZACION")
 */
const obtenerProveedoresGps = async () => {
  try {
    // Primero buscar el ID del tipo de entidad "PROVEEDOR EQUIPOS GEOLOCALIZACION"
    const tipoProveedorGps = await prisma.tipoEntidad.findFirst({
      where: { nombre: "PROVEEDOR EQUIPOS GEOLOCALIZACION" }
    });
    
    if (!tipoProveedorGps) {
      return []; // Si no existe el tipo, retornar array vacío
    }
    
    // Buscar todas las entidades comerciales de este tipo
    return await prisma.entidadComercial.findMany({
      where: { 
        tipoEntidadId: tipoProveedorGps.id,
        estado: true // Solo proveedores activos
      },
      select: {
        id: true,
        razonSocial: true,
        nombreComercial: true
      },
      orderBy: {
        razonSocial: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Clona una EntidadComercial y sus tablas relacionadas a todas las demás empresas del grupo
 * @param {BigInt} entidadId - ID de la entidad comercial a clonar
 * @returns {Object} Resumen de operaciones realizadas
 */
const clonarAEmpresas = async (entidadId) => {
  try {
    const entidadOrigen = await prisma.entidadComercial.findUnique({
      where: { id: entidadId },
      include: {
        direcciones: { include: { ubigeo: true } },
        contactos: true,
        ctaCteEntidad: { include: { banco: true, moneda: true } }
      }
    });

    if (!entidadOrigen) {
      throw new NotFoundError('Entidad comercial no encontrada');
    }

    const todasEmpresas = await prisma.empresa.findMany({
      where: {
        id: { not: entidadOrigen.empresaId }
      }
    });

    const resumen = {
      empresasProcesadas: 0,
      entidadesCreadas: 0,
      entidadesActualizadas: 0,
      direccionesCreadas: 0,
      direccionesActualizadas: 0,
      contactosCreados: 0,
      contactosActualizados: 0,
      ctaCteCreadas: 0,
      ctaCteActualizadas: 0,
      errores: []
    };

    for (const empresaDestino of todasEmpresas) {
      try {
        resumen.empresasProcesadas++;

        const entidadDestino = await prisma.entidadComercial.findFirst({
          where: {
            empresaId: empresaDestino.id,
            numeroDocumento: entidadOrigen.numeroDocumento
          },
          include: {
            direcciones: true,
            contactos: true,
            ctaCteEntidad: true
          }
        });

        let entidadDestinoId;

        if (!entidadDestino) {
          const { id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, 
                  direcciones, contactos, ctaCteEntidad, 
                  tipoDocumento, tipoEntidad, formaPago, agrupacionEntidad,
                  ...datosEntidad } = entidadOrigen;

          const nuevaEntidad = await prisma.entidadComercial.create({
            data: {
              ...datosEntidad,
              empresaId: empresaDestino.id,
              creadoEn: new Date(),
              actualizadoEn: new Date()
            }
          });

          entidadDestinoId = nuevaEntidad.id;
          resumen.entidadesCreadas++;
        } else {
          const camposTexto = ['nombreComercial', 'observaciones', 'codigoErpFinanciero'];
          const dataActualizar = {};

          for (const campo of camposTexto) {
            if (entidadOrigen[campo] !== undefined) {
              dataActualizar[campo] = mergeInteligente(entidadOrigen[campo], entidadDestino[campo]);
            }
          }

          const camposBooleanos = ['esCliente', 'esProveedor', 'esCorporativo', 'custodiaStock', 
                                   'controlLote', 'controlFechaVenc', 'controlFechaProd', 
                                   'controlFechaIngreso', 'controlSerie', 'controlEnvase',
                                   'sujetoRetencion', 'sujetoPercepcion', 'esAgenteRetencion',
                                   'condicionHabidoSUNAT', 'estadoActivoSUNAT'];

          for (const campo of camposBooleanos) {
            if (!entidadDestino[campo] && entidadOrigen[campo]) {
              dataActualizar[campo] = entidadOrigen[campo];
            }
          }

          if (Object.keys(dataActualizar).length > 0) {
            await prisma.entidadComercial.update({
              where: { id: entidadDestino.id },
              data: {
                ...dataActualizar,
                actualizadoEn: new Date()
              }
            });
            resumen.entidadesActualizadas++;
          }

          entidadDestinoId = entidadDestino.id;
        }

        for (const direccionOrigen of entidadOrigen.direcciones) {
          const direccionDestino = entidadDestino?.direcciones.find(d => 
            d.direccion === direccionOrigen.direccion && 
            Number(d.ubigeoId) === Number(direccionOrigen.ubigeoId)
          );

          if (!direccionDestino) {
            const { id, entidadComercialId, fechaCreacion, fechaActualizacion, 
                    creadoPor, actualizadoPor, ubigeo, ...datosDireccion } = direccionOrigen;

            await prisma.direccionEntidad.create({
              data: {
                ...datosDireccion,
                entidadComercialId: entidadDestinoId,
                fechaCreacion: new Date()
              }
            });
            resumen.direccionesCreadas++;
          } else {
            const camposTexto = ['referencia', 'telefono', 'correo'];
            const dataActualizar = {};

            for (const campo of camposTexto) {
              if (direccionOrigen[campo] !== undefined) {
                dataActualizar[campo] = mergeInteligente(direccionOrigen[campo], direccionDestino[campo]);
              }
            }

            if (!direccionDestino.fiscal && direccionOrigen.fiscal) {
              dataActualizar.fiscal = direccionOrigen.fiscal;
            }
            if (!direccionDestino.almacenPrincipal && direccionOrigen.almacenPrincipal) {
              dataActualizar.almacenPrincipal = direccionOrigen.almacenPrincipal;
            }

            if (Object.keys(dataActualizar).length > 0) {
              await prisma.direccionEntidad.update({
                where: { id: direccionDestino.id },
                data: {
                  ...dataActualizar,
                  fechaActualizacion: new Date()
                }
              });
              resumen.direccionesActualizadas++;
            }
          }
        }

        for (const contactoOrigen of entidadOrigen.contactos) {
          const contactoDestino = entidadDestino?.contactos.find(c => 
            c.nombres === contactoOrigen.nombres && 
            Number(c.cargoId) === Number(contactoOrigen.cargoId)
          );

          if (!contactoDestino) {
            const { id, entidadComercialId, fechaCreacion, fechaActualizacion, 
                    creadoPor, actualizadoPor, ...datosContacto } = contactoOrigen;

            await prisma.contactoEntidad.create({
              data: {
                ...datosContacto,
                entidadComercialId: entidadDestinoId,
                fechaCreacion: new Date()
              }
            });
            resumen.contactosCreados++;
          } else {
            const camposTexto = ['telefono', 'correoCorportivo', 'correoPersonal', 'observaciones'];
            const dataActualizar = {};

            for (const campo of camposTexto) {
              if (contactoOrigen[campo] !== undefined) {
                dataActualizar[campo] = mergeInteligente(contactoOrigen[campo], contactoDestino[campo]);
              }
            }

            const camposBooleanos = ['compras', 'ventas', 'finanzas', 'logistica', 'representanteLegal'];
            for (const campo of camposBooleanos) {
              if (!contactoDestino[campo] && contactoOrigen[campo]) {
                dataActualizar[campo] = contactoOrigen[campo];
              }
            }

            if (Object.keys(dataActualizar).length > 0) {
              await prisma.contactoEntidad.update({
                where: { id: contactoDestino.id },
                data: {
                  ...dataActualizar,
                  fechaActualizacion: new Date()
                }
              });
              resumen.contactosActualizados++;
            }
          }
        }

        for (const ctaCteOrigen of entidadOrigen.ctaCteEntidad) {
          const ctaCteDestino = entidadDestino?.ctaCteEntidad.find(c => 
            Number(c.bancoId) === Number(ctaCteOrigen.bancoId) && 
            c.numeroCuenta === ctaCteOrigen.numeroCuenta
          );

          if (!ctaCteDestino) {
            const { id, entidadComercialId, fechaCreacion, fechaActualizacion, 
                    creadoPor, actualizadoPor, banco, moneda, ...datosCtaCte } = ctaCteOrigen;

            await prisma.ctaCteEntidad.create({
              data: {
                ...datosCtaCte,
                entidadComercialId: entidadDestinoId,
                fechaCreacion: new Date()
              }
            });
            resumen.ctaCteCreadas++;
          } else {
            const camposTexto = ['numeroCuentaCCI', 'numeroTelefonoBilletera'];
            const dataActualizar = {};

            for (const campo of camposTexto) {
              if (ctaCteOrigen[campo] !== undefined) {
                dataActualizar[campo] = mergeInteligente(ctaCteOrigen[campo], ctaCteDestino[campo]);
              }
            }

            if (!ctaCteDestino.BilleteraDigital && ctaCteOrigen.BilleteraDigital) {
              dataActualizar.BilleteraDigital = ctaCteOrigen.BilleteraDigital;
            }

            if (Object.keys(dataActualizar).length > 0) {
              await prisma.ctaCteEntidad.update({
                where: { id: ctaCteDestino.id },
                data: {
                  ...dataActualizar,
                  fechaActualizacion: new Date()
                }
              });
              resumen.ctaCteActualizadas++;
            }
          }
        }

      } catch (error) {
        resumen.errores.push({
          empresaId: empresaDestino.id,
          empresaNombre: empresaDestino.razonSocial,
          error: error.message
        });
      }
    }

    return resumen;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerAgenciasEnvio,
  obtenerProveedoresGps,
  clonarAEmpresas
};
