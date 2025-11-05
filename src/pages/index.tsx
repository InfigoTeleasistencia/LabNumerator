import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>Sistema de Atención - Asociación Española Primera en Salud</title>
        <meta name="description" content="Sistema de numeración de atención para laboratorio" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#E8F4F8',
      }}>
        <div style={{
          maxWidth: '900px',
          width: '100%',
        }}>
          <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <img 
                src="/logo.png" 
                alt="Asociación Española Primera en Salud" 
                style={{ height: '80px', margin: '0 auto' }}
              />
            </div>
            <h1 style={{
              fontSize: '2.5rem',
              marginBottom: '1rem',
              color: '#1f2937',
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
                background: '#E73C3E',
                color: 'white',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(231, 60, 62, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(231, 60, 62, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(231, 60, 62, 0.3)';
              }}
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
                background: '#3B9DD4',
                color: 'white',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(59, 157, 212, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 157, 212, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 157, 212, 0.3)';
              }}
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
                background: '#2C7DA0',
                color: 'white',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(44, 125, 160, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(44, 125, 160, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(44, 125, 160, 0.3)';
              }}
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


