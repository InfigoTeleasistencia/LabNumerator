import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { initSocketServer } from '@/lib/socketManager';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(res.socket as any).server.io) {
    console.log('Inicializando Socket.IO...');
    const httpServer: HTTPServer = (res.socket as any).server;
    const io = initSocketServer(httpServer);
    (res.socket as any).server.io = io;
  } else {
    console.log('Socket.IO ya está inicializado');
  }
  res.end();
}


