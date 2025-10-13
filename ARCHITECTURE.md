# 🏗️ Arquitectura del Sistema

## Vista General

```
┌─────────────────────────────────────────────────────────────────┐
│                      SISTEMA DE ATENCIÓN                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   RECEPCIÓN  │         │ SALA ESPERA  │         │ LABORATORIO  │
│              │         │              │         │              │
│   /scan      │         │  /display    │         │    /lab      │
│              │         │              │         │              │
│ [Lector USB] │         │ [Pantalla]   │         │ [Control]    │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ HTTP POST             │ WebSocket              │ HTTP POST
       │ /api/validate         │ Actualización          │ /api/queue/next
       │                        │ en tiempo real         │
       └────────────────────────┼────────────────────────┘
                               │
                      ┌────────▼────────┐
                      │   NEXT.JS API   │
                      │                 │
                      │ • validate.ts   │
                      │ • queue/*.ts    │
                      │ • socket.ts     │
                      └────────┬────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
       │ Queue Store │  │ Socket.IO │  │ External API│
       │  (In-Mem)   │  │  Server   │  │  Validator  │
       └─────────────┘  └───────────┘  └─────────────┘
```

## Flujo de Datos

### 1. Escaneo de Código

```
Lector UN-BR60 (USB)
      │
      │ Actúa como teclado
      │ Escribe: "LAB001" + Enter
      │
      ▼
┌──────────────────┐
│  useBarcodeScanner│  ← Hook React personalizado
│                   │    • Captura keypresses
│  • Buffer chars   │    • Detecta Enter
│  • Detect Enter   │    • Timeout 100ms
└─────────┬─────────┘
          │
          │ onScan("LAB001")
          ▼
┌──────────────────┐
│  /scan Component │  ← Página React
│                   │
│  handleScan()     │    POST /api/validate
└─────────┬─────────┘
          │
          │ HTTP POST { code: "LAB001" }
          ▼
┌──────────────────┐
│ /api/validate    │  ← Next.js API Route
│                   │
│ 1. Check duplicado│
│ 2. Validar API    │
│ 3. Agregar cola   │
│ 4. Emit WebSocket │
└─────────┬─────────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│  External API    │  │   Queue Store    │
│                  │  │                  │
│  validateCode()  │  │   addPatient()   │
└──────────────────┘  └─────────┬────────┘
                                │
                                │ emitQueueUpdate()
                                ▼
                      ┌──────────────────┐
                      │   Socket.IO      │
                      │                  │
                      │ Broadcast a todos│
                      └─────────┬────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        /scan client      /display client   /lab client
      (Confirmación)      (Actualiza lista) (Actualiza contador)
```

### 2. Llamar Siguiente Paciente

```
┌──────────────────┐
│  /lab Component  │
│                  │
│  handleCallNext()│
└─────────┬────────┘
          │
          │ POST /api/queue/next
          ▼
┌──────────────────┐
│ /api/queue/next  │
│                  │
│ 1. queueStore    │
│    .callNext()   │
│ 2. Emit Socket   │
└─────────┬────────┘
          │
          │ emitQueueUpdate()
          ▼
┌──────────────────┐
│   Socket.IO      │
│                  │
│ queue:update     │
└─────────┬────────┘
          │
          ├─────────────────────┐
          │                     │
          ▼                     ▼
    /display client        /lab client
  (Muestra ACTUAL)    (Actualiza stats)
  (Actualiza ESPERA)  (Habilita botón)
```

## Componentes Principales

### Frontend (React/Next.js)

```
src/pages/
├── index.tsx           → Página principal (selector de rol)
├── scan.tsx            → Validación con lector USB
├── display.tsx         → Pantalla de sala de espera
└── lab.tsx             → Panel del laboratorista

src/hooks/
├── useBarcodeScanner   → Captura escaneos del lector
└── useSocket           → Conexión WebSocket en tiempo real

src/lib/
├── queueStore          → Gestión de cola (in-memory)
├── socketManager       → Servidor Socket.IO
└── externalApi         → Cliente API externa
```

### Backend (Next.js API Routes)

```
src/pages/api/
├── validate.ts         → Validar código y agregar a cola
├── socket.ts           → Inicializar Socket.IO
└── queue/
    ├── state.ts        → Obtener estado actual
    └── next.ts         → Llamar siguiente paciente
```

