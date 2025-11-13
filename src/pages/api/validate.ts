import type { NextApiRequest, NextApiResponse } from 'next';
import { validateCodeWithExternalAPI } from '@/lib/externalApi';
import { queueStore } from '@/lib/queueStore';
import { emitQueueUpdate } from '@/lib/socketManager';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, testMode, testData } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código inválido' });
    }

    // Verificar si el código ya está en la cola
    if (queueStore.hasPatient(code)) {
      const existingPatient = queueStore.getPatientByCode(code);
      return res.status(409).json({ 
        error: 'Este código ya está en la cola',
        patient: existingPatient,
      });
    }

    let patientData;

    // Si es modo test, usar los datos de prueba
    if (testMode && testData) {
      patientData = testData;
    } else {
      // Validar con el servicio SOAP
      const validation = await validateCodeWithExternalAPI(code);

      if (!validation.valid) {
        return res.status(400).json({ 
          error: validation.error || 'Código no válido',
          errorDescription: validation.errorDescription,
        });
      }

      patientData = validation.patient!;
    }

    // Agregar a la cola del sector correspondiente
    const patient = queueStore.addPatient({
      id: `PAT-${Date.now()}`,
      code: patientData.code,
      name: patientData.name,
      cedula: `${patientData.cedula}-${patientData.digito}`,
      matricula: patientData.matricula.toString(),
      usuario: patientData.usuario.toString(),
      dependencia: `${patientData.dependencia} - ${patientData.depDescripcion}`,
      sector: patientData.sector.toString(),
      sectorDescription: patientData.secDescripcion,
      fecha: patientData.fecha,
      horaInicial: patientData.horaInicial,
      horaFinal: patientData.horaFinal,
    });

    console.log('✅ Paciente agregado a la cola:', {
      id: patient.id,
      code: patient.code,
      name: patient.name,
      sector: patient.sector,
      sectorDescription: patient.sectorDescription,
    });

    // Emitir actualización por WebSocket
    const currentState = queueStore.getState();
    console.log('📡 Emitiendo actualización de cola, sectores:', Object.keys(currentState.sectors));
    emitQueueUpdate(currentState);

    return res.status(200).json({ 
      success: true,
      patient,
      sector: patientData.secDescripcion,
      message: `Paciente agregado al ${patientData.secDescripcion}`,
    });
  } catch (error) {
    console.error('Error in validation:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
    });
  }
}