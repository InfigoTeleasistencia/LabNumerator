import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useSocket } from '@/hooks/useSocket';
import { format } from 'date-fns';
import axios from 'axios';
import { Patient } from '@/types';

export default function DisplayPage() {
  const { isConnected, queueState } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const sectors = Object.keys(queueState.sectors);
  const sectorData = selectedSector ? queueState.sectors[selectedSector] : null;
  const current = sectorData?.current || null;
  const waiting = sectorData?.waiting || [];

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

        {/* Selector de Sector */}
        {sectors.length > 1 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
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
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedSector === sectorId
                      ? '#E73C3E'
                      : '#f3f4f6',
                    color: selectedSector === sectorId ? 'white' : '#374151',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {sectorName} ({sector.waiting.length})
                </button>
              );
            })}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '2rem',
        }}>
          {/* Paciente actual */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <h2 style={{
              fontSize: '2rem',
              color: '#3B9DD4',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}>
              {selectedSector && queueState.sectors[selectedSector]?.waiting[0]?.sectorDescription}
            </h2>
            <h3 style={{
              fontSize: '1rem',
              color: '#9ca3af',
              marginBottom: '2rem',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}>
              Pase a
            </h3>
            
            {current ? (
              <div className="fade-in" style={{ textAlign: 'center', width: '100%' }}>
                <div style={{
                  fontSize: '8rem',
                  fontWeight: 'bold',
                  color: '#E73C3E',
                  marginBottom: '1rem',
                  animation: 'pulse 2s infinite',
                  letterSpacing: '8px',
                }}>
                  {current.code}
                </div>
                <div style={{
                  fontSize: '2rem',
                  color: '#1f2937',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                }}>
                  {current.name}
                </div>
                <div style={{
                  fontSize: '1.125rem',
                  color: '#6b7280',
                }}>
                  CI: {current.cedula}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>⏳</div>
                <p style={{ fontSize: '1.5rem' }}>
                  En espera...
                </p>
              </div>
            )}
          </div>

          {/* Cola de espera */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              color: '#3B9DD4',
              marginBottom: '1.5rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}>
              En Espera ({waiting.length})
            </h2>

            <div style={{
              flex: 1,
              overflowY: 'auto',
            }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                          fontSize: '1.125rem',
                          fontWeight: 'bold',
                          color: '#1f2937',
                        }}>
                          {patient.code}
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                        }}>
                          {patient.name}
                        </div>
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
          </div>
        </div>
      </main>
    </>
  );
}