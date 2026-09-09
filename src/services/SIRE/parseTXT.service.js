import fs from 'fs/promises';
import prisma from '../../config/prismaClient.js';

async function parsearTXTCompras(txtPath, empresaId) {
  const content = await fs.readFile(txtPath, 'utf-8');
  const lineas = content.split('\n').filter(l => l.trim());
  
  // Detectar separador: CSV usa comas, TXT usa pipes
  const separador = lineas[0]?.includes(',') ? ',' : '|';
  
  const documentos = [];
  
  // Saltar la primera línea (encabezados) tanto en CSV como TXT
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];
    const campos = linea.split(separador);
    
    // Filtrar líneas inválidas o de encabezado
    if (campos.length < 15) continue;
    if (campos[0]?.trim() === 'RUC') continue; // Saltar encabezado si aparece
    
    // Mapeo de campos según formato TXT/CSV de SUNAT SIRE
    // Estructura: RUC|Razón Social|Periodo|CAR SUNAT|Fecha Emisión|Fecha Vcto|Tipo CP|Serie|Año|Nro CP|...
    const doc = {
      numCar: campos[3]?.trim() || null,  // CAR SUNAT (columna 3)
      rucProveedor: campos[12]?.trim(),   // Nro Doc Identidad del proveedor (columna 12)
      razonSocial: campos[13]?.trim(),    // Apellidos Nombres/Razón Social del proveedor (columna 13)
      tipoDoc: campos[6]?.trim(),         // Tipo CP/Doc. (columna 6)
      serie: campos[7]?.trim(),           // Serie del CDP (columna 7)
      numero: campos[9]?.trim(),          // Nro CP o Doc. (columna 9)
      fechaEmision: campos[4]?.trim(),    // Fecha de emisión (columna 4)
      fechaVencimiento: campos[5]?.trim() || campos[4]?.trim(), // Fecha Vcto/Pago (columna 5)
      baseImponible: parseFloat(campos[14]?.replace(/,/g, '')) || 0, // BI Gravado DG (columna 14)
      igv: parseFloat(campos[15]?.replace(/,/g, '')) || 0,           // IGV / IPM DG (columna 15)
      total: parseFloat(campos[24]?.replace(/,/g, '')) || 0,         // Total CP (columna 24)
      moneda: campos[25]?.trim() || 'PEN',                           // Moneda (columna 25)
      tipoCambio: parseFloat(campos[26]?.replace(/,/g, '')) || 1.0  // Tipo de Cambio (columna 26)
    };
    
    // Conciliación: buscar por tipo doc, serie, número y RUC proveedor
    const existe = await prisma.ordenCompra.findFirst({
      where: {
        empresaId,
        tipoDocumentoFinal: {
          codigoSunat: doc.tipoDoc
        },
        numSerieDocFinal: doc.serie,
        numCorreDocFinal: doc.numero,
        proveedor: {
          numeroDocumento: doc.rucProveedor
        }
      },
      select: {
        id: true,
        fechaFacturacion: true
      }
    });
    
    documentos.push({
      ...doc,
      enBD: !!existe,
      ordenCompraId: existe?.id
    });
  }
  
  return {
    totalDocumentos: documentos.length,
    yaRegistrados: documentos.filter(d => d.enBD).length,
    nuevos: documentos.filter(d => !d.enBD),
    todos: documentos  // Devolver todos para mostrar en frontend con filtro
  };
}

export default {
  parsearTXTCompras
};