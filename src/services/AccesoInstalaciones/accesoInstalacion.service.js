import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AccesoInstalacion
 * Aplica validaciones de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales (sedeId y tipoAccesoId).
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {BigInt} sedeId
 * @param {BigInt} tipoAccesoId
 */
async function validarForaneas(sedeId, tipoAccesoId) {
  const sede = await prisma.sedesEmpresa.findUnique({ where: { id: sedeId } });
  if (!sede) throw new ValidationError('La sede referenciada no existe.');
  const tipoAcceso = await prisma.tipoAccesoInstalacion.findUnique({ where: { id: tipoAccesoId } });
  if (!tipoAcceso) throw new ValidationError('El tipo de acceso referenciado no existe.');
}

/**
 * Lista todos los accesos a instalaciones con todas las relaciones necesarias.
 */
const listar = async () => {
  try {
    return await prisma.accesoInstalacion.findMany({
      include: {
        tipoAcceso: true,        // Relación con TipoAccesoInstalacion
        tipoPersona: true,       // Relación con TipoPersona
        motivoAcceso: true,      // Relación con MotivoAcceso
        tipoEquipo: true,        // Relación con TipoEquipo
        detalles: true,          // Relación con AccesoInstalacionDetalle
        personalIngreso: true,   // ⭐ NUEVO - Relación con Personal (quien ingresa)
        personalDestino: true,   // ⭐ NUEVO - Relación con Personal (a quien visita)
        entidadComercial: true,  // ⭐ NUEVO - Relación con EntidadComercial
        contactoEntidad: true    // ⭐ NUEVO - Relación con ContactoEntidad
      },
      orderBy: {
        fechaHora: 'desc'        // Ordenar por fecha más reciente primero
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un acceso a instalación por ID con todas las relaciones necesarias.
 */
const obtenerPorId = async (id) => {
  try {
    const acceso = await prisma.accesoInstalacion.findUnique({ 
      where: { id }, 
      include: {
        tipoAcceso: true,        // Relación con TipoAccesoInstalacion
        tipoPersona: true,       // Relación con TipoPersona
        motivoAcceso: true,      // Relación con MotivoAcceso
        tipoEquipo: true,        // Relación con TipoEquipo
        detalles: true,          // Relación con AccesoInstalacionDetalle
        personalIngreso: true,   // ⭐ NUEVO - Relación con Personal (quien ingresa)
        personalDestino: true,   // ⭐ NUEVO - Relación con Personal (a quien visita)
        entidadComercial: true,  // ⭐ NUEVO - Relación con EntidadComercial
        contactoEntidad: true    // ⭐ NUEVO - Relación con ContactoEntidad
      }
    });
    if (!acceso) throw new NotFoundError('AccesoInstalacion no encontrado');
    return acceso;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un acceso a instalación validando existencia de claves foráneas principales y campos obligatorios.
 * Automáticamente crea también el registro de detalle inicial (ENTRADA).
 */
const crear = async (data) => {
  try {
    if (!data.sedeId || !data.tipoAccesoId || !data.fechaHora) {
      throw new ValidationError('Los campos sedeId, tipoAccesoId y fechaHora son obligatorios.');
    }
    await validarForaneas(data.sedeId, data.tipoAccesoId);
    
    // Usar transacción para crear tanto el acceso como su detalle inicial
    return await prisma.$transaction(async (tx) => {
      // 1. Crear el registro principal de AccesoInstalacion
      const nuevoAcceso = await tx.accesoInstalacion.create({ data });
      
      // 2. Crear automáticamente el registro de detalle inicial (ENTRADA)
      await tx.accesoInstalacionDetalle.create({
        data: {
          accesoInstalacionId: nuevoAcceso.id,
          fechaHora: data.fechaHora,
          tipoMovimientoId: BigInt(1), // 1 = ENTRADA (según catálogo TipoMovimientoAcceso)
          areaDestinoVisitaId: data.areaDestinoVisitaId || null,
          observaciones: 'Registro automático de ingreso'
        }
      });
      
      // 3. Retornar el acceso creado con sus relaciones
      return await tx.accesoInstalacion.findUnique({
        where: { id: nuevoAcceso.id },
        include: {
          tipoAcceso: true,
          tipoPersona: true,
          motivoAcceso: true,
          tipoEquipo: true,
          detalles: true,
          personalIngreso: true,   // ⭐ NUEVO - Relación con Personal (quien ingresa)
          personalDestino: true,   // ⭐ NUEVO - Relación con Personal (a quien visita)
          entidadComercial: true,  // ⭐ NUEVO - Relación con EntidadComercial
          contactoEntidad: true    // ⭐ NUEVO - Relación con ContactoEntidad
        }
      });
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un acceso a instalación existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.accesoInstalacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('AccesoInstalacion no encontrado');
    if (data.sedeId !== undefined && data.sedeId !== null) {
      await validarForaneas(data.sedeId, data.tipoAccesoId ?? existente.tipoAccesoId);
    } else if (data.tipoAccesoId !== undefined && data.tipoAccesoId !== null) {
      await validarForaneas(existente.sedeId, data.tipoAccesoId);
    }
    return await prisma.accesoInstalacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Busca una persona por número de documento en registros de AccesoInstalacion.
 * Retorna los datos de la persona más reciente encontrada para autocompletado.
 * @param {string} numeroDocumento - Número de documento a buscar
 * @returns {Object|null} - Datos de la persona encontrada o null si no existe
 */
const buscarPersonaPorDocumento = async (numeroDocumento) => {
  try {
    if (!numeroDocumento || numeroDocumento.trim() === '') {
      throw new ValidationError('El número de documento es obligatorio.');
    }

    // Buscar el registro más reciente de la persona por número de documento
    const persona = await prisma.accesoInstalacion.findFirst({
      where: { numeroDocumento },
      orderBy: { fechaHora: 'desc' }, // Obtener el último registro por fecha
      select: {
        id: true,
        tipoPersonaId: true,        // Campo requerido para autocompletado
        nombrePersona: true,        // Campo requerido para autocompletado
        tipoDocIdentidadId: true,   // Campo requerido para autocompletado
        numeroDocumento: true,      // Campo requerido para autocompletado
        fechaHora: true
      }
    });

    if (!persona) {
      return null; // No se encontró la persona
    }

    return {
      encontrada: true,
      persona: {
        tipoPersonaId: persona.tipoPersonaId,
        nombrePersona: persona.nombrePersona,
        tipoDocIdentidadId: persona.tipoDocIdentidadId,
        numeroDocumento: persona.numeroDocumento,
        ultimoAcceso: persona.fechaHora
      }
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos al buscar persona', err.message);
    throw err;
  }
};

/**
 * Busca datos de vehículo por número de placa en registros de AccesoInstalacion.
 * Retorna los datos del vehículo más reciente encontrado que tenga todos los campos completos.
 * @param {string} numeroPlaca - Número de placa a buscar
 * @returns {Object|null} - Datos del vehículo encontrado o null si no existe
 */
const buscarVehiculoPorPlaca = async (numeroPlaca) => {
  try {
    if (!numeroPlaca || numeroPlaca.trim() === '') {
      throw new ValidationError('El número de placa es obligatorio.');
    }

    // Buscar el registro más reciente del vehículo por número de placa
    // Solo considerar registros que tengan todos los campos de vehículo completos
    const vehiculo = await prisma.accesoInstalacion.findFirst({
      where: {
        vehiculoNroPlaca: numeroPlaca.trim().toUpperCase(),
        // Asegurar que todos los campos de vehículo estén llenos para datos fiables
        vehiculoMarca: { not: null },
        vehiculoModelo: { not: null },
        vehiculoColor: { not: null },
        // Además, verificar que no sean strings vacíos
        AND: [
          { vehiculoMarca: { not: '' } },
          { vehiculoModelo: { not: '' } },
          { vehiculoColor: { not: '' } }
        ]
      },
      orderBy: { fechaHora: 'desc' }, // Obtener el último registro por fecha
      select: {
        id: true,
        vehiculoNroPlaca: true,
        vehiculoMarca: true,
        vehiculoModelo: true,
        vehiculoColor: true,
        fechaHora: true,
        nombrePersona: true // Para referencia
      }
    });

    if (!vehiculo) {
      return null; // No se encontró el vehículo con datos completos
    }

    return {
      encontrado: true,
      vehiculo: {
        vehiculoNroPlaca: vehiculo.vehiculoNroPlaca,
        vehiculoMarca: vehiculo.vehiculoMarca,
        vehiculoModelo: vehiculo.vehiculoModelo,
        vehiculoColor: vehiculo.vehiculoColor,
        ultimoAcceso: vehiculo.fechaHora,
        ultimoUsuario: vehiculo.nombrePersona
      }
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos al buscar vehículo', err.message);
    throw err;
  }
};

/**
 * Busca persona por DNI en múltiples fuentes (cascada optimizada).
 * Prioridad: 1) Personal → 2) Histórico AccesoInstalacion → 3) RENIEC
 * NOTA: ContactoEntidad deshabilitado temporalmente (falta campo numeroDocumento en schema)
 * 
 * @param {string} dni - Número de documento a buscar
 * @returns {Promise<Object>} Resultado con origen y datos de la persona
 */
const buscarPersonaPorDNI = async (dni) => {
  try {
    if (!dni || dni.trim() === '') {
      throw new ValidationError('El número de documento es obligatorio.');
    }

    const dniLimpio = dni.trim();

    // ========================================
    // 1️⃣ PRIMERA BÚSQUEDA: Tabla PERSONAL
    // ========================================
    const personales = await prisma.personal.findMany({
      where: {
        numeroDocumento: dniLimpio,
        cesado: false  // Solo personal activo
      },
      include: {
        cargo: {
          select: {
            id: true,
            descripcion: true  // ✅ CargosPersonal solo tiene 'descripcion'
          }
        },
        tipoDocIdentidad: {
          select: {
            id: true,
            codigo: true,      // ✅ TiposDocIdentidad tiene 'codigo' y 'nombre'
            nombre: true
          }
        }
      }
    });

    if (personales.length > 0) {
      // Si hay múltiples registros, buscar el que tiene marcaAsistencia = true
      const personalConAsistencia = personales.find(p => p.marcaAsistencia === true);
      const personalSeleccionado = personalConAsistencia || personales[0];

      return {
        encontrado: true,
        origen: 'PERSONAL',
        tipoPersonaSugerido: 'PERSONAL INTERNO',
        datos: {
          nombreCompleto: `${personalSeleccionado.nombres} ${personalSeleccionado.apellidos}`.trim(),
          numeroDocumento: dniLimpio,
          personalIngresoId: personalSeleccionado.id,
          marcaAsistencia: personalSeleccionado.marcaAsistencia,
          esAdministrativo: personalSeleccionado.esAdministrativo,
          cargoDescripcion: personalSeleccionado.cargo?.descripcion || null
        }
      };
    }

    // ========================================
    // 2️⃣ SEGUNDA BÚSQUEDA: ContactoEntidad
    const contacto = await prisma.contactoEntidad.findFirst({
      where: {
        numeroDocumento: dniLimpio,
        activo: true
      },
      include: {
        entidadComercial: {
          select: {
            id: true,
            razonSocial: true,
            numeroDocumento: true
          }
        }
      }
    });

    if (contacto) {
      return {
        encontrado: true,
        origen: 'CONTACTO_ENTIDAD',
        tipoPersonaSugerido: 'CLIENTE/PROVEEDOR',
        datos: {
          nombreCompleto: contacto.nombres,
          numeroDocumento: dniLimpio,
          entidadComercialId: contacto.entidadComercialId,
          contactoEntidadId: contacto.id,
          razonSocialEntidad: contacto.entidadComercial.razonSocial
        }
      };
    }
    

    // ========================================
    // 3️⃣ TERCERA BÚSQUEDA: Histórico AccesoInstalacion
    // ========================================
    const historico = await prisma.accesoInstalacion.findFirst({
      where: {
        numeroDocumento: dniLimpio
      },
      orderBy: {
        fechaHora: 'desc'  // Obtener el registro más reciente
      },
      select: {
        id: true,
        nombrePersona: true,
        tipoPersonaId: true,
        tipoDocIdentidadId: true,
        numeroDocumento: true,
        fechaHora: true
      }
    });

    if (historico) {
      return {
        encontrado: true,
        origen: 'HISTORICO',
        tipoPersonaSugerido: 'VISITANTE RECURRENTE',
        datos: {
          nombreCompleto: historico.nombrePersona,
          numeroDocumento: dniLimpio,
          tipoPersonaId: historico.tipoPersonaId,
          tipoDocIdentidadId: historico.tipoDocIdentidadId,
          ultimaVisita: historico.fechaHora
        }
      };
    }

    // ========================================
    // 4️⃣ CUARTA BÚSQUEDA: API RENIEC (Decoleta)
    // ========================================
    try {
      const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;
      
      if (!token) {
        console.warn('⚠️ Token RENIEC no configurado - búsqueda RENIEC omitida');
        return {
          encontrado: false,
          mensaje: 'DNI no encontrado en registros internos y servicio RENIEC no disponible'
        };
      }

      const response = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${dniLimpio}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const reniecData = await response.json();
        
        // ✅ Validar que la respuesta tenga los campos necesarios
        if (!reniecData || typeof reniecData !== 'object') {
          console.error('❌ Respuesta RENIEC inválida:', reniecData);
          return {
            encontrado: false,
            mensaje: 'Respuesta de RENIEC inválida'
          };
        }

        // ✅ Construir nombre completo con validación de campos
        // API RENIEC usa: first_name, first_last_name, second_last_name
        const nombres = reniecData.first_name || '';
        const apellidoPaterno = reniecData.first_last_name || '';
        const apellidoMaterno = reniecData.second_last_name || '';
        
        const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();

        // ✅ Validar que al menos tengamos un nombre
        if (!nombreCompleto) {
          console.error('❌ No se pudo extraer nombre de la respuesta RENIEC');
          return {
            encontrado: false,
            mensaje: 'No se pudo obtener el nombre desde RENIEC'
          };
        }

        return {
          encontrado: true,
          origen: 'RENIEC',
          tipoPersonaSugerido: 'VISITANTE EXTERNO',
          datos: {
            nombreCompleto,
            numeroDocumento: dniLimpio,
            nombres,
            apellidoPaterno,
            apellidoMaterno
          }
        };
      }

      // RENIEC no encontró el DNI
      return {
        encontrado: false,
        mensaje: 'DNI no encontrado en ninguna base de datos (Personal, Histórico, RENIEC)'
      };

    } catch (errorReniec) {
      console.error('❌ Error consultando RENIEC:', errorReniec);
      return {
        encontrado: false,
        mensaje: 'DNI no encontrado en registros internos y error al consultar RENIEC'
      };
    }

  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos al buscar persona por DNI', err.message);
    throw err;
  }
};

/**
 * Procesa la salida definitiva de un acceso a instalación
 * Actualiza fechaHoraSalidaDefinitiva con la fecha/hora actual y marca accesoSellado como true
 * @param {BigInt} id - ID del acceso a instalación
 * @returns {Object} - Acceso actualizado con todas las relaciones
 */
const procesarSalidaDefinitiva = async (id) => {
  try {
    // Verificar que el acceso existe
    const acceso = await prisma.accesoInstalacion.findUnique({ where: { id } });
    if (!acceso) throw new NotFoundError('AccesoInstalacion no encontrado');
    
    // Verificar que no esté ya sellado
    if (acceso.accesoSellado) {
      throw new ConflictError('Este acceso ya está sellado y no puede ser modificado');
    }
    
    // Verificar que no tenga ya salida definitiva
    if (acceso.fechaHoraSalidaDefinitiva) {
      throw new ConflictError('Este acceso ya tiene salida definitiva procesada');
    }
    
    // Usar transacción para actualizar el acceso y crear el movimiento de salida definitiva
    return await prisma.$transaction(async (tx) => {
      // 1. Actualizar el acceso con fecha de salida definitiva y sellado
      const accesoActualizado = await tx.accesoInstalacion.update({
        where: { id },
        data: {
          fechaHoraSalidaDefinitiva: new Date(),
          accesoSellado: true
        }
      });
      
      // 2. Crear el movimiento de salida definitiva
      await tx.accesoInstalacionDetalle.create({
        data: {
          accesoInstalacionId: id,
          fechaHora: new Date(),
          tipoMovimientoId: BigInt(4), // 4 = SALIDA DEFINITIVA (según catálogo TipoMovimientoAcceso)
          areaDestinoVisitaId: acceso.areaDestinoVisitaId || null,
          observaciones: 'Salida definitiva procesada automáticamente'
        }
      });
      
      // 3. Retornar el acceso actualizado con todas las relaciones
      return await tx.accesoInstalacion.findUnique({
        where: { id },
        include: {
          tipoAcceso: true,
          tipoPersona: true,
          motivoAcceso: true,
          tipoEquipo: true,
          detalles: true,
          personalIngreso: true,   // ⭐ NUEVO - Relación con Personal (quien ingresa)
          personalDestino: true,   // ⭐ NUEVO - Relación con Personal (a quien visita)
          entidadComercial: true,  // ⭐ NUEVO - Relación con EntidadComercial
          contactoEntidad: true    // ⭐ NUEVO - Relación con ContactoEntidad
        }
      });
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos al procesar salida definitiva', err.message);
    throw err;
  }
};

/**
 * Elimina un acceso a instalación por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.accesoInstalacion.findUnique({ where: { id }, include: { detalles: true } });
    if (!existente) throw new NotFoundError('AccesoInstalacion no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.accesoInstalacion.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
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
  buscarPersonaPorDocumento,
  buscarVehiculoPorPlaca,
  procesarSalidaDefinitiva,
  buscarPersonaPorDNI  // ⭐ NUEVO - Búsqueda unificada por DNI
};