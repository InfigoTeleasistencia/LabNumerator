import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import axios from 'axios';
import { format } from 'date-fns';

export default function LabPage() {
  const { isConnected, queueState } = useSocket();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Cargar estado inicial
  useEffect(() => {
    axios.get('/api/queue/state').catch(console.error);
  }, []);

  // Seleccionar el primer sector automáticamente
  useEffect(() => {
    if (!selectedSector && Object.keys(queueState.sectors).length > 0) {
      setSelectedSector(Object.keys(queueState.sectors)[0]);
    }
  }, [queueState.sectors, selectedSector]);

  const handleCallNext = async () => {
    if (isLoading || !selectedSector) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/queue/next', { sectorId: selectedSector });
      
      if (response.data.success) {
        const patient = response.data.patient;
        setNotification(`Llamando a: ${patient.name} (${patient.code})`);
        
        // Reproducir sonido de notificación
        playNotificationSound();
        
        // Limpiar notificación después de 3 segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error al llamar al siguiente paciente';
      setNotification(errorMsg);
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const sectors = Object.keys(queueState.sectors);
  const sectorData = selectedSector ? queueState.sectors[selectedSector] : null;
  const current = sectorData?.current || null;
  const waiting = sectorData?.waiting || [];
  const recent = sectorData?.recent || [];

  // Calcular totales generales
  const totalWaiting = sectors.reduce((sum, id) => sum + queueState.sectors[id].waiting.length, 0);
  const totalCurrent = sectors.reduce((sum, id) => sum + (queueState.sectors[id].current ? 1 : 0), 0);
  const totalRecent = sectors.reduce((sum, id) => sum + queueState.sectors[id].recent.length, 0);

  return (
    <>
      <Head>
        <title>Panel Laboratorista - Asociación Española</title>
      </Head>
      <main style={{
        minHeight: '100vh',
        padding: '2rem',
        background: '#E8F4F8',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <img 
                src="/logo-icon.png" 
                alt="Asociación Española" 
                style={{ height: '50px' }}
              />
              <div>
                <h1 style={{
                  fontSize: '1.75rem',
                  color: '#1f2937',
                  marginBottom: '0.25rem',
                }}>
                  Panel del Laboratorista
                </h1>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {isConnected ? '🟢 Sistema conectado' : '🔴 Sistema desconectado'}
                </p>
              </div>
            </div>
            <Link href="/" className="btn btn-secondary">
              Volver al inicio
            </Link>
          </div>

          {/* Notificación */}
          {notification && (
            <div className="fade-in" style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              textAlign: 'center',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#1f2937',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}>
              {notification}
            </div>
          )}

          {/* Selector de Sector */}
          {sectors.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Seleccionar Sector:</h3>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}>
                {sectors.map((sectorId) => {
                  const sector = queueState.sectors[sectorId];
                  const patient = sector.waiting[0];
                  const sectorName = patient?.sectorDescription || `Sector ${sectorId}`;
                  
                  return (
                    <button
                      key={sectorId}
                      onClick={() => setSelectedSector(sectorId)}
                      style={{
                        padding: '1rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: selectedSector === sectorId
                          ? '#E73C3E'
                          : '#f3f4f6',
                        color: selectedSector === sectorId ? 'white' : '#374151',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '1rem',
                      }}
                    >
                      <div>{sectorName}</div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                        {sector.waiting.length} en espera
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginBottom: '2rem',
          }}>
            {/* Paciente actual */}
            <div className="card">
              <h2 style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                color: '#1f2937',
              }}>
                Atendiendo Ahora
                {selectedSector && sectorData?.waiting[0] && (
                  <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                    ({sectorData.waiting[0].sectorDescription})
                  </span>
                )}
              </h2>

              {current ? (
                <div className="fade-in">
                  <div style={{
                    padding: '2rem',
                    background: '#E73C3E',
                    borderRadius: '12px',
                    color: 'white',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                  }}>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {current.code}
                    </div>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                      {current.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                      CI: {current.cedula}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
                      Llamado: {current.calledAt ? format(new Date(current.calledAt), 'HH:mm:ss') : '-'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#9ca3af',
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
                  <p style={{ fontSize: '1.125rem' }}>Sin paciente en atención</p>
                </div>
              )}

              <button
                className="btn btn-success"
                onClick={handleCallNext}
                disabled={isLoading || waiting.length === 0 || !selectedSector}
                style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}
              >
                {isLoading ? 'Llamando...' : `Llamar Siguiente ${waiting.length > 0 ? `(${waiting.length} en espera)` : ''}`}
              </button>
            </div>

            {/* Estadísticas */}
            <div className="card">
              <h2 style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                color: '#1f2937',
              }}>
                Estadísticas Generales
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: '#FFF5E6',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#FCD116',
                  }}>
                    {totalWaiting}
                  </div>
                  <div style={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: '600' }}>
                    En Espera
                  </div>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: '#E1F4FB',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#3B9DD4',
                  }}>
                    {totalCurrent}
                  </div>
                  <div style={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: '600' }}>
                    En Atención
                  </div>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: '#d1fae5',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#059669',
                  }}>
                    {totalRecent}
                  </div>
                  <div style={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: '600' }}>
                    Atendidos
                  </div>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: '#FCE8E9',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#E73C3E',
                  }}>
                    {sectors.length}
                  </div>
                  <div style={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: '600' }}>
                    Sectores Activos
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cola de espera del sector seleccionado */}
          {selectedSector && (
            <div className="card">
              <h2 style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                color: '#1f2937',
              }}>
                Pacientes en Espera
                {sectorData?.waiting[0] && (
                  <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                    ({sectorData.waiting[0].sectorDescription})
                  </span>
                )}
              </h2>

              {waiting.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#9ca3af',
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📋</div>
                  <p style={{ fontSize: '1.125rem' }}>No hay pacientes en espera en este sector</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1rem',
                }}>
                  {waiting.map((patient, index) => (
                    <div
                      key={patient.id}
                      className="fade-in"
                      style={{
                        padding: '1.5rem',
                        background: index === 0 
                          ? '#FFF5E6'
                          : '#f9fafb',
                        borderRadius: '8px',
                        border: index === 0 ? '2px solid #FCD116' : '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                      }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: '#1f2937',
                        }}>
                          {patient.code}
                        </div>
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          background: index === 0 ? '#E73C3E' : '#6b7280',
                          color: 'white',
                          borderRadius: '999px',
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                        }}>
                          #{patient.position}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '1.125rem',
                        color: '#1f2937',
                        marginBottom: '0.25rem',
                      }}>
                        {patient.name}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                      }}>
                        CI: {patient.cedula}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                      }}>
                        Registro: {format(new Date(patient.timestamp), 'HH:mm:ss')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}