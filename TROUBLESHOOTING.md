# Troubleshooting - Sistema de Cola para Laboratorio

## Problema: Los pacientes no aparecen en el panel del laboratorista

### Diagnóstico

Sigue estos pasos para diagnosticar el problema:

#### 1. Verificar que el WebSocket esté inicializado

Abre la consola del navegador en cualquier página y verifica que veas:
```
Inicializando Socket.IO...
Conectado a Socket.IO
```

Si no ves estos mensajes, el WebSocket no se está inicializando correctamente.

#### 2. Verificar que se agreguen pacientes correctamente

Cuando escaneas un código o usas el botón de test, deberías ver en la consola del servidor:
```
✅ Paciente agregado a la cola: { id, code, name, sector, sectorDescription }
📡 Emitiendo actualización de cola, sectores: ['151']
📡 Emitiendo queue:update a todos los clientes: [{ id: '151', waiting: 1, hasCurrent: false, recent: 0 }]
```

#### 3. Verificar que el cliente reciba las actualizaciones

En la consola del navegador del panel del laboratorista (`/lab`), deberías ver:
```
📥 Recibida actualización de cola: [{ id: '151', waiting: 1, hasCurrent: false, recent: 0 }]
🔄 Estado de cola actualizado en Lab Panel: [{ id: '151', waiting: 1, hasCurrent: false }]
```

### Soluciones

#### Problema: WebSocket no se inicializa

1. Asegúrate de que el servidor esté corriendo con `npm run dev`
2. Verifica que no haya errores en la consola del servidor
3. Intenta refrescar la página

#### Problema: Los pacientes se agregan pero no se ven en el panel

1. Verifica que estés mirando el sector correcto
2. El panel del laboratorista muestra solo el sector seleccionado
3. Los pacientes de prueba se agregan al sector "151"
4. Verifica que el sector "151" esté seleccionado en el panel

#### Problema: El WebSocket se desconecta frecuentemente

1. Verifica tu conexión a internet
2. Revisa si hay algún firewall o proxy bloqueando WebSocket
3. Intenta en modo incógnito para descartar problemas de extensiones

## Flujo Completo del Sistema

### 1. Validación de Paciente

```
Usuario escanea código en /scan
  ↓
POST /api/validate { code, testMode?, testData? }
  ↓
Si testMode: usa testData
Si no: llama al servicio SOAP
  ↓
queueStore.addPatient(patient)
  ↓
emitQueueUpdate(state) → Emite por WebSocket
  ↓
Todos los clientes conectados reciben 'queue:update'
```

### 2. Panel del Laboratorista

```
Usuario abre /lab/1 (Puesto 1)
  ↓
useSocket() se conecta al WebSocket
  ↓
Recibe actualizaciones en tiempo real
  ↓
Muestra pacientes en espera del sector seleccionado
```

### 3. Llamar Siguiente Paciente

```
Laboratorista hace clic en "Llamar Siguiente"
  ↓
POST /api/queue/next { sectorId, puesto: 1 }
  ↓
queueStore.callNext(sectorId, puesto)
  ↓
Paciente.puesto = 1
Paciente.status = 'called'
Paciente.calledAt = timestamp
  ↓
emitQueueUpdate(state)
  ↓
Pantalla de display (/display) muestra:
  - Código del paciente (grande, animado)
  - CI del paciente (prominente)
  - "PUESTO 1" (grande, destacado)
```

## Verificación Manual

### Test Completo

1. **Abrir pestañas:**
   - Pestaña 1: `/scan` (Validación)
   - Pestaña 2: `/lab/1` (Laboratorista Puesto 1)
   - Pestaña 3: `/display` (Pantalla de espera)

2. **Agregar paciente de prueba:**
   - En `/scan`, hacer clic en "🧪 Test Scan"
   - Deberías ver el paciente validado exitosamente
   - Sector asignado: "SECTOR A"

3. **Verificar en panel del laboratorista:**
   - En `/lab/1`, deberías ver el paciente en la lista de espera
   - Sector "151 - SECTOR A" debe estar seleccionado
   - El botón "Llamar Siguiente" debe estar habilitado

4. **Llamar al paciente:**
   - Hacer clic en "Llamar Siguiente"
   - Debería aparecer notificación: "Llamando a: [nombre] ([código]) - Puesto 1"

5. **Verificar en pantalla de display:**
   - En `/display`, deberías ver:
     - Código del paciente (animado, rojo)
     - CI del paciente (fondo amarillo)
     - "📍 PUESTO 1" (fondo azul, grande)

## Logs de Consola

### Servidor (Terminal)

```bash
# Al agregar paciente
✅ Paciente agregado a la cola: { id: 'PAT-1234567890', code: 'TEST1234567890', ... }
📡 Emitiendo actualización de cola, sectores: [ '151' ]
📡 Emitiendo queue:update a todos los clientes: [ { id: '151', waiting: 1, ... } ]

# Al llamar siguiente
```

### Cliente (Consola del navegador)

```javascript
// En cualquier página con WebSocket
Inicializando Socket.IO...
Conectado a Socket.IO

// Al recibir actualizaciones
📥 Recibida actualización de cola: [ { id: '151', waiting: 1, hasCurrent: false, ... } ]

// En /lab específicamente
🔄 Estado de cola actualizado en Lab Panel: [ { id: '151', waiting: 1, hasCurrent: false } ]
```

## Comandos Útiles

```bash
# Limpiar caché y reinstalar dependencias
rm -rf node_modules .next
npm install
npm run dev

# Ver logs en tiempo real
npm run dev | grep "📡\|✅\|📥"

# Verificar TypeScript
npx tsc --noEmit
```

## Preguntas Frecuentes

### ¿Por qué los pacientes de prueba siempre van al sector 151?

Los pacientes de prueba están hardcodeados para ir al sector 151 - SECTOR A para facilitar las pruebas. Puedes modificar esto en `src/pages/scan.tsx` en la función `generateRandomTestData()`.

### ¿Cómo cambio el número de puesto?

Accede a `/lab/1` para puesto 1, `/lab/2` para puesto 2, etc. También puedes usar `/lab?puesto=N`.

### ¿Por qué no veo el nombre en la pantalla de espera?

Por privacidad, la lista de espera muestra solo el código y la cédula. El nombre solo se muestra cuando el paciente es llamado (current patient).

### ¿Cómo reseteo la cola?

Actualmente no hay una función de reset en la UI. Reinicia el servidor para limpiar la cola:
```bash
# Ctrl+C para detener
npm run dev
```

