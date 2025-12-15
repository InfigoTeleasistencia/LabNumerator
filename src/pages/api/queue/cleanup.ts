import type { NextApiRequest, NextApiResponse } from 'next';
import { queueStore } from '@/lib/queueStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forzar limpieza manual
    queueStore.forceCleanup();
    
    return res.status(200).json({ 
      success: true,
      message: 'Limpieza forzada ejecutada correctamente'
    });
  } catch (error) {
    console.error('Error forcing cleanup:', error);
    return res.status(500).json({ error: 'Error ejecutando limpieza' });
  }
}

