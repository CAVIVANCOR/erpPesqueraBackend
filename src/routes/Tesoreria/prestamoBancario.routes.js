/**
 * Rutas de manejo de préstamos bancarios en el ERP Megui.
 * Incluye upload de documentos PDF siguiendo el patrón de documentacion-personal.
 * Documentado profesionalmente en español técnico.
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as prestamoBancarioController from "../../controllers/Tesoreria/prestamoBancario.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";
import prestamoBancarioService from "../../services/Tesoreria/prestamoBancario.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";
import { checkPermission } from "../../middlewares/checkPermission.js";

const router = express.Router();

// Carpeta base para documentos de préstamos bancarios
const PRESTAMOS_DOCS_DIR = path.join(
  process.cwd(),
  "uploads",
  "prestamos-bancarios",
);
if (!fs.existsSync(PRESTAMOS_DOCS_DIR)) {
  fs.mkdirSync(PRESTAMOS_DOCS_DIR, { recursive: true });
}

// Configuración de Multer para guardar PDFs de préstamos bancarios
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // Organiza por año/mes para mejor gestión de archivos
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      // Construir ruta paso a paso
      const baseDir = PRESTAMOS_DOCS_DIR;
      const yearDir = path.join(baseDir, String(year));
      const finalDir = path.join(yearDir, month);

      // Crear directorios paso a paso
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      if (!fs.existsSync(yearDir)) {
        fs.mkdirSync(yearDir, { recursive: true });
      }

      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }

      // Verificar que el directorio final existe
      if (fs.existsSync(finalDir)) {
        cb(null, finalDir);
      } else {
        console.error(`❌ Error: No se pudo crear el directorio ${finalDir}`);
        cb(new Error(`No se pudo crear el directorio ${finalDir}`), null);
      }
    } catch (error) {
      console.error(`❌ Error en destination:`, error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    try {
      // Formato: {ID}-{dia}{mes}{año}.pdf
      const now = new Date();
      const dia = String(now.getDate()).padStart(2, "0");
      const mes = String(now.getMonth() + 1).padStart(2, "0");
      const año = now.getFullYear();

      // Generar ID único basado en timestamp
      const id = Date.now();
      const ext = path.extname(file.originalname) || ".pdf";

      const fileName = `${id}-${dia}${mes}${año}${ext}`;
      cb(null, fileName);
    } catch (error) {
      console.error(`❌ Error en filename:`, error);
      cb(error, null);
    }
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Permite PDFs e imágenes (para conversión posterior)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP)."),
      );
    }
  },
  limits: { fileSize: 15 * 1024 * 1024 }, // Máximo 15MB
});

// Rutas CRUD básicas con permisos
router.get(
  "/",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  prestamoBancarioController.listar,
);

router.get(
  "/vigentes",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  prestamoBancarioController.listarVigentes,
);

router.get(
  "/empresa/:empresaId",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  prestamoBancarioController.listarPorEmpresa,
);

router.get(
  "/sublinea/:sublineaCreditoId",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  prestamoBancarioController.listarPorSublinea,
);

// GET /api/prestamo-bancario/lista-simple - DEBE IR ANTES DE /:id
router.get(
  "/lista-simple",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  async (req, res, next) => {
    try {
      const prestamos = await prestamoBancarioService.listarSimple();
      res.json(toJSONBigInt(prestamos));
    } catch (error) {
      next(error);
    }
  },
);
router.get(
  "/disponibles-sublinea",
  autenticarJWT,
  prestamoBancarioController.obtenerPrestamosDisponiblesParaSublinea,
);
router.patch(
  "/:id/asignar-sublinea",
  autenticarJWT,
  prestamoBancarioController.asignarPrestamoASublinea,
);
router.patch(
  "/:id/desvincular-sublinea",
  autenticarJWT,
  prestamoBancarioController.desvincularPrestamoDeSublinea,
);
router.get(
  "/:id",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  prestamoBancarioController.obtenerPorId,
);

router.get(
  "/:id/cronograma",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  prestamoBancarioController.obtenerCronograma,
);

router.post(
  "/",
  autenticarJWT,
  checkPermission("prestamoBancario", "crear"),
  prestamoBancarioController.crear,
);

router.put(
  "/:id",
  autenticarJWT,
  checkPermission("prestamoBancario", "editar"),
  prestamoBancarioController.actualizar,
);

router.delete(
  "/:id",
  autenticarJWT,
  checkPermission("prestamoBancario", "eliminar"),
  prestamoBancarioController.eliminar,
);

router.post(
  "/:id/recalcular-cuotas",
  autenticarJWT,
  checkPermission("prestamoBancario", "editar"),
  prestamoBancarioController.recalcularCuotas,
);

/**
 * POST /api/tesoreria/prestamos-bancarios/upload
 * Sube un PDF del documento de crédito bancario.
 * Retorna la URL relativa para guardar en PrestamoBancario.urlDocumentoPDF
 */
