import { Router } from 'express';
import prisma from '../../config/prismaClient.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Catálogo de tipos de comisión de pensiones (Comisión sobre flujo, Comisión mixta, Sin comisión, ...).
 * Es de solo lectura para el selector de la ficha de Personal; hereda el permiso de ver Personal.
 */
router.get('/', autenticarJWT, checkPermission('personal', 'ver'), async (req, res, next) => {
  try {
    const tipos = await prisma.tipoComisionPension.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    res.json(tipos);
  } catch (err) {
    next(err);
  }
});

export default router;
