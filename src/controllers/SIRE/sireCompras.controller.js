import sireComprasService from '../../services/SIRE/sireCompras.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getModuleConfig } from '../../config/pdf/pdfModules.config.js';
import { ValidationError } from '../../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function descargarComprasSIRE(req, res, next) {
  try {
    const { empresaId, periodo } = req.body;
    const resultado = await sireComprasService.descargarComprasSIRE(empresaId, periodo);
    res.json(toJSONBigInt(resultado));

  } catch (err) {
    next(err);
  }
}

export async function importarDocumentos(req, res, next) {
  try {
    const { empresaId, documentos, usuarioId } = req.body;
    const resultado = await sireComprasService.importarDocumentos(empresaId, documentos, usuarioId);
    res.json(toJSONBigInt(resultado));

  } catch (err) {
    next(err);
  }
}

export async function descargarXMLsMasivo(req, res, next) {
  try {
    const { empresaId, periodo, cars, listaCars } = req.body;
    const carsToUse = listaCars || cars;
    const resultado = await sireComprasService.descargarXMLsMasivo(empresaId, periodo, carsToUse);
    res.json(toJSONBigInt(resultado));

  } catch (err) {
    next(err);
  }
}

export async function generarPDFIndividual(req, res, next) {
  try {
    const { empresaId, periodo, car } = req.body;
    if (!empresaId || !periodo || !car) {
      throw new ValidationError('Se requiere empresaId, periodo y car');
    }
    const resultado = await sireComprasService.generarPDFIndividual(empresaId, periodo, car);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function descargarPDFParaOrdenCompra(req, res, next) {
  try {
    const { empresaId, periodo, car, ordenCompraId } = req.body;
    if (!empresaId || !periodo || !car || !ordenCompraId) {
      throw new ValidationError('Se requiere empresaId, periodo, car y ordenCompraId');
    }
    // 1. Descargar PDF de SUNAT
    const resultadoSIRE = await sireComprasService.generarPDFIndividual(empresaId, periodo, car);
    if (!resultadoSIRE.success) {
      throw new Error(resultadoSIRE.mensaje || 'Error descargando PDF de SUNAT');
    }
    // 2. Copiar PDF a la ruta del sistema PDF V2
    const config = getModuleConfig('orden-compra-comprobante-proveedor');
    const uploadDir = path.join(__dirname, '../../../', config.uploadPath);
    // Crear directorio si no existe
    await fs.mkdir(uploadDir, { recursive: true });
    // Nombre estándar del sistema PDF V2
    const fileName = `ORDEN-COMPRA-COMPROBANTE-PROVEEDOR-${ordenCompraId}.pdf`;
    const destPath = path.join(uploadDir, fileName);
    // Copiar archivo
    await fs.copyFile(resultadoSIRE.pdfPath, destPath);
    // URL relativa del sistema PDF V2
    const urlRelativa = `/${config.uploadPath}/${fileName}`;
    const resultado = {
      success: true,
      pdfUrl: urlRelativa,
      mensaje: 'PDF descargado de SUNAT y guardado correctamente'
    };
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function crearOCIndividual(req, res, next) {
  try {
    const { empresaId, periodo, car, documentoSIRE } = req.body;
    const usuarioId = req.user?.id || '1';
    const { crearOrdenCompraDesdeCAR } = await import('../../services/SIRE/crearOrdenCompraDesdeCAR.service.js');
    const resultado = await crearOrdenCompraDesdeCAR(car, empresaId, periodo, usuarioId, documentoSIRE);
    res.json(resultado);

  } catch (err) {
    next(err);
  }
}

export async function crearOCMasivo(req, res, next) {
  try {
    const { empresaId, periodo, documentos } = req.body;
    const usuarioId = req.user?.id || '1';
    const { crearOrdenCompraDesdeCAR } = await import('../../services/SIRE/crearOrdenCompraDesdeCAR.service.js');
    const resultados = [];
    let exitosos = 0;
    let errores = 0;
    for (const doc of documentos) {
      const resultado = await crearOrdenCompraDesdeCAR(
        doc.numCar,
        empresaId,
        periodo,
        usuarioId,
        doc
      );

      if (resultado.success) {
        exitosos++;
      } else {
        errores++;
      }

      resultados.push({
        car: doc.numCar,
        serie: doc.serie,
        numero: doc.numero,
        proveedor: doc.razonSocial,
        ...resultado
      });
    }
    res.json({
      success: true,
      total: documentos.length,
      exitosos,
      errores,
      resultados
    });

  } catch (err) {
    next(err);
  }
}