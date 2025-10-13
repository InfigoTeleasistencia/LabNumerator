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
    const { sectorId } = req.body;

    if (!sectorId) {
      return res.status(400).json({ 
        error: 'Sector requerido',
      });
    }

    const patient = queueStore.callNext(sectorId);
    
    if (!patient) {
      return res.status(404).json({ 
        error: 'No hay pacientes en espera en este sector',
      });
    }

    // Emitir actualización por WebSocket
    emitQueueUpdate(queueStore.getState());

    return res.status(200).json({ 
      success: true,
      patient,
    });
  } catch (error) {
    console.error('Error calling next patient:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}