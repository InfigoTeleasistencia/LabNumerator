import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { ValidationResponse } from '@/types';

const SOAP_URL = process.env.SOAP_URL || 'http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01';

/**
 * Cliente SOAP para consultar información del paciente
 */
export async function validateBarcodeWithSOAP(labOSNro: string): Promise<ValidationResponse> {
  try {
    // Crear el envelope SOAP
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gxs="GXSalud">
   <soapenv:Header/>
   <soapenv:Body>
      <gxs:labwbs01.Execute>
         <gxs:Labosnro>${labOSNro}</gxs:Labosnro>
      </gxs:labwbs01.Execute>
   </soapenv:Body>
</soapenv:Envelope>`;

    // Llamar al servicio SOAP
    const response = await axios.post(SOAP_URL, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'labwbs01.Execute',
      },
      timeout: 10000,
    });

    // Parsear la respuesta XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true, // Remover prefijos de namespace
    });
    
    const result = parser.parse(response.data);
    
    // Navegar por la estructura SOAP
    const executeResponse = result?.Envelope?.Body?.['labwbs01.ExecuteResponse'];
    
    if (!executeResponse) {
      throw new Error('Respuesta SOAP inválida');
    }

    // Verificar si hay error
    if (executeResponse.Error === 'S') {
      return {
        valid: false,
        error: 'Error en el servicio',
        errorDescription: executeResponse.Errdescripcion || 'Error desconocido',
      };
    }

    // Validar que la hora final no haya pasado
    const horaFinal = new Date(executeResponse.Horafinal);
    const ahora = new Date();
    
    if (ahora > horaFinal) {
      return {
        valid: false,
        error: 'Turno vencido',
        errorDescription: `El horario de atención finalizó a las ${horaFinal.toLocaleTimeString('es-UY')}`,
      };
    }

    // Validar campos obligatorios
    if (!executeResponse.Nombre || !executeResponse.Sector) {
      return {
        valid: false,
        error: 'Datos incompletos',
        errorDescription: 'La respuesta del servicio no contiene todos los datos necesarios',
      };
    }

    // Retornar datos válidos
    return {
      valid: true,
      patient: {
        code: labOSNro,
        name: executeResponse.Nombre,
        cedula: parseInt(executeResponse.Cedula) || 0,
        digito: parseInt(executeResponse.Digito) || 0,
        matricula: parseInt(executeResponse.Matricula) || 0,
        usuario: parseInt(executeResponse.Usuario) || 0,
        dependencia: parseInt(executeResponse.Dependencia) || 0,
        depDescripcion: executeResponse.Depdescripcion || '',
        sector: parseInt(executeResponse.Sector) || 0,
        secDescripcion: executeResponse.Secdescripcion || '',
        fecha: executeResponse.Fecha || '',
        horaInicial: executeResponse.Horainicial || '',
        horaFinal: executeResponse.Horafinal || '',
      },
    };
  } catch (error: any) {
    console.error('Error calling SOAP service:', error);
    
    // Errores de red o timeout
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        valid: false,
        error: 'Servicio no disponible',
        errorDescription: 'No se pudo conectar con el servidor. Intente nuevamente.',
      };
    }

    if (error.response) {
      return {
        valid: false,
        error: 'Error en el servicio',
        errorDescription: `Error HTTP ${error.response.status}`,
      };
    }

    return {
      valid: false,
      error: 'Error inesperado',
      errorDescription: error.message || 'Error al validar el código',
    };
  }
}

/**
 * Mock para desarrollo - eliminar en producción
 */
export function mockSOAPValidation(labOSNro: string): Promise<ValidationResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Códigos de prueba
      const mockData: Record<string, any> = {
        '110007938': {
          name: 'VESPA AMATI JUAN',
          cedula: 1171684,
          digito: 0,
          sector: 151,
          secDescripcion: 'SECTOR A',
        },
        '110007939': {
          name: 'GARCÍA LÓPEZ MARÍA',
          cedula: 2345678,
          digito: 1,
          sector: 151,
          secDescripcion: 'SECTOR A',
        },
        '110007940': {
          name: 'RODRÍGUEZ PÉREZ CARLOS',
          cedula: 3456789,
          digito: 2,
          sector: 152,
          secDescripcion: 'SECTOR B',
        },
        '110007941': {
          name: 'MARTÍNEZ GONZÁLEZ ANA',
          cedula: 4567890,
          digito: 3,
          sector: 152,
          secDescripcion: 'SECTOR B',
        },
        '110007942': {
          name: 'SÁNCHEZ FERNÁNDEZ LUIS',
          cedula: 5678901,
          digito: 4,
          sector: 153,
          secDescripcion: 'SECTOR C',
        },
      };

      const data = mockData[labOSNro];

      if (data) {
        // Simular horario válido: de 6:45 a 7:30 de hoy
        const today = new Date();
        const horaInicial = new Date(today);
        horaInicial.setHours(6, 45, 0);
        const horaFinal = new Date(today);
        horaFinal.setHours(23, 30, 0); // Extendido para pruebas

        resolve({
          valid: true,
          patient: {
            code: labOSNro,
            name: data.name,
            cedula: data.cedula,
            digito: data.digito,
            matricula: 1101658,
            usuario: 127619093,
            dependencia: 50,
            depDescripcion: 'SEDE CENTRAL',
            sector: data.sector,
            secDescripcion: data.secDescripcion,
            fecha: today.toISOString().split('T')[0],
            horaInicial: horaInicial.toISOString(),
            horaFinal: horaFinal.toISOString(),
          },
        });
      } else {
        resolve({
          valid: false,
          error: 'Código no encontrado',
          errorDescription: 'El número de código de barras no existe en el sistema',
        });
      }
    }, 800);
  });
}
