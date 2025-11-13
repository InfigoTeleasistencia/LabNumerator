# Instrucciones de Testing - Sistema de Cola

## 🔧 Cambios Realizados para Solucionar el Problema

### Problema Identificado
Socket.IO no se inicializaba correctamente, por lo que las actualizaciones no se emitían a los clientes.

### Solución Implementada

1. **Mejorado el gestor de Socket.IO** (`socketManager.ts`):
   - Agregado función `setIO()` para establecer la instancia manualmente
   - Mejores logs de diagnóstico
   - Prevención de inicialización múltiple

2. **Corregido el endpoint de Socket** (`/api/socket.ts`):
   - Ahora sincroniza correctamente la instancia global
   - Asegura que la referencia esté disponible para emitir actualizaciones

3. **Mejorado el hook useSocket** (`useSocket.ts`):
   - Espera a que el servidor esté listo antes de conectar
   - Mejor manejo de errores de conexión
   - Logs detallados para debugging

4. **Estado local + WebSocket** (en `lab.tsx` y `display.tsx`):
   - Ahora las páginas cargan el estado inicial desde el API REST
   - Se actualiza en tiempo real con WebSocket
   - Si WebSocket falla, todavía se puede ver el estado

## 🧪 Pasos para Probar

### 1. Reiniciar el Servidor

**IMPORTANTE**: Debes reiniciar el servidor para aplicar los cambios.

```bash
# En la terminal donde está corriendo npm run dev:
# Presiona Ctrl+C para detener

# Luego inicia nuevamente:
npm run dev
```

### 2. Abrir las Consolas del Navegador

Abre 3 pestañas y abre la consola del navegador en cada una (F12 o Cmd+Option+I):

1. **Pestaña 1**: `http://localhost:3000/scan`
2. **Pestaña 2**: `http://localhost:3000/lab/1`
3. **Pestaña 3**: `http://localhost:3000/display`

### 3. Verificar Conexión WebSocket

En la consola de cada pestaña deberías ver:

```
🔌 Inicializando conexión WebSocket...
✅ API Socket inicializado
🔌 Conectando cliente Socket.IO...
✅ Conectado a Socket.IO, ID: xxxxx
```

### 4. Agregar un Paciente de Prueba

En la pestaña `/scan`:

1. Haz clic en el botón "🧪 Test Scan" (esquina inferior derecha)
2. Deberías ver la animación de validación
3. El paciente se agregará al Sector 151 - SECTOR A

**Logs esperados en la consola del servidor:**

```bash
✅ Paciente agregado a la cola: {
  id: 'PAT-1234567890',
  code: 'TEST1234567890',
  name: 'Juan Pérez García',
  sector: '151',
  sectorDescription: 'SECTOR A'
}
📡 Emitiendo actualización de cola, sectores: [ '151' ]
📡 Emitiendo queue:update a todos los clientes: [ { id: '151', waiting: 1, hasCurrent: false, recent: 0 } ]
```

**❌ Si ves esto, hay un problema:**

```bash
⚠️  No se puede emitir actualización: Socket.IO no inicializado
```

### 5. Verificar en Panel del Laboratorista

En la pestaña `/lab/1`:

**Logs esperados en la consola del navegador:**

```
🔄 Cargando estado inicial de la cola...
📊 Estado de cola cargado: { sectors: { '151': { waiting: [...], current: null, recent: [] } } }
🎯 Seleccionando primer sector: 151
📥 Recibida actualización de cola: [ { id: '151', waiting: 1, hasCurrent: false, recent: 0 } ]
📡 Actualizando estado desde WebSocket
🔄 Estado de cola actualizado en Lab Panel: [ { id: '151', waiting: 1, hasCurrent: false } ]
```

**Deberías ver:**
- Sector "151 - SECTOR A" seleccionado
- El paciente en la lista de "Pacientes en Espera"
- El botón "Llamar Siguiente" debe estar habilitado

### 6. Llamar al Paciente

En la pestaña `/lab/1`:

1. Haz clic en "Llamar Siguiente"
2. Deberías ver la notificación: "Llamando a: [nombre] ([código]) - Puesto 1"
3. Deberías escuchar un sonido de notificación

### 7. Verificar en Pantalla de Display

En la pestaña `/display`:

**Deberías ver PROMINENTEMENTE:**

