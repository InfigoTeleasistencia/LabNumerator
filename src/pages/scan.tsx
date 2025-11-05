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
        setSectorInfo(
          response.data.sector || response.data.patient.sectorDescription
        );
        setMessage('¡Código validado correctamente!');

        // Obtener posición en la cola del sector
        const queueResponse = await axios.get('/api/queue/state');
        const sectorId = response.data.patient.sector;
        const sectorData = queueResponse.data.sectors[sectorId];

        if (sectorData) {
          const pos =
            sectorData.waiting.findIndex((p: any) => p.code === code) + 1;
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
      const errorMsg =
        error.response?.data?.error || 'Error al validar el código';
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
        <title>Validación de Código - Asociación Española</title>
      </Head>
      <main
        style={{
          minHeight: '100vh',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 2rem',
          background: '#2892c5',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            maxWidth: '600px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            height: '100%',
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: '3rem' }}>
            <img
              src="/logo.png"
              alt="Asociación Española Primera en Salud"
              style={{ height: '100px', maxWidth: '90%', objectFit: 'contain' }}
            />
          </div>

          {/* Área de contenido principal */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {status === 'idle' && (
              <>
                {/* Ilustración del tótem */}
                <div
                  style={{
                    marginBottom: '2.5rem',
                    animation: isScanning ? 'pulse 1.5s infinite' : 'none',
                  }}
                >
                  <img
                    src="/totem.png"
                    alt="Tótem de autoservicio"
                    style={{
                      height: '320px',
                      maxWidth: '95%',
                      objectFit: 'contain',
                      transform: 'scale(1.1)',
                    }}
                  />
                </div>
                <h1
                  style={{
                    fontSize: '1.9rem',
                    color: 'white',
                    marginBottom: '1.5rem',
                    fontWeight: 'bold',
                    lineHeight: '1.4',
                    maxWidth: '550px',
                    padding: '0 1rem',
                  }}
                >
                  Pasa por el lector el código de barras ubicado en la parte
                  superior de su formulario de coordinación
                </h1>
                <div
                  style={{
                    fontSize: '1.25rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: '1.6',
                    maxWidth: '450px',
                  }}
                >
                  <p style={{ marginBottom: '1rem' }}>
                    {isScanning ? '⏳ Escaneando código...' : ''}
                  </p>
                </div>
              </>
            )}

            {status === 'validating' && (
              <>
                <div
                  style={{
                    fontSize: '8rem',
                    animation: 'pulse 1s infinite',
                    marginBottom: '2rem',
                  }}
                >
                  ⏳
                </div>
                <h2
                  style={{
                    fontSize: '2rem',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  Validando código...
                </h2>
              </>
            )}

            {status === 'success' && (
              <div
                className="fade-in"
                style={{ width: '100%', maxWidth: '500px' }}
              >
                <div
                  style={{
                    fontSize: '8rem',
                    marginBottom: '2rem',
                  }}
                >
                  ✅
                </div>

                <h2
                  style={{
                    fontSize: '2.5rem',
                    color: 'white',
                    fontWeight: 'bold',
                    marginBottom: '2rem',
                  }}
                >
                  ¡Código Validado!
                </h2>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '2.5rem',
                    borderRadius: '20px',
                    marginBottom: '2rem',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '1.75rem',
                      color: '#1f2937',
                      marginBottom: '1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {patientName}
                  </p>
                  <p
                    style={{
                      fontSize: '1.125rem',
                      color: '#6b7280',
                      marginBottom: '2rem',
                    }}
                  >
                    CI: {cedula}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '1.5rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        padding: '1.25rem 2rem',
                        background: '#3B9DD4',
                        color: 'white',
                        borderRadius: '12px',
                        minWidth: '140px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.875rem',
                          opacity: 0.9,
                          marginBottom: '0.25rem',
                        }}
                      >
                        Diríjase a
                      </div>
                      <strong style={{ fontSize: '1.5rem', display: 'block' }}>
                        {sectorInfo}
                      </strong>
                    </div>

                    {position !== null && (
                      <div
                        style={{
                          padding: '1.25rem 2rem',
                          background: '#E73C3E',
                          color: 'white',
                          borderRadius: '12px',
                          minWidth: '140px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.875rem',
                            opacity: 0.9,
                            marginBottom: '0.25rem',
                          }}
                        >
                          Posición
                        </div>
                        <strong
                          style={{ fontSize: '1.5rem', display: 'block' }}
                        >
                          #{position}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '1.25rem',
                    color: 'white',
                    lineHeight: '1.5',
                    fontWeight: '600',
                  }}
                >
                  Retira tu ticket con tu número y<br />
                  espera a ser llamado por las pantallas
                  <br />
                  en el sector de laboratorio
                </p>
              </div>
            )}

            {status === 'error' && (
              <>
                <div
                  style={{
                    fontSize: '8rem',
                    marginBottom: '2rem',
                  }}
                >
                  ❌
                </div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '2rem',
                    borderRadius: '20px',
                    maxWidth: '450px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '1.5rem',
                      color: '#dc2626',
                      fontWeight: 'bold',
                      lineHeight: '1.4',
                    }}
                  >
                    {message}
                  </p>
                </div>
                <p
                  style={{
                    fontSize: '1.125rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginTop: '2rem',
                  }}
                >
                  Por favor consulte con recepción
                </p>
              </>
            )}
          </div>

          {/* Footer - Instrucciones pequeñas */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '2rem',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
            }}
          >
            <p></p>
          </div>

          {/* Link oculto para volver (solo visible en desarrollo) */}
          <Link
            href="/"
            style={{
              position: 'fixed',
              bottom: '10px',
              left: '10px',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.5)',
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
            }}
          >
            ⌂ Inicio
          </Link>
        </div>
      </main>
    </>
  );
}
