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

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <>
      <Head>
        <title>Pantalla de Atención - Asociación Española</title>
      </Head>
      <main style={{
        minHeight: '100vh',
        background: '#E8F4F8',
        padding: '2rem',
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <img 
              src="/logo.png" 
              alt="Asociación Española Primera en Salud" 
              style={{ height: '60px' }}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#1f2937',
            }}>
              {format(currentTime, 'HH:mm')}
            </div>
            <div style={{ color: '#6b7280', fontSize: '1rem' }}>
              {format(currentTime, 'dd/MM/yyyy')}
            </div>
          </div>
        </div>


        {/* Pacientes llamados - Lista vertical */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.75rem',
            color: '#3B9DD4',
            marginBottom: '1.5rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            {selectedSector && (sectorData?.waiting[0]?.sectorDescription || 'SECTOR A')} - Pase a
          </h2>

          {calledPatients.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ fontSize: '1.5rem' }}>
                En espera de llamar pacientes...
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}>
              {calledPatients.map((patient, index) => {
                const isLastCalled = index === 0; // El primero es el más reciente
                
                return (
                  <div
                    key={patient.id}
                    className={isLastCalled ? 'fade-in' : ''}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: isLastCalled ? '2.5rem 3rem' : '1.5rem 2rem',
                      background: isLastCalled ? '#fff5f5' : '#f9fafb',
                      borderRadius: '16px',
                      border: isLastCalled ? '3px solid #E73C3E' : '2px solid #e5e7eb',
                      boxShadow: isLastCalled 
                        ? '0 8px 24px rgba(231, 60, 62, 0.25)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {/* Cédula */}
                    <div 
                      className={isLastCalled ? 'pulse' : ''}
                      style={{
                        fontSize: isLastCalled ? '4rem' : '2.5rem',
                        color: 'white',
                        fontWeight: 'bold',
                        padding: isLastCalled ? '2rem 3rem' : '1rem 2rem',
                        background: isLastCalled 
                          ? 'linear-gradient(135deg, #E73C3E 0%, #C32F31 100%)' 
                          : '#E73C3E',
                        borderRadius: '12px',
                        boxShadow: isLastCalled 
                          ? '0 8px 24px rgba(231, 60, 62, 0.4)' 
                          : '0 4px 12px rgba(231, 60, 62, 0.3)',
                        minWidth: isLastCalled ? '400px' : '300px',
                      }}
                    >
                      CI: {patient.cedula}
                    </div>

                    {/* Puesto */}
                    {patient.puesto && (
                      <div style={{
                        fontSize: isLastCalled ? '3.5rem' : '2.5rem',
                        color: 'white',
                        fontWeight: 'bold',
                        padding: isLastCalled ? '2rem 3rem' : '1rem 2rem',
                        background: isLastCalled 
                          ? 'linear-gradient(135deg, #2C7DA0 0%, #1a5978 100%)' 
                          : '#2C7DA0',
                        borderRadius: '12px',
                        boxShadow: isLastCalled 
                          ? '0 8px 24px rgba(44, 125, 160, 0.4)' 
                          : '0 4px 12px rgba(44, 125, 160, 0.3)',
                      }}>
                        📍 PUESTO {patient.puesto}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de espera - Abajo */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#3B9DD4',
            marginBottom: '1.5rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}>
            Pacientes en Espera ({waiting.length})
          </h2>

          {waiting.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              padding: '2rem',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📋</div>
              <p>Sin pacientes en espera</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem',
            }}>
                  {waiting.slice(0, 10).map((patient, index) => (
                    <div
                      key={patient.id}
                      className="fade-in"
                      style={{
                        padding: '1rem',
                        background: index === 0 
                          ? '#FFF5E6'
                          : '#f9fafb',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: index === 0 ? '2px solid #FCD116' : '1px solid #e5e7eb',
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: 'bold',
                          color: '#1f2937',
                        }}>
                          CI: {patient.cedula}
                        </div>
                        {patient.puesto && (
                          <div style={{
                            fontSize: '1rem',
                            color: '#E73C3E',
                            fontWeight: 'bold',
                            marginTop: '0.5rem',
                          }}>
                            📍 Puesto {patient.puesto}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: index === 0 ? '#E73C3E' : '#9ca3af',
                      }}>
                        #{patient.position}
                      </div>
                    </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}