import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import axios from 'axios';

type Status = 'idle' | 'validating' | 'success' | 'error';

export default function ScanPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [patientName, setPatientName] = useState('');
  const [sectorInfo, setSectorInfo] = useState('');
  const [position, setPosition] = useState<number | null>(null);
  const [cedula, setCedula] = useState('');

  const handleScan = async (code: string) => {
    console.log('Código escaneado:', code);
    setStatus('validating');
    setMessage('Validando código...');

    try {
      const response = await axios.post('/api/validate', { code });
      
      if (response.data.success) {
        setStatus('success');
        setPatientName(response.data.patient.name);
        setCedula(response.data.patient.cedula);
        setSectorInfo(response.data.sector || response.data.patient.sectorDescription);
        setMessage('¡Código validado correctamente!');
        
        // Obtener posición en la cola del sector
        const queueResponse = await axios.get('/api/queue/state');
        const sectorId = response.data.patient.sector;
        const sectorData = queueResponse.data.sectors[sectorId];
        
        if (sectorData) {
          const pos = sectorData.waiting.findIndex((p: any) => p.code === code) + 1;
          setPosition(pos);
        }

        // Auto-reset después de 6 segundos
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          setPatientName('');
          setSectorInfo('');
          setPosition(null);
          setCedula('');
        }, 6000);
      }
    } catch (error: any) {
      setStatus('error');
      const errorMsg = error.response?.data?.error || 'Error al validar el código';
      const errorDesc = error.response?.data?.errorDescription;
      
      setMessage(errorDesc ? `${errorMsg}: ${errorDesc}` : errorMsg);

      // Auto-reset después de 4 segundos
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 4000);
    }
  };

  const { isScanning } = useBarcodeScanner({
    onScan: handleScan,
    minLength: 4,
  });

  return (
    <>
      <Head>
        <title>Validación de Código - Laboratorio</title>
      </Head>
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ maxWidth: '700px', width: '100%' }}>
          <Link 
            href="/" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'white',
              marginBottom: '1.5rem',
              fontSize: '1rem',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ← Volver al inicio
          </Link>

          <div className="card fade-in" style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '2rem',
              marginBottom: '1rem',
              color: '#1f2937',
            }}>
              Validación de Código de Barras
            </h1>

            <div style={{
              minHeight: '350px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
            }}>
              {status === 'idle' && (
                <>
                  <div style={{
                    fontSize: '5rem',
                    animation: isScanning ? 'pulse 1s infinite' : 'none',
                  }}>
                    {isScanning ? '📷' : '📋'}
                  </div>
                  <p style={{
                    fontSize: '1.25rem',
                    color: '#6b7280',
                  }}>
                    {isScanning ? 'Escaneando...' : 'Esperando escaneo del código de barras'}
                  </p>
                  <div style={{
                    padding: '1rem',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}>
                    <p>💡 Lector Union UN-BR60 conectado por USB</p>
                    <p>Simplemente escanee el código de barras del paciente</p>
                  </div>
                </>
              )}

              {status === 'validating' && (
                <>
                  <div style={{
                    fontSize: '5rem',
                    animation: 'pulse 1s infinite',
                  }}>
                    ⏳
                  </div>
                  <p style={{
                    fontSize: '1.25rem',
                    color: '#6b7280',
                  }}>
                    {message}
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div style={{
                    fontSize: '5rem',
                    animation: 'fadeIn 0.5s ease-out',
                  }}>
                    ✅
                  </div>
                  <div style={{
                    animation: 'fadeIn 0.5s ease-out',
                    width: '100%',
                  }}>
                    <p style={{
                      fontSize: '1.5rem',
                      color: '#059669',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                    }}>
                      {message}
                    </p>
                    
                    <div style={{
                      background: '#f9fafb',
                      padding: '1.5rem',
                      borderRadius: '12px',
                      marginBottom: '1rem',
                    }}>
                      <p style={{
                        fontSize: '1.25rem',
                        color: '#1f2937',
                        marginBottom: '0.5rem',
                      }}>
                        <strong>{patientName}</strong>
                      </p>
                      <p style={{
                        fontSize: '1rem',
                        color: '#6b7280',
                      }}>
                        CI: {cedula}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '1rem 1.5rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '1rem',
                      }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Sector</div>
                        <strong style={{ fontSize: '1.25rem' }}>{sectorInfo}</strong>
                      </div>
                      
                      {position !== null && (
                        <div style={{
                          display: 'inline-block',
                          padding: '1rem 1.5rem',
                          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '1rem',
                        }}>
                          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Posición</div>
                          <strong style={{ fontSize: '1.25rem' }}>#{position}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div style={{
                    fontSize: '5rem',
                    animation: 'fadeIn 0.5s ease-out',
                  }}>
                    ❌
                  </div>
                  <p style={{
                    fontSize: '1.125rem',
                    color: '#dc2626',
                    fontWeight: 'bold',
                    padding: '0 1rem',
                  }}>
                    {message}
                  </p>
                </>
              )}
            </div>
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#374151',
          }}>
            <p><strong>Códigos de prueba (mock):</strong></p>
            <p>110007938, 110007939, 110007940, 110007941, 110007942</p>
          </div>
        </div>
      </main>
    </>
  );
}