## Estados del Paciente

```
                     ┌─────────┐
                     │ WAITING │  ← Código validado
                     └────┬────┘
                          │
             Laboratorista │
           presiona "Llamar"
                          │
                          ▼
                     ┌─────────┐
                     │ CALLED  │  ← Aparece en pantalla
                     └────┬────┘
                          │
                          │ (Auto después de 
                          │  llamar siguiente)
                          ▼
                     ┌─────────┐
                     │COMPLETED│  ← Movido a "recientes"
                     └─────────┘
```

## Tecnologías por Capa

### Cliente
- **React 18**: UI Components
- **TypeScript**: Tipado estático
- **Socket.IO Client**: Conexión en tiempo real
- **Axios**: HTTP requests

### Servidor
- **Next.js 14**: Framework full-stack
- **Socket.IO**: WebSocket server
- **Node.js**: Runtime

### Integración
- **USB HID**: Lector de códigos (Union UN-BR60)
- **REST API**: Comunicación HTTP
- **WebSocket**: Actualizaciones push

## Flujo de Comunicación

### HTTP REST (Request/Response)

```
Cliente                    Servidor
  │                          │
  ├──POST /api/validate────→│
  │  { code: "LAB001" }      │
  │                          │
  │←───── 200 OK ───────────┤
     { success: true,
       patient: {...} }
```

### WebSocket (Bidireccional)

```
Cliente                    Socket.IO Server
  │                          │
  ├──connect()─────────────→│
  │                          │
  │←──── connected ─────────┤
  │                          │
  │                          │ (Evento ocurre)
  │                          │
  │←─ queue:update ─────────┤
     { waiting: [...],
       current: {...},
       recent: [...] }
```

## Persistencia de Datos

### Actual (In-Memory)

```typescript
class QueueStore {
  private patients: Map<string, Patient>
  private waitingQueue: string[]
  private currentPatientId: string | null
  private recentPatients: string[]
}
```

**Ventajas:**
- ⚡ Rápido
- 🎯 Simple
- ✅ Ideal para desarrollo

**Desventajas:**
- ❌ Se pierde al reiniciar
- ❌ No escalable

### Para Producción

Reemplazar por:
- **PostgreSQL**: Base de datos relacional
- **MongoDB**: Base de datos NoSQL
- **Redis**: Cache + Queue

## Escalabilidad

### Capacidad Actual
- Clientes simultáneos: ~100
- Pacientes en cola: Ilimitado
- Actualizaciones/seg: ~50

### Para Escalar
1. Base de datos persistente
2. Redis para queue y cache
3. Load balancer para múltiples instancias
4. CDN para assets estáticos

## Seguridad

### Implementado
- ✅ Validación de entrada
- ✅ CORS configurado
- ✅ Rate limiting básico
- ✅ No expone API keys en frontend

### Por Implementar
- 🔲 Autenticación de usuarios
- 🔲 JWT tokens
- 🔲 HTTPS obligatorio
- 🔲 Logs de auditoría
- 🔲 Encriptación de datos sensibles

## Performance

### Optimizaciones Actuales
- ✅ React hooks optimizados
- ✅ WebSocket para actualizaciones (no polling)
- ✅ Minimiza re-renders con useEffect
- ✅ CSS inline para critical rendering

### Métricas Esperadas
- **FCP**: < 1s (First Contentful Paint)
- **TTI**: < 2s (Time to Interactive)
- **Latencia WebSocket**: < 50ms
- **Validación API**: < 1s

## Monitoreo

### Logs Actuales
```typescript
console.log('Cliente conectado:', socket.id)
console.log('Código escaneado:', code)
console.error('Error validating code:', error)
```

### Para Producción
- Winston/Pino para logs estructurados
- Sentry para error tracking
- New Relic/DataDog para APM
- Prometheus + Grafana para métricas

---

Esta arquitectura está diseñada para ser:
- 🎯 **Simple**: Fácil de entender y mantener
- ⚡ **Rápida**: Respuesta en tiempo real
- 📈 **Escalable**: Fácil de migrar a producción
- 🔧 **Mantenible**: Código limpio y tipado


