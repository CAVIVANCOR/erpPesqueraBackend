import { PrismaClient } from '@prisma/client';

// Instancia única para toda la aplicación
const prisma = new PrismaClient();

export default prisma;