router.post(
  "/upload",
  autenticarJWT,
  checkPermission("prestamoBancario", "crear"),
  (req, res, next) => {
    upload.single("documento")(req, res, function (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          mensaje: "El archivo supera el tamaño máximo permitido (15MB).",
          codigo: "ERR_TAMANO_ARCHIVO",
        });
      } else if (err) {
        return res.status(400).json({
          mensaje: err.message,
          codigo: "ERR_MULTER",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { prestamoBancarioId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          error: "No se subió ningún archivo.",
          codigo: "ERR_NO_ARCHIVO",
        });
      }

      // Construye la ruta relativa para la BD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const rutaRelativa = path
        .join(
          "/uploads/prestamos-bancarios",
          String(year),
          month,
          req.file.filename,
        )
        .replace(/\\/g, "/"); // Normaliza para Windows/Linux

      // Si se proporciona prestamoBancarioId, actualiza el registro
      if (prestamoBancarioId) {
        const prisma = (await import("../../config/prismaClient.js")).default;
        await prisma.prestamoBancario.update({
          where: { id: BigInt(prestamoBancarioId) },
          data: {
            urlDocumentoPDF: rutaRelativa,
            actualizadoEn: new Date(),
          },
        });
      }

      // Respuesta exitosa con la URL para el frontend
      res.json({
        success: true,
        urlDocumento: rutaRelativa,
        nombreArchivo: req.file.filename,
        mensaje: "Documento de préstamo subido exitosamente.",
      });
    } catch (error) {
      console.error(
        "[ERP PRESTAMOS BANCARIOS] Error al subir documento:",
        error,
      );
      res.status(500).json({
        error: "Error interno al guardar el documento de préstamo.",
        codigo: "ERR_SERVIDOR",
      });
    }
  },
);

/**
 * GET /api/tesoreria/prestamos-bancarios/archivo/*
 * Sirve archivos PDF de préstamos bancarios con autenticación JWT
 */
router.get(
  "/archivo/*",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  (req, res) => {
    try {
      // Extraer la ruta del archivo desde la URL
      const rutaArchivo = req.params[0]; // Captura todo después de /archivo/

      if (!rutaArchivo) {
        return res.status(400).json({
          error: "Ruta de archivo no especificada",
          codigo: "ERR_RUTA_VACIA",
        });
      }

      // Construir ruta completa del archivo
      const rutaCompleta = path.join(
        process.cwd(),
        "uploads",
        "prestamos-bancarios",
        rutaArchivo,
      );

      // Verificar que el archivo existe
      if (!fs.existsSync(rutaCompleta)) {
        return res.status(404).json({
          error: "Documento no encontrado",
          codigo: "ERR_ARCHIVO_NO_ENCONTRADO",
          ruta: rutaArchivo,
        });
      }

      // Verificar que es un archivo PDF
      const extension = path.extname(rutaCompleta).toLowerCase();
      if (extension !== ".pdf") {
        return res.status(400).json({
          error: "Solo se permiten archivos PDF",
          codigo: "ERR_TIPO_ARCHIVO",
        });
      }

      // Configurar headers para PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline"); // Para mostrar en navegador

      // Enviar archivo
      res.sendFile(rutaCompleta, (err) => {
        if (err) {
          console.error("Error enviando archivo:", err);
          if (!res.headersSent) {
            res.status(500).json({
              error: "Error interno del servidor",
              codigo: "ERR_ENVIO_ARCHIVO",
            });
          }
        }
      });
    } catch (error) {
      console.error("Error sirviendo documento de préstamo:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        codigo: "ERR_SERVIDOR",
        detalle: error.message,
      });
    }
  },
);

/**
 * POST /api/tesoreria/prestamos-bancarios/upload-adicional
 * Sube un PDF de documentación adicional del préstamo.
 * Retorna la URL relativa para guardar en PrestamoBancario.urlDocAdicionalPDF
 */
router.post(
  "/upload-adicional",
  autenticarJWT,
  checkPermission("prestamoBancario", "crear"),
  (req, res, next) => {
    upload.single("documento")(req, res, function (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          mensaje: "El archivo supera el tamaño máximo permitido (15MB).",
          codigo: "ERR_TAMANO_ARCHIVO",
        });
      } else if (err) {
        return res.status(400).json({
          mensaje: err.message,
          codigo: "ERR_MULTER",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { prestamoBancarioId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          error: "No se subió ningún archivo.",
          codigo: "ERR_NO_ARCHIVO",
        });
      }

      // Construye la ruta relativa para la BD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const rutaRelativa = path
        .join(
          "/uploads/prestamos-bancarios",
          String(year),
          month,
          req.file.filename,
        )
        .replace(/\\/g, "/");

      // Si se proporciona prestamoBancarioId, actualiza el registro
      if (prestamoBancarioId) {
        const prisma = (await import("../../config/prismaClient.js")).default;
        await prisma.prestamoBancario.update({
          where: { id: BigInt(prestamoBancarioId) },
          data: {
            urlDocAdicionalPDF: rutaRelativa,
            actualizadoEn: new Date(),
          },
        });
      }

      // Respuesta exitosa con la URL para el frontend
      res.json({
        success: true,
        urlDocumento: rutaRelativa,
        nombreArchivo: req.file.filename,
        mensaje: "Documento adicional subido exitosamente.",
      });
    } catch (error) {
      console.error(
        "[ERP PRESTAMOS BANCARIOS] Error al subir documento adicional:",
        error,
      );
      res.status(500).json({
        error: "Error interno al guardar el documento adicional.",
        codigo: "ERR_SERVIDOR",
      });
    }
  },
);


// Rutas de asientos contables
router.get(
  "/:id/generar-borrador-asiento",
  autenticarJWT,
  checkPermission("prestamoBancario", "ver"),
  prestamoBancarioController.generarBorradorAsiento,
);

router.post(
  "/:id/guardar-asiento",
  autenticarJWT,
  checkPermission("prestamoBancario", "crear"),
  prestamoBancarioController.guardarAsientoContable,
);

router.delete(
  "/:id/asiento/:asientoId",
  autenticarJWT,
  checkPermission("prestamoBancario", "eliminar"),
  prestamoBancarioController.eliminarAsientoContable,
);

export default router;
