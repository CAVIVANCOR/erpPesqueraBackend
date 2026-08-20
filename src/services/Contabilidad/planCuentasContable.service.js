import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PlanCuentasContable
 * Gestiona el Plan Contable General Empresarial (PCGE) con estructura jerárquica de 5 niveles.
 * Documentado en español.
 */

/**
 * Valida los datos de una cuenta contable.
 * @param {Object} data - Datos de la cuenta contable
 */
async function validarPlanCuentasContable(data) {
  // Validar cuentaPadreId si existe
  if (data.cuentaPadreId) {
    const cuentaPadre = await prisma.planCuentasContable.findUnique({
      where: { id: data.cuentaPadreId }
    });
    if (!cuentaPadre) {
      throw new ValidationError('La cuenta padre referenciada no existe.');
    }
  }

  // Validar nivel
  if (data.nivel !== undefined) {
    const nivelesValidos = ['CLASE', 'CUENTA', 'SUBCUENTA', 'DIVISIONARIA', 'SUBDIVISIONARIA'];
    if (!nivelesValidos.includes(data.nivel)) {
      throw new ValidationError('El nivel debe ser: CLASE, CUENTA, SUBCUENTA, DIVISIONARIA o SUBDIVISIONARIA.');
    }
  }

  // Validar código de cuenta único
  if (data.codigoCuenta) {
    const existente = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: data.codigoCuenta,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`El código de cuenta "${data.codigoCuenta}" ya existe.`);
    }
  }

  // Validar que solo las cuentas de nivel SUBDIVISIONARIA puedan ser imputables
  if (data.esImputable && data.nivel !== 'SUBDIVISIONARIA') {
    throw new ValidationError('Solo las cuentas de nivel SUBDIVISIONARIA pueden ser imputables.');
  }

  // Validar tipoCuenta
  if (data.tipoCuenta && !['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO'].includes(data.tipoCuenta)) {
    throw new ValidationError('El tipo de cuenta debe ser: ACTIVO, PASIVO, PATRIMONIO, INGRESO o GASTO.');
  }

  // Validar naturaleza
  if (data.naturaleza && !['DEUDORA', 'ACREEDORA'].includes(data.naturaleza)) {
    throw new ValidationError('La naturaleza debe ser: DEUDORA o ACREEDORA.');
  }
}

/**
 * Lista todas las cuentas contables ordenadas por código de cuenta.
 */
const listar = async () => {
  try {
    const resultado = await prisma.planCuentasContable.findMany({
      include: {
        cuentaPadre: true,
        subcuentas: true,
        centroCosto: {
          include: {
            categoria: true
          }
        }
      },
      orderBy: { codigoCuenta: 'asc' }
    });

    console.log('✅ Total cuentas:', resultado.length);
    console.log('✅ Primera cuenta:', resultado[0]);
    console.log('✅ Cuentas con centroCosto:', resultado.filter(c => c.centroCosto).length);
    console.log('✅ Ejemplo cuenta con centroCosto:', resultado.find(c => c.centroCosto));

    return resultado;
  } catch (err) {
    console.error('❌ Error en listar planCuentasContable:', err);
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una cuenta contable por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const cuenta = await prisma.planCuentasContable.findUnique({
      where: { id },
      include: {
        cuentaPadre: true,
        subcuentas: {
          orderBy: { codigoCuenta: 'asc' }
        },
        centroCosto: {
          include: {
            categoria: true
          }
        }
      }
    });
    if (!cuenta) throw new NotFoundError('Cuenta contable no encontrada');
    return cuenta;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva cuenta contable.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.codigoCuenta || !data.nombreCuenta || !data.nivel || !data.naturaleza) {
      throw new ValidationError('Los campos codigoCuenta, nombreCuenta, nivel y naturaleza son obligatorios.');
    }

    await validarPlanCuentasContable(data);

    return await prisma.planCuentasContable.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      console.error('❌ ERROR PRISMA COMPLETO:', {
        code: err.code,
        message: err.message,
        meta: err.meta,
        data: data
      });
      throw new DatabaseError(`Error de base de datos: ${err.code} - ${err.message}`, err.message);
    }
    throw err;
  }
};

/**
 * Actualiza una cuenta contable existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.planCuentasContable.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cuenta contable no encontrada');

    await validarPlanCuentasContable({ ...data, id });

    return await prisma.planCuentasContable.update({
      where: { id },
      data
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Elimina una cuenta contable por ID.
 * Valida que no tenga cuentas hijas ni esté siendo usada en asientos contables.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.planCuentasContable.findUnique({
      where: { id },
      include: {
        subcuentas: true,
        detallesAsientos: true,
        configuracionesDebe: true,
        configuracionesHaber: true
      }
    });

    if (!existente) throw new NotFoundError('Cuenta contable no encontrada');

    // Validar que no tenga subcuentas
    if (existente.subcuentas && existente.subcuentas.length > 0) {
      throw new ConflictError('No se puede eliminar la cuenta porque tiene subcuentas asociadas.');
    }

    // Validar que no esté siendo usada en asientos contables
    if (existente.detallesAsientos && existente.detallesAsientos.length > 0) {
      throw new ConflictError('No se puede eliminar la cuenta porque está siendo usada en asientos contables.');
    }

    // Validar que no esté en configuraciones
    if ((existente.configuracionesDebe && existente.configuracionesDebe.length > 0) ||
      (existente.configuracionesHaber && existente.configuracionesHaber.length > 0)) {
      throw new ConflictError('No se puede eliminar la cuenta porque está siendo usada en configuraciones contables.');
    }

    await prisma.planCuentasContable.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista cuentas contables activas.
 */
const listarActivas = async () => {
  try {
    return await prisma.planCuentasContable.findMany({
      where: { activo: true },
      include: {
        cuentaPadre: true,
        subcuentas: true,
        centroCosto: {
          include: {
            categoria: true
          }
        }
      },
      orderBy: { codigoCuenta: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista solo cuentas imputables (SUBDIVISIONARIA).
 */
const listarImputables = async () => {
  try {
    return await prisma.planCuentasContable.findMany({
      where: {
        nivel: 'SUBDIVISIONARIA',
        esImputable: true,
        activo: true
      },
      orderBy: { codigoCuenta: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
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
  listarActivas,
  listarImputables
};
