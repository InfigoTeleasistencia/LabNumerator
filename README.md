# 🏥 Sistema de Numeración de Atención para Laboratorio

Sistema web completo de gestión de cola de atención para laboratorios, con soporte para lectores de códigos de barras USB e integración con servicio SOAP GXSalud.

## ✨ Características

- **Validación automática** mediante lector de códigos de barras USB (Union UN-BR60)
- **Integración con servicio SOAP** de GXSalud para validar códigos
- **Gestión por sectores** (Sector A, Sector B, Sector C, etc.)
- **Validación de horarios** - Rechaza turnos vencidos automáticamente
- **Actualización en tiempo real** usando WebSockets
- **3 interfaces especializadas**:
  - 📋 **Validación**: Escaneo de código de barras
  - 📺 **Pantalla**: Vista para sala de espera (por sectores)
  - 👨‍⚕️ **Laboratorista**: Panel de control para llamar pacientes
- **UI moderna y responsiva**

## 🚀 Tecnologías

- **Next.js 14** - Framework React con SSR
- **TypeScript** - Tipado estático
- **Socket.IO** - Comunicación en tiempo real
- **Axios** - Cliente HTTP
- **fast-xml-parser** - Parser SOAP/XML
- **date-fns** - Manejo de fechas

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn
- Lector de códigos de barras USB (como Union UN-BR60)
- Acceso al servicio SOAP de GXSalud (opcional, usa mock en desarrollo)

## 🔧 Instalación

1. **Instalar dependencias:**

```bash
npm install
```

2. **Configurar variables de entorno:**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# URL del servicio SOAP (producción)
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01

# Usar servicio SOAP real (false = mock para desarrollo)
USE_PRODUCTION_SOAP=false

# Puerto del servidor (opcional, por defecto 3000)
PORT=3000
```

3. **Iniciar el servidor de desarrollo:**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🎯 Uso

### 1. Configuración del Lector de Códigos de Barras

El lector **Union UN-BR60** funciona como un teclado USB (HID). Simplemente:

1. Conecta el lector al puerto USB
2. No requiere drivers adicionales (funciona como teclado)
3. Al escanear, el código se escribe automáticamente y se envía con Enter

### 2. Páginas del Sistema

#### 📋 Validación (`/scan`)
- Página para escanear códigos de barras
- Auto-detecta el escaneo del lector USB
- Valida contra el servicio SOAP de GXSalud
- **Rechaza códigos duplicados**
- **Rechaza turnos vencidos** (HoraFinal pasada)
- Muestra posición en la cola del sector

**Uso:**
1. Abre la página en el dispositivo con el lector conectado
2. Simplemente escanea el código de barras del paciente
3. El sistema valida automáticamente:
   - ✅ Código no duplicado
   - ✅ Turno vigente (HoraFinal no pasó)
   - ✅ Paciente existe en el sistema
4. Agrega al paciente a la cola del sector correspondiente

#### 📺 Pantalla (`/display`)
- Vista para mostrar en sala de espera
- **Selector de sectores** (Sector A, B, C, etc.)
- Muestra paciente actual en grande
- Lista de espera del sector en tiempo real
- Reloj en vivo
- Se actualiza automáticamente vía WebSocket

**Configuración:**
1. Abre en una pantalla grande/TV
2. Selecciona el sector a mostrar
3. Modo pantalla completa (F11)
4. Se actualiza automáticamente

#### 👨‍⚕️ Laboratorista (`/lab`)
- Panel de control para el personal
- **Selector de sectores** para gestionar cada área
- Botón para llamar al siguiente paciente del sector
- Estadísticas en tiempo real:
  - Total en espera (todos los sectores)
  - Total en atención
  - Total atendidos
  - Sectores activos
- Lista completa de espera por sector
- Información detallada del paciente (CI, matrícula, etc.)

**Flujo:**
1. Selecciona el sector a atender
2. Presiona "Llamar Siguiente"
3. Se notifica al paciente
4. Actualización automática en todas las pantallas

### 3. Códigos de Prueba (Modo Mock)

Durante el desarrollo (con `USE_PRODUCTION_SOAP=false`):

- `110007938` → VESPA AMATI JUAN (Sector A)
- `110007939` → GARCÍA LÓPEZ MARÍA (Sector A)
- `110007940` → RODRÍGUEZ PÉREZ CARLOS (Sector B)
- `110007941` → MARTÍNEZ GONZÁLEZ ANA (Sector B)
- `110007942` → SÁNCHEZ FERNÁNDEZ LUIS (Sector C)

## 🔌 Integración con Servicio SOAP

### Servicio GXSalud

**Endpoint:**
```
http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
```

**Método:** `labwbs01.Execute`

**Input:**
- `Labosnro` (N10): Número del código de barras

**Output:**
- Información del paciente (Nombre, CI, Matrícula, etc.)
- Información del sector (Sector, SecDescripcion)
- Horarios (Fecha, HoraInicial, HoraFinal)
- Error (Error, Errdescripcion)

### Ejemplo Request SOAP

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gxs="GXSalud">
   <soapenv:Header/>
   <soapenv:Body>
      <gxs:labwbs01.Execute>
         <gxs:Labosnro>110007938</gxs:Labosnro>
      </gxs:labwbs01.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

### Validaciones Implementadas

1. **Código Duplicado**: Rechaza si el código ya está en la cola
2. **Turno Vencido**: Valida que `HoraFinal` no haya pasado
3. **Datos Incompletos**: Verifica que la respuesta tenga todos los campos
4. **Errores del Servicio**: Maneja `Error = S` del SOAP
5. **Timeout**: 10 segundos máximo de espera

Ver más detalles en: [SOAP_CONFIG.md](./SOAP_CONFIG.md)

## 📱 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
# Habilitar servicio SOAP real en .env.local
USE_PRODUCTION_SOAP=true

# Compilar y ejecutar
npm run build
npm start
```