```
┌──────────────────────────────┐
│      SECTOR A - Pase a       │
├──────────────────────────────┤
│                              │
│      TEST1234567890          │ <- Código grande, rojo, animado
│                              │
│    ┌────────────────┐        │
│    │ CI: 1234567-8  │        │ <- Fondo amarillo, tamaño grande
│    └────────────────┘        │
│                              │
│    ┌──────────────────┐      │
│    │ 📍 PUESTO 1      │      │ <- Fondo azul, muy grande
│    └──────────────────┘      │
│                              │
└──────────────────────────────┘
```

**Logs esperados:**

```
📥 Recibida actualización de cola: [ { id: '151', waiting: 0, hasCurrent: true, currentCode: 'TEST1234567890', recent: 0 } ]
📡 [Display] Actualizando estado desde WebSocket
```

### 8. Verificar Lista de Espera

En la pestaña `/display`, en el panel derecho:

- La lista de espera debe estar vacía (el paciente fue llamado)
- Si agregas más pacientes, deberían aparecer aquí mostrando:
  - Código del paciente
  - **CI: [cédula]** (NO el nombre)
  - Si fueron llamados: "Puesto X" en rojo

## 🐛 Solución de Problemas

### Problema: "⚠️ Socket.IO no inicializado"

**Solución:**

1. Detén el servidor (Ctrl+C)
2. Reinicia: `npm run dev`
3. Refresca todas las pestañas del navegador
4. Verifica que veas los logs de conexión en cada pestaña

### Problema: No veo los pacientes en el panel del laboratorista

**Verificar:**

1. ¿En la consola del navegador ves: "📊 Estado de cola cargado"?
   - Si NO: Revisa que el servidor esté corriendo
   - Si SÍ: Verifica que el objeto tenga datos

2. ¿El sector correcto está seleccionado?
   - Los pacientes de prueba van al sector "151"
   - Asegúrate que ese sector esté seleccionado

3. ¿Ves el log: "🔄 Estado de cola actualizado en Lab Panel"?
   - Si NO: El estado no se está actualizando

### Problema: WebSocket se conecta pero no recibo actualizaciones

**Verificar:**

1. En la consola del servidor, cuando agregas un paciente debes ver:
   ```
   📡 Emitiendo queue:update a todos los clientes
   ```

2. En la consola del navegador debes ver:
   ```
   📥 Recibida actualización de cola
   ```

3. Si NO ves el segundo mensaje, el problema es la conexión WebSocket

**Solución:**

- Refresca la página
- Verifica que no haya errores de CORS en la consola
- Verifica que el puerto 3000 esté libre

### Problema: La pantalla de display no muestra el puesto

**Verificar:**

1. ¿El paciente fue llamado desde `/lab/1`, `/lab/2`, etc.?
   - Solo los pacientes llamados tienen puesto asignado
   
2. En la consola del servidor al llamar debes ver:
   ```
   patient.puesto = 1
   ```

3. El puesto solo aparece si `current.puesto` tiene un valor

## 📋 Checklist Completo

- [ ] Servidor reiniciado después de los cambios
- [ ] 3 pestañas abiertas (/scan, /lab/1, /display)
- [ ] WebSocket conectado en las 3 pestañas (ver logs)
- [ ] Agregado paciente desde /scan con botón de test
- [ ] Paciente visible en /lab/1 en la lista de espera
- [ ] Llamado paciente desde /lab/1
- [ ] En /display se muestra:
  - [ ] Código del paciente (grande, rojo, animado)
  - [ ] Cédula (fondo amarillo, destacada)
  - [ ] Puesto 1 (fondo azul, grande)
- [ ] Lista de espera muestra CI en vez de nombres

## 🎯 Estado Esperado Final

**Después de agregar 3 pacientes y llamar a 1:**

| Vista | Estado Esperado |
|-------|----------------|
| `/scan` | Listo para escanear más códigos |
| `/lab/1` | - Puesto 1 en el header<br>- 2 pacientes en espera<br>- Botón "Llamar Siguiente" habilitado |
| `/display` | - Paciente actual con código, CI y "PUESTO 1"<br>- 2 pacientes en lista de espera con sus CIs<br>- El paciente llamado NO muestra puesto en la lista (solo el actual lo muestra) |

## 💡 Tips

- Usa `Cmd+K` (Mac) o `Ctrl+K` (Windows/Linux) en la consola del navegador para limpiar logs
- Los logs tienen emojis para facilitar su identificación:
  - 🔌 = Conexión/inicialización
  - ✅ = Éxito
  - ❌ = Error
  - ⚠️  = Advertencia
  - 📡 = Emisión/recepción de datos
  - 🔄 = Actualización de estado
  - 🎯 = Selección
  - 📊 = Datos cargados
  - 📥 = Datos recibidos

¡Buena suerte con las pruebas! 🚀

