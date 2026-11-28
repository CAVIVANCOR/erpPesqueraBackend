import { Router } from 'express';
import * as vacaciones from '../../controllers/RecursosHumanos/vacaciones.controller.js';

const router = Router();

// Tipos de suspensión de labores (catálogo PLAME tabla 21)
router.get('/tipos', vacaciones.listarTipos);
router.post('/tipos', vacaciones.crearTipo);
router.put('/tipos/:id', vacaciones.actualizarTipo);
router.delete('/tipos/:id', vacaciones.eliminarTipo);

// Periodos vacacionales (derecho por año de servicios)
router.post('/periodos/generar', vacaciones.generarPeriodos);
router.put('/periodos/:id', vacaciones.actualizarPeriodo);

// Suspensiones: vacaciones, faltas, descansos...
router.get('/suspensiones', vacaciones.listarSuspensiones);
router.get('/suspensiones/:id', vacaciones.obtenerSuspension);
router.post('/suspensiones', vacaciones.crearSuspension);
router.put('/suspensiones/:id', vacaciones.actualizarSuspension);
router.post('/suspensiones/:id/ejecutar', vacaciones.ejecutarSuspension);
router.post('/suspensiones/:id/anular', vacaciones.anularSuspension);
router.delete('/suspensiones/:id', vacaciones.eliminarSuspension);

// Reportes
router.get('/saldos', vacaciones.saldos);
router.get('/resumen', vacaciones.resumen);
router.get('/calendario', vacaciones.calendario);
router.get('/proyeccion', vacaciones.proyeccion);
router.get('/por-mes', vacaciones.porMes);

export default router;
