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
    const { code } = req.body;

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

    // Validar con el servicio SOAP
    const validation = await validateCodeWithExternalAPI(code);

    if (!validation.valid) {
      return res.status(400).json({ 
        error: validation.error || 'Código no válido',
        errorDescription: validation.errorDescription,
      });
    }

    const patientData = validation.patient!;

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

    // Emitir actualización por WebSocket
    emitQueueUpdate(queueStore.getState());

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