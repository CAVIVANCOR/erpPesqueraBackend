import movimientoAlmacenService from '../../services/Almacen/movimientoAlmacen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Controlador para MovimientoAlmacen
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await movimientoAlmacenService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movimiento = await movimientoAlmacenService.obtenerPorId(id);
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await movimientoAlmacenService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await movimientoAlmacenService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await movimientoAlmacenService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Cierra un movimiento de almacén
 */
export async function cerrarMovimiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cerrado = await movimientoAlmacenService.cerrarMovimiento(id);
    res.json(toJSONBigInt(cerrado));
  } catch (err) {
    next(err);
  }
}

/**
 * Anula un movimiento de almacén
 */
export async function anularMovimiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const anulado = await movimientoAlmacenService.anularMovimiento(id);
    res.json(toJSONBigInt(anulado));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene series de documentos filtradas
 * Query params: empresaId, tipoDocumentoId, tipoAlmacenId
 */
export async function obtenerSeriesDoc(req, res, next) {
  try {
    const { empresaId, tipoDocumentoId, tipoAlmacenId } = req.query;
    
    const series = await movimientoAlmacenService.obtenerSeriesDoc(
      empresaId,
      tipoDocumentoId,
      tipoAlmacenId
    );
    
    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}

/**
 * Consulta stock disponible de un producto
 * Query params: empresaId, almacenId, productoId, clienteId?, esCustodia?
 */
export async function consultarStock(req, res, next) {
  try {
    const { empresaId, almacenId, productoId, clienteId, esCustodia } = req.query;
    
    const stock = await movimientoAlmacenService.consultarStock(
      empresaId,
      almacenId,
      productoId,
      clienteId,
      esCustodia === 'true'
    );
    
    res.json(toJSONBigInt(stock));
  } catch (err) {
    next(err);
  }
}

/**
 * Sube un PDF del movimiento de almacén
 * Maneja tanto PDF sin costos como PDF con costos
 */
export async function uploadPdf(req, res, next) {
  try {
    // Configurar multer para almacenamiento en memoria
    const storage = multer.memoryStorage();
    const upload = multer({ storage }).single('pdf');

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: 'Error al subir el archivo' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }

      const { movimientoId, incluirCostos } = req.body;

      if (!movimientoId) {
        return res.status(400).json({ error: 'movimientoId es requerido' });
      }

      // Determinar el nombre del campo según si incluye costos
      const conCostos = incluirCostos === 'true' || incluirCostos === true;
      const carpetaDestino = 'movimientos-almacen';
      const nombreCampo = conCostos ? 'urlMovAlmacenConCostosPdf' : 'urlMovAlmacenPdf';

      // Crear directorio si no existe
      const uploadDir = path.join(process.cwd(), 'uploads', carpetaDestino);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const sufijo = conCostos ? '-costos' : '';
      const nombreArchivo = `movimiento-${movimientoId}${sufijo}-${timestamp}.pdf`;
      const rutaArchivo = path.join(uploadDir, nombreArchivo);

      // Guardar el archivo
      fs.writeFileSync(rutaArchivo, req.file.buffer);

      // Construir la URL del archivo
      const urlPdf = `${process.env.API_URL || 'http://localhost:3000'}/uploads/${carpetaDestino}/${nombreArchivo}`;

      // Actualizar el movimiento con la URL del PDF
      const datosActualizar = {
        [nombreCampo]: urlPdf,
      };

      const movimientoActualizado = await movimientoAlmacenService.actualizar(
        Number(movimientoId),
        datosActualizar
      );

      res.json(
        toJSONBigInt({
          success: true,
          urlPdf,
          [nombreCampo]: urlPdf,
          movimiento: movimientoActualizado,
        })
      );
    });
  } catch (err) {
    next(err);
  }
}
