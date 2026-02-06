import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import axios from 'axios';

type Status = 'idle' | 'validating' | 'success' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const isTestMode = router.query.test === 'true';

  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [patientName, setPatientName] = useState('');
  const [sectorInfo, setSectorInfo] = useState('');
  const [cedula, setCedula] = useState('');

  // Estado para panel de testing personalizado
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testFormData, setTestFormData] = useState({
    nombre: 'Juan',
    apellido1: 'Pérez',
    apellido2: 'García',
    cedula: '1234567',
    digito: '8',
    horaInicial: '08:00',
    horaFinal: '10:00',
    sector: '151',
    sectorDescripcion: 'SECTOR A',
  });

  // Genera datos aleatorios para testing (formato igual al servicio SOAP)
  const generateRandomTestData = () => {
    const firstNames = [
      'Juan',
      'María',
      'Carlos',
      'Ana',
      'Luis',
      'Sofía',
      'Pedro',
      'Laura',
      'Miguel',
      'Carmen',
    ];
    const lastNames = [
      'González',
      'Rodríguez',
      'Martínez',
      'García',
      'López',
      'Fernández',
      'Pérez',
      'Sánchez',
      'Díaz',
      'Torres',
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName1 = lastNames[Math.floor(Math.random() * lastNames.length)];
    const lastName2 = lastNames[Math.floor(Math.random() * lastNames.length)];

    const cedula = Math.floor(1000000 + Math.random() * 8000000);
    const digito = Math.floor(Math.random() * 10);
    const code = `TEST${Date.now()}`;

    // Generar fecha y horas en formato ISO igual al servicio SOAP
    const now = new Date();
    const fecha = now.toISOString().split('T')[0]; // "2026-02-04"
    
    // Hora inicial aleatoria entre 8:00 y 12:00
    const horaInicialH = Math.floor(8 + Math.random() * 4);
    const horaInicialM = Math.floor(Math.random() * 60);
    const horaInicial = `${fecha}T${String(horaInicialH).padStart(2, '0')}:${String(horaInicialM).padStart(2, '0')}:00`;
    
    // Hora final = hora inicial + 20 minutos
    const horaFinalH = horaInicialM + 20 >= 60 ? horaInicialH + 1 : horaInicialH;
    const horaFinalM = (horaInicialM + 20) % 60;
    const horaFinal = `${fecha}T${String(horaFinalH).padStart(2, '0')}:${String(horaFinalM).padStart(2, '0')}:00`;

    return {
      code,
      name: `${firstName} ${lastName1} ${lastName2}`,
      cedula,
      digito,
      matricula: Math.floor(10000 + Math.random() * 90000),
      usuario: Math.floor(100000 + Math.random() * 900000),
      dependencia: 151,
      depDescripcion: 'LABORATORIO',
      sector: 151,
      secDescripcion: 'SECTOR A',
      fecha,
      horaInicial,
      horaFinal,
    };
  };

  const handleTestScan = async () => {
    const testData = generateRandomTestData();
    console.log('Test scan con datos aleatorios:', testData);
    await handleScan(testData.code, testData);
  };

  const handleCustomTestScan = async () => {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0]; // "2026-02-04"
    
    // Convertir HH:mm a formato ISO completo como el servicio SOAP
    const horaInicial = `${fecha}T${testFormData.horaInicial}:00`;
    const horaFinal = `${fecha}T${testFormData.horaFinal}:00`;
    
    const testData = {
      code: `TEST${Date.now()}`,
      name: `${testFormData.nombre} ${testFormData.apellido1} ${testFormData.apellido2}`,
      cedula: parseInt(testFormData.cedula),
      digito: parseInt(testFormData.digito),
      matricula: Math.floor(10000 + Math.random() * 90000),
      usuario: Math.floor(100000 + Math.random() * 900000),
      dependencia: parseInt(testFormData.sector),
      depDescripcion: 'LABORATORIO',
      sector: parseInt(testFormData.sector),
      secDescripcion: testFormData.sectorDescripcion,
      fecha,
      horaInicial,
      horaFinal,
    };

    console.log('Test scan con datos personalizados:', testData);
    await handleScan(testData.code, testData);
    setShowTestPanel(false); // Cerrar panel después de enviar
  };

  const handleScan = async (code: string, testData?: any) => {
    console.log('Código escaneado:', code);
    setStatus('validating');
    setMessage('Validando código...');

    try {
      const response = await axios.post('/api/validate', {
        code,
        testMode: !!testData,
        testData,
      });

      if (response.data.success) {
        setStatus('success');
        setPatientName(response.data.patient.name);
        setCedula(response.data.patient.cedula);
        setSectorInfo(
          response.data.sector || response.data.patient.sectorDescription
        );
        setMessage('¡Código validado correctamente!');

        // Auto-reset después de 6 segundos
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          setPatientName('');
          setSectorInfo('');
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
            maxWidth: '900px',
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
          <div style={{ marginBottom: '1.5rem' }}>
            <img
              src="/logo.png"
              alt="Asociación Española Primera en Salud"
              style={{ height: '15em', maxWidth: '95%', objectFit: 'contain' }}
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
                    marginBottom: '1rem',
                    overflow: 'hidden',
                    animation: isScanning ? 'pulse 1.5s infinite' : 'none',
                    maxHeight: '520px',
                  }}
                >
                  <img
                    src="/totem.png"
                    alt="Tótem de autoservicio"
                    style={{
                      height: '43em',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center bottom',
                      marginTop: '-100px',
                      translate: '-2px',
                    }}
                  />
                </div>
                <h1
                  style={{
                    fontSize: '2.5rem',
                    color: 'white',
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
                  Por favor, espera a ser llamado
                  <br />
                  en las pantallas del sector de laboratorio
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

          {/* Panel de Testing - Solo visible con ?test=true */}
          {isTestMode && (
            <div
              style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                zIndex: 1000,
              }}
            >
              {/* Botones de test */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: showTestPanel ? '10px' : '0',
                }}
              >
                <button
                  onClick={handleTestScan}
                  disabled={status !== 'idle'}
                  style={{
                    fontSize: '0.75rem',
                    color:
                      status === 'idle'
                        ? 'rgba(255, 255, 255, 0.7)'
                        : 'rgba(255, 255, 255, 0.3)',
                    background:
                      status === 'idle'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '8px 15px',
                    borderRadius: '6px',
                    cursor: status === 'idle' ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (status === 'idle') {
                      e.currentTarget.style.background =
                        'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status === 'idle') {
                      e.currentTarget.style.background =
                        'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  🎲 Aleatorio
                </button>

                <button
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  disabled={status !== 'idle'}
                  style={{
                    fontSize: '0.75rem',
                    color:
                      status === 'idle'
                        ? 'rgba(255, 255, 255, 0.7)'
                        : 'rgba(255, 255, 255, 0.3)',
                    background:
                      status === 'idle'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '8px 15px',
                    borderRadius: '6px',
                    cursor: status === 'idle' ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (status === 'idle') {
                      e.currentTarget.style.background =
                        'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status === 'idle') {
                      e.currentTarget.style.background =
                        'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  🧪 {showTestPanel ? 'Cerrar' : 'Personalizar'}
                </button>
              </div>

              {/* Panel de formulario personalizado */}
              {showTestPanel && status === 'idle' && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    width: '350px',
                    maxHeight: '500px',
                    overflowY: 'auto',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1rem',
                      color: '#1f2937',
                      fontWeight: 'bold',
                    }}
                  >
                    Datos de Prueba Personalizados
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    {/* Nombre */}
                    <div>
                      <label
                        style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          display: 'block',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={testFormData.nombre}
                        onChange={(e) =>
                          setTestFormData({
                            ...testFormData,
                            nombre: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>

                    {/* Apellidos */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Apellido 1
                        </label>
                        <input
                          type="text"
                          value={testFormData.apellido1}
                          onChange={(e) =>
                            setTestFormData({
                              ...testFormData,
                              apellido1: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Apellido 2
                        </label>
                        <input
                          type="text"
                          value={testFormData.apellido2}
                          onChange={(e) =>
                            setTestFormData({
                              ...testFormData,
                              apellido2: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                          }}
                        />
                      </div>
                    </div>

                    {/* Cédula */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Cédula
                        </label>
                        <input
                          type="text"
                          value={testFormData.cedula}
                          onChange={(e) =>
                            setTestFormData({
                              ...testFormData,
                              cedula: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          placeholder="1234567"
                          maxLength={7}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Dígito
                        </label>
                        <input
                          type="text"
                          value={testFormData.digito}
                          onChange={(e) =>
                            setTestFormData({
                              ...testFormData,
                              digito: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          placeholder="8"
                          maxLength={1}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                          }}
                        />
                      </div>
                    </div>

                    {/* Horarios */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Hora Inicial (HH:mm)
                        </label>
                        <input
                          type="text"
                          placeholder="08:00"
                          pattern="[0-2][0-9]:[0-5][0-9]"
                          maxLength={5}
                          value={testFormData.horaInicial}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^0-9:]/g, '');
                            // Auto-agregar : después de 2 dígitos
                            if (value.length === 2 && !value.includes(':')) {
                              value = value + ':';
                            }
                            setTestFormData({
                              ...testFormData,
                              horaInicial: value,
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Hora Final (HH:mm)
                        </label>
                        <input
                          type="text"
                          placeholder="14:00"
                          pattern="[0-2][0-9]:[0-5][0-9]"
                          maxLength={5}
                          value={testFormData.horaFinal}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^0-9:]/g, '');
                            // Auto-agregar : después de 2 dígitos
                            if (value.length === 2 && !value.includes(':')) {
                              value = value + ':';
                            }
                            setTestFormData({
                              ...testFormData,
                              horaFinal: value,
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace',
                          }}
                        />
                      </div>
                    </div>

                    {/* Sector */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 2fr',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Sector
                        </label>
                        <input
                          type="text"
                          value={testFormData.sector}
                          onChange={(e) =>
                            setTestFormData({
                              ...testFormData,
                              sector: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={testFormData.sectorDescripcion}
                          onChange={(e) =>
                            setTestFormData({
                              ...testFormData,
                              sectorDescripcion: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.875rem',
                          }}
                        />
                      </div>
                    </div>

                    {/* Botón de enviar */}
                    <button
                      onClick={handleCustomTestScan}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#E73C3E',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginTop: '0.5rem',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d32f2f';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#E73C3E';
                      }}
                    >
                      ✓ Crear Paciente de Prueba
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
