import type { NextApiRequest, NextApiResponse } from 'next';
import { queueStore } from '@/lib/queueStore';
import { emitQueueUpdate } from '@/lib/socketManager';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patientId, sectorId, puesto } = req.body;

    if (!patientId || !sectorId || !puesto) {
      return res.status(400).json({
        error: 'Se requieren patientId, sectorId y puesto',
      });
    }

    const patient = queueStore.recallPatient(patientId, sectorId, puesto);

    if (!patient) {
      return res.status(404).json({
        error: 'No se pudo re-llamar al paciente (no encontrado o no está completado)',
      });
    }

    emitQueueUpdate(queueStore.getState());

    return res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error('Error recalling patient:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
