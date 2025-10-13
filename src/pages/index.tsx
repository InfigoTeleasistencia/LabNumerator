import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>Sistema de Atención - Laboratorio</title>
        <meta name="description" content="Sistema de numeración de atención para laboratorio" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
        }}>
          <div className="card fade-in" style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '2.5rem',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Sistema de Atención
            </h1>
            <p style={{
              color: '#6b7280',
              fontSize: '1.125rem',
              marginBottom: '3rem',
            }}>
              Selecciona tu rol para continuar
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginTop: '2rem',
            }}>
              <Link href="/scan" style={{
                display: 'block',
                padding: '2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textDecoration: 'none',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  Validación
                </h2>
                <p style={{ opacity: 0.9 }}>
                  Escanear código de barras
                </p>
              </Link>

              <Link href="/display" style={{
                display: 'block',
                padding: '2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                textDecoration: 'none',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📺</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  Pantalla
                </h2>
                <p style={{ opacity: 0.9 }}>
                  Vista para sala de espera
                </p>
              </Link>

              <Link href="/lab" style={{
                display: 'block',
                padding: '2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                textDecoration: 'none',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍⚕️</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  Laboratorista
                </h2>
                <p style={{ opacity: 0.9 }}>
                  Llamar siguiente paciente
                </p>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}


