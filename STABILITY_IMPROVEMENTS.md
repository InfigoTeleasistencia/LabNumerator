# Mejoras de Estabilidad del Sistema de Colas

## Problemas Identificados

El usuario reportó dos problemas críticos:

1. **La cola se pierde en algún momento** - No hay persistencia de datos
2. **Las pantallas necesitan refresco manual** - Problemas con WebSocket que requieren F5
3. **Comportamiento inestable** - Datos inconsistentes entre pantallas

## Soluciones Implementadas

### 1. Persistencia de la Cola en Disco

**Problema:** La cola vivía solo en memoria (Map). Al reiniciar el servidor, se perdía todo.

**Solución:** Implementar persistencia automática en archivo JSON.

#### Cambios en `src/lib/queueStore.ts`:

##### a) Constructor con Carga Automática
```typescript
private persistencePath: string;
private saveTimeout: NodeJS.Timeout | null = null;

constructor() {
  this.persistencePath = path.join(process.cwd(), 'data', 'queue-state.json');
  this.loadFromDisk(); // Carga automática al iniciar
}
```

##### b) Auto-guardado con Debounce
```typescript
private scheduleSave() {
  if (this.saveTimeout) {
    clearTimeout(this.saveTimeout);
  }
  this.saveTimeout = setTimeout(() => {
    this.saveToDisk();
  }, 1000); // Guardar 1 segundo después del último cambio
}
```

**Ventajas:**
- ✅ Guarda automáticamente cada cambio (con 1 segundo de debounce)
- ✅ Carga automáticamente al iniciar el servidor
- ✅ No requiere intervención manual
- ✅ Resiste reinicios del servidor
- ✅ Usa archivo JSON legible (`data/queue-state.json`)

**Dónde se guarda:**
- Ruta: `LabNumerator/data/queue-state.json`
- Se crea automáticamente el directorio si no existe
- Agregado a `.gitignore` para no versionar datos temporales

**Llamadas a `scheduleSave()`:**
- En `addPatient()` - cuando se agrega un paciente
- En `callNext()` - cuando se llama al siguiente
- En `reset()` y `resetSector()` - cuando se limpia la cola

---

### 2. Arreglo del Hook useSocket

**Problema:** 
- Closure stale en el cleanup function
- No reconexión automática configurada
- Referencias perdidas al socket

**Solución:** Refactorizar completamente `src/hooks/useSocket.ts`

#### Mejoras Implementadas:

##### a) Uso de useRef para evitar closure stale
```typescript
const socketRef = useRef<Socket | null>(null);

// En cleanup
return () => {
  if (socketRef.current) {
    socketRef.current.disconnect();
  }
};
```

##### b) Flag mounted para evitar memory leaks
```typescript
let mounted = true;

// Antes de cada operación async
if (!mounted) return;

// En cleanup
mounted = false;
```

##### c) Reconexión Automática Configurada
```typescript
const socketInstance = io({
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity, // Intentar siempre
});
```

##### d) Handlers de Reconexión
```typescript
socketInstance.on('reconnect', (attemptNumber) => {
  console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
  setIsConnected(true);
});

socketInstance.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    socketInstance.connect(); // Reconectar si el servidor desconectó
  }
});
```

**Ventajas:**
- ✅ No más referencias perdidas
- ✅ Reconexión automática infinita
- ✅ Backoff exponencial (1s → 5s)
- ✅ Sin memory leaks
- ✅ Logs detallados de conexión

---

### 3. Polling de Respaldo

**Problema:** Si WebSocket falla, las pantallas nunca se actualizan sin F5.

**Solución:** Implementar polling inteligente que se activa solo cuando WebSocket está inactivo.

#### Implementado en `src/pages/lab.tsx` y `src/pages/display.tsx`:

```typescript
const [lastUpdate, setLastUpdate] = useState(Date.now());

// Actualizar timestamp en cada actualización (WebSocket o REST)
useEffect(() => {
  if (Object.keys(queueState.sectors).length > 0) {
    setLocalQueueState(queueState);
    setLastUpdate(Date.now()); // ← Marca de tiempo
  }
}, [queueState]);

// Polling de respaldo
useEffect(() => {
  const pollingInterval = setInterval(() => {
    const timeSinceLastUpdate = Date.now() - lastUpdate;
    
    // Si han pasado más de 10 segundos sin actualización
    if (timeSinceLastUpdate > 10000) {
      console.log('⚠️  Usando polling de respaldo');
      axios.get('/api/queue/state')
        .then(response => {
          setLocalQueueState(response.data);
          setLastUpdate(Date.now());
        });
    }
  }, 5000); // Revisar cada 5 segundos

  return () => clearInterval(pollingInterval);
}, [lastUpdate]);
```

