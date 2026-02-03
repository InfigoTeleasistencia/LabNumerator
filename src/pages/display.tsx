import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useSocket } from '@/hooks/useSocket';
import { format } from 'date-fns';
import axios from 'axios';
import { Patient } from '@/types';

export default function DisplayPage() {
  const { isConnected, queueState } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [localQueueState, setLocalQueueState] = useState(queueState);
  const [lastCalledPatientId, setLastCalledPatientId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  // Sincronizar con la hora del servidor
  const syncServerTime = async () => {
    try {
      const clientTimeBefore = Date.now();
      const response = await axios.get('/api/time');
      const clientTimeAfter = Date.now();
      
      // Calcular la latencia aproximada (ida y vuelta / 2)
      const latency = (clientTimeAfter - clientTimeBefore) / 2;
      
      // Calcular el offset entre servidor y cliente
      const serverTimestamp = response.data.timestamp;
      const offset = serverTimestamp - clientTimeAfter + latency;
      
      setServerTimeOffset(offset);
      console.log('🕐 [Display] Hora sincronizada con servidor. Offset:', offset, 'ms');
    } catch (error) {
      console.error('❌ [Display] Error sincronizando hora:', error);
    }
  };

  // Sincronizar hora al inicio y cada 5 minutos
  useEffect(() => {
    // Sincronizar inmediatamente al cargar
    syncServerTime();
    
    // Re-sincronizar cada 5 minutos para mantener precisión
    const syncInterval = setInterval(syncServerTime, 5 * 60 * 1000);
    
    return () => clearInterval(syncInterval);
  }, []);

  // Actualizar reloj cada segundo usando el offset del servidor
  useEffect(() => {
    const timer = setInterval(() => {
      // Aplicar el offset para mostrar la hora del servidor
      const serverAdjustedTime = new Date(Date.now() + serverTimeOffset);
      setCurrentTime(serverAdjustedTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  // Función para reproducir sonido de notificación
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('🔊 Sonido de notificación reproducido en sala de espera');
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Cargar estado inicial
  useEffect(() => {
    console.log('🔄 [Display] Cargando estado inicial de la cola...');
    axios.get('/api/queue/state')
      .then(response => {
        console.log('📊 [Display] Estado de cola cargado:', response.data);
        setLocalQueueState(response.data);
        setLastUpdate(Date.now());
      })
      .catch(error => {
        console.error('❌ [Display] Error cargando estado:', error);
      });
  }, []);

  // Actualizar estado local cuando llegue por WebSocket
  useEffect(() => {
    if (Object.keys(queueState.sectors).length > 0) {
      console.log('📡 [Display] Actualizando estado desde WebSocket');
      setLocalQueueState(queueState);
      setLastUpdate(Date.now());
    }
  }, [queueState]);

  // Polling de respaldo si WebSocket falla (cada 5 segundos)
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdate;
      
      // Si han pasado más de 10 segundos sin actualización, usar polling
      if (timeSinceLastUpdate > 10000) {
        console.log('⚠️  [Display] Usando polling de respaldo (WebSocket inactivo)');
        axios.get('/api/queue/state')
          .then(response => {
            setLocalQueueState(response.data);
            setLastUpdate(Date.now());
          })
          .catch(error => {
            console.error('❌ [Display] Error en polling:', error);
          });
      }
    }, 5000); // Revisar cada 5 segundos

    return () => clearInterval(pollingInterval);
  }, [lastUpdate]);

  // Detectar nuevo paciente llamado y reproducir sonido
  useEffect(() => {
    const selectedSector = Object.keys(localQueueState.sectors)[0];
    if (selectedSector) {
      const sectorData = localQueueState.sectors[selectedSector];
      const calledPatientsNow: Patient[] = (sectorData as any)?.calledPatients || [];
      
      // Si hay pacientes llamados y el más reciente es diferente
      if (calledPatientsNow.length > 0) {
        const mostRecent = calledPatientsNow[0]; // Ya vienen ordenados por calledAt
        if (mostRecent.id !== lastCalledPatientId) {
          console.log('🆕 Nuevo paciente llamado, reproduciendo sonido:', mostRecent.code);
          setLastCalledPatientId(mostRecent.id);
          playNotificationSound();
        }
      }
    }
  }, [localQueueState]);

  // Trabajar con el primer sector disponible (único sector)
  const selectedSector = Object.keys(localQueueState.sectors)[0] || null;
  const sectorData = selectedSector ? localQueueState.sectors[selectedSector] : null;
  
  // Obtener TODOS los pacientes llamados (de todos los puestos)
  const calledPatients: Patient[] = sectorData && (sectorData as any).calledPatients 
    ? (sectorData as any).calledPatients 
    : [];
  
  const waiting = sectorData?.waiting || [];
  
  console.log('🎯 [Display] Pacientes llamados:', calledPatients.length);

  // Obtener nombre del sector
  const sectorName = sectorData?.waiting[0]?.sectorDescription || 
                     calledPatients[0]?.sectorDescription || 
                     'LABORATORIO';

  // Limitar pacientes llamados a 5 para que quepan en pantalla
  const displayedPatients = calledPatients.slice(0, 5);

  return (
    <>
      <Head>
        <title>Pantalla de Atención - Asociación Española</title>
      </Head>
      <main style={{
        height: '100vh',
        background: '#E8F4F8',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header compacto con logo, sector, reloj y fecha */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '0.75rem 1.5rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          flexShrink: 0,
        }}>
          {/* Logo a la izquierda */}
          <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <img 
              src="/logo.png" 
              alt="Asociación Española Primera en Salud" 
              style={{ height: '60px' }}
            />
            {/* Título del sector */}
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#3B9DD4',
              textTransform: 'uppercase',
              borderLeft: '3px solid #3B9DD4',
              paddingLeft: '1rem',
            }}>
              {sectorName}
            </div>
          </div>

          {/* Reloj centrado */}
          <div style={{
            flex: '1',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '4rem',
              fontWeight: 'bold',
              color: '#1f2937',
              lineHeight: 1,
            }}>
              {format(currentTime, 'HH:mm')}
            </div>
          </div>

          {/* Fecha a la derecha */}
          <div style={{ 
            flex: '1', 
            textAlign: 'right',
          }}>
            <div style={{ 
              color: '#6b7280', 
              fontSize: '1.25rem',
              fontWeight: '500',
            }}>
              {format(currentTime, 'dd/MM/yyyy')}
            </div>
            {waiting.length > 0 && (
              <div style={{ 
                color: '#9ca3af', 
                fontSize: '0.875rem',
                marginTop: '0.25rem',
              }}>
                {waiting.length} en espera
              </div>
            )}
          </div>
        </div>

        {/* Área principal - Pacientes llamados */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            color: '#E73C3E',
            marginBottom: '1rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            textAlign: 'center',
            flexShrink: 0,
          }}>
            🔔 Pase a Box
          </h2>

          {displayedPatients.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#9ca3af', 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ fontSize: '1.5rem' }}>
                En espera de llamar pacientes...
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              flex: 1,
              justifyContent: 'flex-start',
            }}>
              {displayedPatients.map((patient, index) => {
                const isLastCalled = index === 0; // El primero es el más reciente
                
                return (
                  <div
                    key={patient.id}
                    className={isLastCalled ? 'fade-in' : ''}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: isLastCalled ? '1.25rem 2rem' : '0.75rem 1.5rem',
                      background: isLastCalled ? '#fff5f5' : '#f9fafb',
                      borderRadius: '12px',
                      border: isLastCalled ? '3px solid #E73C3E' : '2px solid #e5e7eb',
                      boxShadow: isLastCalled 
                        ? '0 6px 20px rgba(231, 60, 62, 0.25)' 
                        : '0 2px 6px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                      flexShrink: 0,
                    }}
                  >
                    {/* Cédula */}
                    <div 
                      className={isLastCalled ? 'pulse' : ''}
                      style={{
                        fontSize: isLastCalled ? '2.5rem' : '1.75rem',
                        color: 'white',
                        fontWeight: 'bold',
                        padding: isLastCalled ? '1rem 2rem' : '0.5rem 1.25rem',
                        background: isLastCalled 
                          ? 'linear-gradient(135deg, #E73C3E 0%, #C32F31 100%)' 
                          : '#E73C3E',
                        borderRadius: '10px',
                        boxShadow: isLastCalled 
                          ? '0 6px 16px rgba(231, 60, 62, 0.4)' 
                          : '0 3px 8px rgba(231, 60, 62, 0.3)',
                        minWidth: isLastCalled ? '280px' : '220px',
                        textAlign: 'center',
                      }}
                    >
                      CI: {patient.cedula}
                    </div>

                    {/* Puesto */}
                    <div style={{
                      fontSize: isLastCalled ? '2.5rem' : '1.75rem',
                      color: 'white',
                      fontWeight: 'bold',
                      padding: isLastCalled ? '1rem 2rem' : '0.5rem 1.25rem',
                      background: isLastCalled 
                        ? 'linear-gradient(135deg, #2C7DA0 0%, #1a5978 100%)' 
                        : '#2C7DA0',
                      borderRadius: '10px',
                      boxShadow: isLastCalled 
                        ? '0 6px 16px rgba(44, 125, 160, 0.4)' 
                        : '0 3px 8px rgba(44, 125, 160, 0.3)',
                      minWidth: isLastCalled ? '200px' : '150px',
                      textAlign: 'center',
                    }}>
                      BOX {patient.puesto || '?'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}