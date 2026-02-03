import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint que devuelve la hora actual del servidor.
 * Útil para sincronizar dispositivos que no mantienen la hora correctamente.
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ serverTime: string; timestamp: number }>
) {
  const now = new Date();
  
  res.status(200).json({
    serverTime: now.toISOString(),
    timestamp: now.getTime()
  });
}

