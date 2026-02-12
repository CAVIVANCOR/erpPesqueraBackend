import prisma from '../../config/prismaClient.js';

/**
 * Busca el precio de un producto para una entidad comercial específica.
 * Valida que el precio esté activo y vigente.
 * 
 * @param {BigInt} entidadComercialId - ID de la entidad comercial (cliente o proveedor)
 * @param {BigInt} productoId - ID del producto
 * @param {PrismaTransaction} transaccion - Transacción de Prisma (opcional)
 * @returns {Promise<Object|null>} Objeto con { monedaId, precio } o null si no se encuentra
 */
const buscarPrecioProducto = async (
  entidadComercialId,
  productoId,
  transaccion = null
) => {
  try {
    const ejecutarBusqueda = async (tx) => {
      const hoy = new Date();
      
      const precioEntidad = await tx.precioEntidad.findFirst({
        where: {
          entidadComercialId: entidadComercialId,
          productoId: productoId,
          activo: true,
          vigenteDesde: { lte: hoy },
          OR: [
            { vigenteHasta: null },
            { vigenteHasta: { gte: hoy } }
          ]
        },
        select: {
          precioUnitario: true,
          monedaId: true,
          vigenteDesde: true,
          vigenteHasta: true,
          activo: true
        },
        orderBy: {
          vigenteDesde: 'desc'
        }
      });

      if (!precioEntidad) {
        return null;
      }

      return {
        monedaId: precioEntidad.monedaId,
        precio: Number(precioEntidad.precioUnitario)
      };
    };

    if (transaccion) {
      return await ejecutarBusqueda(transaccion);
    } else {
      return await prisma.$transaction(ejecutarBusqueda);
    }

  } catch (error) {
    console.error('Error al buscar precio del producto:', error);
    return null;
  }
};

export default {
  buscarPrecioProducto
};
