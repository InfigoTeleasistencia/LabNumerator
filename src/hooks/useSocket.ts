import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QueueState } from '@/types';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [queueState, setQueueState] = useState<QueueState>({
    sectors: {},
  });
  
  // Usar ref para evitar problemas con closure en el cleanup
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log('🔌 Inicializando conexión WebSocket...');
    
    let mounted = true;

    // Inicializar Socket.IO
    fetch('/api/socket')
      .then(() => {
        if (!mounted) return;
        console.log('✅ API Socket inicializado');
        // Pequeño delay para asegurar que el servidor está listo
        return new Promise(resolve => setTimeout(resolve, 100));
      })
      .then(() => {
        if (!mounted) return;
        console.log('🔌 Conectando cliente Socket.IO...');
        const socketInstance = io({
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
        });

        socketRef.current = socketInstance;

        socketInstance.on('connect', () => {
          console.log('✅ Conectado a Socket.IO, ID:', socketInstance.id);
          setIsConnected(true);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('❌ Error de conexión Socket.IO:', error);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('⚠️  Desconectado de Socket.IO. Razón:', reason);
          setIsConnected(false);
          
          // Reconectar automáticamente si no fue intencional
          if (reason === 'io server disconnect') {
            console.log('🔄 Reconectando...');
            socketInstance.connect();
          }
        });

        socketInstance.on('reconnect', (attemptNumber) => {
          console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
          setIsConnected(true);
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
          console.log('🔄 Intento de reconexión #', attemptNumber);
        });

        socketInstance.on('queue:update', (state: QueueState) => {
          const sectorsInfo = Object.entries(state.sectors).map(([id, data]) => ({
            id,
            waiting: data.waiting.length,
            hasCurrent: !!data.current,
            currentCode: data.current?.code,
            recent: data.recent.length,
          }));
          console.log('📥 Recibida actualización de cola:', sectorsInfo);
          setQueueState(state);
        });

        setSocket(socketInstance);
      })
      .catch(error => {
        console.error('❌ Error inicializando Socket.IO:', error);
      });

    return () => {
      console.log('🔌 Cleanup: Desconectando socket...');
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { socket, isConnected, queueState };
}