**Cómo Funciona:**

1. **WebSocket funcionando:** 
   - Cada actualización resetea `lastUpdate`
   - Polling NO se ejecuta (timeSinceLastUpdate < 10s)
   
2. **WebSocket caído:**
   - `lastUpdate` no se actualiza
   - Después de 10s, polling detecta inactividad
   - Activa polling cada 5s para mantener datos actualizados

**Ventajas:**
- ✅ NO hace polling innecesario cuando WebSocket funciona
- ✅ Detecta automáticamente fallas de WebSocket
- ✅ Mantiene las pantallas actualizadas siempre
- ✅ Sin intervención manual (no más F5)
- ✅ Eficiente: solo consume recursos cuando es necesario

---

## Flujo Completo del Sistema Mejorado

### Escenario 1: Inicio del Servidor

```
1. Constructor de queueStore ejecuta loadFromDisk()
   └─→ Carga cola desde data/queue-state.json (si existe)
   └─→ Logs: pacientes, sectores, antigüedad de datos

2. Cliente conecta
   └─→ useSocket inicia reconexión infinita
   └─→ Carga inicial desde GET /api/queue/state
   └─→ Inicia polling de respaldo (dormido)
```

### Escenario 2: Validación de Paciente

```
1. POST /api/validate
   └─→ queueStore.addPatient()
   └─→ scheduleSave() programado (1s)

2. Después de 1s:
   └─→ saveToDisk() ejecuta
   └─→ Escribe data/queue-state.json
   └─→ Log: "💾 Cola guardada en disco"

3. WebSocket emite actualización
   └─→ Todos los clientes reciben queue:update
   └─→ setLastUpdate(Date.now()) resetea polling
```

### Escenario 3: WebSocket Falla

```
1. WebSocket se desconecta
   └─→ Evento 'disconnect' detectado
   └─→ Intento automático de reconexión

2. Si reconexión falla por >10s:
   └─→ Polling detecta inactividad
   └─→ GET /api/queue/state cada 5s
   └─→ Log: "⚠️ Usando polling de respaldo"

3. Cuando WebSocket reconecta:
   └─→ Log: "🔄 Reconectado después de N intentos"
   └─→ Polling vuelve a modo dormido
```

### Escenario 4: Reinicio del Servidor

```
1. Servidor reinicia
   └─→ Constructor carga data/queue-state.json
   └─→ Cola restaurada completamente

2. Clientes detectan desconexión
   └─→ Reconexión automática se activa
   └─→ Mientras tanto, polling mantiene datos

3. Reconexión exitosa
   └─→ Sincronización completa
   └─→ Sistema funciona sin pérdida de datos
```

---

## Logs de Diagnóstico

### En queueStore:
```
💾 Cola guardada en disco: /path/to/data/queue-state.json
📂 Cola cargada desde disco: { patients: 5, sectors: 1, ageMinutes: 3 }
ℹ️  No se encontró archivo de persistencia, iniciando cola vacía
✅ Paciente {code} completado en Puesto {puesto}
📢 Paciente {code} llamado a Puesto {puesto}
```

### En useSocket:
```
🔌 Inicializando conexión WebSocket...
✅ Conectado a Socket.IO, ID: abc123
⚠️  Desconectado de Socket.IO. Razón: transport close
🔄 Intento de reconexión # 3
🔄 Reconectado después de 3 intentos
📥 Recibida actualización de cola: [...]
```

### En lab.tsx y display.tsx:
```
🔄 Cargando estado inicial de la cola...
📊 Estado de cola cargado: { sectors: {...} }
📡 Actualizando estado desde WebSocket
⚠️  Usando polling de respaldo (WebSocket inactivo)
```

---

## Estructura de Archivos

