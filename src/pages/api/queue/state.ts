import type { NextApiRequest, NextApiResponse } from 'next';
import { queueStore } from '@/lib/queueStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const state = queueStore.getState();
    return res.status(200).json(state);
  } catch (error) {
    console.error('Error getting queue state:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}


