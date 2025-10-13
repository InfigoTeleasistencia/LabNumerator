import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { QueueState } from '@/types';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [queueState, setQueueState] = useState<QueueState>({
    sectors: {},
  });

  useEffect(() => {
    // Inicializar Socket.IO
    fetch('/api/socket').finally(() => {
      const socketInstance = io({
        path: '/api/socket',
      });

      socketInstance.on('connect', () => {
        console.log('Conectado a Socket.IO');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Desconectado de Socket.IO');
        setIsConnected(false);
      });

      socketInstance.on('queue:update', (state: QueueState) => {
        console.log('Actualización de cola:', state);
        setQueueState(state);
      });

      setSocket(socketInstance);
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  return { socket, isConnected, queueState };
}