### Despliegue en Vercel
```bash
vercel deploy
```

**Nota:** Configura las variables de entorno en el panel de Vercel.

## 🏗️ Arquitectura

```
┌─────────────┐     USB      ┌──────────────┐
│   Lector    │─────────────▶│  Navegador   │
│  UN-BR60    │   (Teclado)  │  /scan       │
└─────────────┘              └──────┬───────┘
                                    │
                                    │ HTTP POST
                                    ▼
                             ┌──────────────┐
                             │  Next.js API │
                             │  /api/validate│
                             └──────┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐   ┌──────────┐
              │  Queue   │   │   SOAP   │   │ Socket.IO│
              │  Store   │   │  Client  │   │  Server  │
              │(Sectores)│   │ (GXSalud)│   └─────┬────┘
              └──────────┘   └──────────┘         │
                                              WebSocket
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                                    ▼             ▼             ▼
                             ┌──────────┐  ┌──────────┐  ┌──────────┐
                             │  /scan   │  │ /display │  │   /lab   │
                             │(Validar) │  │(Pantalla)│  │(Control) │
                             └──────────┘  └──────────┘  └──────────┘
```

## 🛠️ Estructura del Proyecto

```
lab/
├── src/
│   ├── pages/
│   │   ├── api/                  # API Routes
│   │   │   ├── validate.ts       # Validación SOAP
│   │   │   ├── socket.ts         # WebSocket
│   │   │   └── queue/
│   │   │       ├── state.ts      # Estado de la cola
│   │   │       ├── next.ts       # Llamar siguiente
│   │   │       └── sectors.ts    # Listar sectores
│   │   ├── index.tsx             # Página principal
│   │   ├── scan.tsx              # Validación (lector)
│   │   ├── display.tsx           # Pantalla pública
│   │   └── lab.tsx               # Panel laboratorista
│   ├── types/                    # Definiciones TypeScript
│   │   └── index.ts              # Patient, QueueState, etc.
│   ├── lib/                      # Lógica de negocio
│   │   ├── queueStore.ts         # Gestión de cola por sectores
│   │   ├── soapClient.ts         # Cliente SOAP GXSalud
│   │   ├── externalApi.ts        # Wrapper validación
│   │   └── socketManager.ts      # WebSocket server
│   ├── hooks/                    # React hooks
│   │   ├── useSocket.ts          # Hook WebSocket
│   │   └── useBarcodeScanner.ts  # Hook lector USB
│   └── styles/                   # Estilos CSS
│       └── globals.css
├── package.json
├── tsconfig.json
└── README.md (este archivo)
```

## 📚 Documentación Adicional

| Documento | Descripción |
|-----------|-------------|
| [QUICKSTART.md](./QUICKSTART.md) | Inicio rápido en 5 minutos |
| [SOAP_CONFIG.md](./SOAP_CONFIG.md) | Configuración del servicio SOAP |
| [BARCODE_READER.md](./BARCODE_READER.md) | Guía del lector Union UN-BR60 |
| [INTEGRATION.md](./INTEGRATION.md) | Guía de integración |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitectura técnica detallada |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | Resumen ejecutivo |

## 🔍 Solución de Problemas

### El lector no escanea
1. Verifica que esté conectado por USB
2. Prueba en un editor de texto (debe escribir el código)
3. Asegúrate de que la página `/scan` esté en foco

### WebSocket no se conecta
1. Verifica que el servidor esté corriendo
2. Revisa la consola del navegador
3. Recarga la página

### Error: "Turno vencido"
- El `HoraFinal` del turno ya pasó
- El paciente debe reagendar su cita

### Error: "Servicio no disponible"
1. Verifica conectividad con el servidor SOAP
2. Verifica URL en `.env.local`
3. Usa mock para desarrollo (`USE_PRODUCTION_SOAP=false`)

### Código duplicado
- El código ya está en la cola de algún sector
- Espera a que sea atendido

## 🎯 Características por Sector

- ✅ Cada sector tiene su propia cola independiente
- ✅ Pacientes se asignan automáticamente según la respuesta SOAP
- ✅ Múltiples sectores activos simultáneamente
- ✅ Selector de sector en pantalla y panel laboratorista
- ✅ Estadísticas generales y por sector

## 📝 Notas Adicionales

- **Persistencia**: El sistema actual usa almacenamiento en memoria. Para producción con reiniciosfrecuentes, implementa una base de datos.
- **Autenticación**: Considera agregar autenticación para la página del laboratorista.
- **Auditoría**: Todos los intentos de validación se loguean en consola.
- **Escalabilidad**: Socket.IO maneja múltiples clientes simultáneos.

## 🤝 Contribuir

Mejoras sugeridas:

- [ ] Agregar base de datos (PostgreSQL/MongoDB)
- [ ] Sistema de autenticación
- [ ] Reportes y estadísticas por sector
- [ ] Múltiples ventanillas por sector
- [ ] Notificaciones SMS/Email
- [ ] Panel de administración
- [ ] Modo offline con sincronización

## 📄 Licencia

MIT

---

Desarrollado con ❤️ para laboratorios modernos

**Integración SOAP**: GXSalud  
**Lector compatible**: Union UN-BR60