### Nueva estructura:
```
LabNumerator/
├── data/                          ← NUEVO: Persistencia
│   └── queue-state.json          ← Cola guardada automáticamente
├── src/
│   ├── hooks/
│   │   └── useSocket.ts          ← Mejorado: reconexión + refs
│   ├── lib/
│   │   └── queueStore.ts         ← Mejorado: persistencia
│   └── pages/
│       ├── lab.tsx               ← Mejorado: polling respaldo
│       └── display.tsx           ← Mejorado: polling respaldo
└── .gitignore                    ← Actualizado: ignorar data/
```

### Contenido de queue-state.json:
```json
{
  "patients": [
    ["patient-id-1", { "id": "...", "code": "...", ... }],
    ["patient-id-2", { ... }]
  ],
  "sectors": [
    ["151", {
      "waitingQueue": ["patient-id-1"],
      "currentPatientId": null,
      "recentPatients": []
    }]
  ],
  "timestamp": 1699900000000
}
```

---

## Testing

### Pruebas Recomendadas:

#### Test 1: Persistencia
1. Validar 3 pacientes
2. Reiniciar el servidor (`Ctrl+C` → `npm run dev`)
3. Abrir `/lab/1`
4. ✅ Verificar que los 3 pacientes siguen en cola

#### Test 2: WebSocket + Reconexión
1. Abrir `/lab/1` y `/display`
2. Validar un paciente
3. ✅ Ambas pantallas se actualizan inmediatamente
4. Reiniciar servidor
5. ✅ Clientes reconectan automáticamente
6. ✅ Datos siguen consistentes

#### Test 3: Polling de Respaldo
1. Abrir `/lab/1`
2. Detener completamente el servidor
3. Esperar 15 segundos
4. Iniciar servidor
5. ✅ Después de ~10s, polling activa
6. ✅ Pantalla se actualiza sin F5

#### Test 4: Multi-estación
1. Abrir `/lab/1`, `/lab/2`, `/display`
2. Validar 5 pacientes
3. Desde Puesto 1, llamar 2 pacientes
4. Desde Puesto 2, llamar 1 paciente
5. ✅ Display muestra los 3 pacientes
6. ✅ Cada laboratorista ve solo SU paciente
7. ✅ Refrescar cualquier pantalla: datos persisten

---

## Ventajas del Sistema Mejorado

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Persistencia** | ❌ En memoria, se pierde con reinicio | ✅ Archivo JSON, auto-guardado |
| **WebSocket** | ⚠️ Fallas requieren F5 | ✅ Reconexión automática infinita |
| **Actualizaciones** | ⚠️ Solo WebSocket | ✅ WebSocket + Polling respaldo |
| **Logs** | ⚠️ Básicos | ✅ Detallados para diagnóstico |
| **Estabilidad** | ⚠️ Inestable | ✅ Robusto y confiable |
| **Experiencia** | ❌ Frustrante | ✅ Sin intervención manual |

---

## Archivos Modificados

1. **`src/lib/queueStore.ts`**
   - Constructor con loadFromDisk()
   - scheduleSave() con debounce
   - saveToDisk() / loadFromDisk()
   - exportState() / importState()

2. **`src/hooks/useSocket.ts`**
   - useRef para socket
   - Flag mounted
   - Reconexión automática infinita
   - Handlers de reconnect

3. **`src/pages/lab.tsx`**
   - Estado lastUpdate
   - Polling de respaldo
   - Logs mejorados

4. **`src/pages/display.tsx`**
   - Estado lastUpdate
   - Polling de respaldo
   - Logs mejorados

5. **`.gitignore`**
   - Ignorar carpeta `data/`

---

## Comandos Útiles

### Ver el estado guardado:
```bash
cat data/queue-state.json | jq
```

### Backup manual:
```bash
cp data/queue-state.json data/queue-state.backup.json
```

### Limpiar cola (reiniciar):
```bash
rm data/queue-state.json
```

### Monitorear logs en tiempo real:
```bash
npm run dev | grep -E "(💾|📂|🔌|📡|⚠️)"
```

---

## Fecha

Noviembre 13, 2025

## Resumen Ejecutivo

✅ **La cola ahora persiste** en archivo JSON con auto-guardado
✅ **Las pantallas se actualizan automáticamente** sin necesidad de F5
✅ **Reconexión automática infinita** de WebSocket
✅ **Polling de respaldo inteligente** cuando WebSocket falla
✅ **Sistema robusto y estable** frente a reinicios y fallos de red

