import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { QueueState } from '@/types';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitQueueUpdate(state: QueueState) {
  if (io) {
    io.emit('queue:update', state);
  }
}


