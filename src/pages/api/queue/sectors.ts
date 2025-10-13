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
    const sectors = queueStore.getAllSectors();
    return res.status(200).json({ sectors });
  } catch (error) {
    console.error('Error getting sectors:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
