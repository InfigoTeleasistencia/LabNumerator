import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { QueueState } from '@/types';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  if (io) {
    console.log('Socket.IO ya inicializado, reutilizando instancia');
    return io;
  }

  console.log('🚀 Inicializando Socket.IO...');
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
      console.log('❌ Cliente desconectado:', socket.id);
    });
  });

  console.log('✅ Socket.IO inicializado correctamente');
  return io;
}

export function setIO(ioInstance: SocketIOServer) {
  io = ioInstance;
  console.log('✅ Instancia de Socket.IO establecida manualmente');
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitQueueUpdate(state: QueueState) {
  if (io) {
    // Importar queueStore para obtener calledPatients
    const { queueStore } = require('./queueStore');
    
    // Agregar todos los pacientes llamados para cada sector
    Object.keys(state.sectors).forEach(sectorId => {
      const calledPatients = queueStore.getCalledPatients(sectorId);
      (state.sectors[sectorId] as any).calledPatients = calledPatients;
    });
    
    const sectorsInfo = Object.entries(state.sectors).map(([id, data]) => ({
      id,
      waiting: data.waiting.length,
      hasCurrent: !!data.current,
      calledCount: (data as any).calledPatients?.length || 0,
      recent: data.recent.length,
    }));
    console.log('📡 Emitiendo queue:update a todos los clientes:', sectorsInfo);
    io.emit('queue:update', state);
  } else {
    console.warn('⚠️  No se puede emitir actualización: Socket.IO no inicializado');
  }
}


