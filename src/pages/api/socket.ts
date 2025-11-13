import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { initSocketServer, setIO } from '@/lib/socketManager';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(res.socket as any).server.io) {
    console.log('🔧 Inicializando Socket.IO desde API handler...');
    const httpServer: HTTPServer = (res.socket as any).server;
    const io = initSocketServer(httpServer);
    (res.socket as any).server.io = io;
    // Asegurar que la referencia global también esté actualizada
    setIO(io);
    console.log('✅ Socket.IO configurado y listo');
  } else {
    console.log('♻️  Socket.IO ya está inicializado, reutilizando');
    // Asegurar que la referencia global esté sincronizada
    const existingIo = (res.socket as any).server.io;
    setIO(existingIo);
  }
  res.end();
}


