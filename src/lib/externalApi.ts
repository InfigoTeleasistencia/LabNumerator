import { ValidationResponse } from '@/types';
import { validateBarcodeWithSOAP, mockSOAPValidation } from './soapClient';

const USE_PRODUCTION_SOAP = process.env.USE_PRODUCTION_SOAP === 'true';

/**
 * Valida un código de barras contra el servicio SOAP
 * En desarrollo usa mock, en producción usa el servicio real
 */
export async function validateCodeWithExternalAPI(code: string): Promise<ValidationResponse> {
  try {
    // En desarrollo, usar mock
    if (!USE_PRODUCTION_SOAP) {
      console.log('Usando SOAP mock para desarrollo');
      return await mockSOAPValidation(code);
    }

    // En producción, usar servicio SOAP real
    console.log('Llamando al servicio SOAP de producción');
    return await validateBarcodeWithSOAP(code);
  } catch (error) {
    console.error('Error validating code:', error);
    return {
      valid: false,
      error: 'Error al validar el código',
      errorDescription: 'Error inesperado en la validación',
    };
  }
}


