# Sistema de Ordenamiento por Turnos

## 🎯 Objetivo

Asegurar que los pacientes sean atendidos en el orden correcto según su **horario de turno asignado**, no simplemente por orden de llegada al sistema.

## 📋 Problema Resuelto

### Escenario Anterior (Sin ordenamiento por turno):

```
Paciente A llega al sistema a las 13:45
  - Turno: 14:00 - 16:00
  - Posición: #1 ❌ (incorrecto)

Paciente B llega al sistema a las 13:50
  - Turno: 08:00 - 10:00
  - Posición: #2 ❌ (incorrecto)

Paciente C llega al sistema a las 13:55
  - Turno: 10:00 - 12:00
  - Posición: #3 ❌ (incorrecto)
```

**Problema**: El paciente A sería llamado primero, aunque su turno es el más tardío.

### Escenario Actual (Con ordenamiento por turno):

```
Paciente A llega al sistema a las 13:45
  - Turno: 14:00 - 16:00
  - Posición: #3 ✅ (correcto)

Paciente B llega al sistema a las 13:50
  - Turno: 08:00 - 10:00
  - Posición: #1 ✅ (correcto)

Paciente C llega al sistema a las 13:55
  - Turno: 10:00 - 12:00
  - Posición: #2 ✅ (correcto)
```

**Solución**: Los pacientes se ordenan automáticamente por su horaInicial, independientemente de cuándo llegaron.

## 🔧 Implementación Técnica

### 1. Conversión de Horarios

```typescript
private timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
```

**Ejemplo:**
- `"08:00"` → `480` minutos
- `"10:00"` → `600` minutos
- `"14:00"` → `840` minutos

**Beneficio**: Facilita la comparación numérica de horarios.

### 2. Comparación de Pacientes

```typescript
private comparePatientsByTurn(p1: Patient, p2: Patient): number {
  const time1 = this.timeToMinutes(p1.horaInicial);
  const time2 = this.timeToMinutes(p2.horaInicial);
  
  if (time1 < time2) return -1;  // p1 va antes
  if (time1 > time2) return 1;   // p2 va antes
  
  // Si tienen la misma horaInicial, ordenar por timestamp
  return p1.timestamp - p2.timestamp;
}
```

**Criterios de ordenamiento (en orden de prioridad):**
1. **horaInicial** - Hora de inicio del turno
2. **timestamp** - Momento en que se registró en el sistema (desempate)

### 3. Ordenamiento de la Cola

```typescript
private sortQueue(sectorId: string) {
  const sector = this.sectors.get(sectorId);
  if (!sector) return;

  sector.waitingQueue.sort((idA, idB) => {
    const patientA = this.patients.get(idA);
    const patientB = this.patients.get(idB);
    
    if (!patientA || !patientB) return 0;
    
    return this.comparePatientsByTurn(patientA, patientB);
  });
}
```

**Cuándo se ejecuta:**
- ✅ Al agregar un nuevo paciente (`addPatient`)
- ✅ Al obtener el estado de la cola (`getState`)

## 📊 Flujo Completo

### Cuando un Paciente se Registra

```
1. Paciente escanea su código
   ↓
2. Sistema valida con SOAP
   ↓
3. SOAP retorna:
   - horaInicial: "10:00"
   - horaFinal: "12:00"
   ↓
4. queueStore.addPatient(patient)
   ↓
5. Paciente se agrega a la cola
   ↓
6. sortQueue() se ejecuta automáticamente
   ↓
7. Cola se reorganiza por horaInicial
   ↓
8. WebSocket emite actualización
   ↓
9. Pantallas se actualizan con orden correcto
```

## 🎨 Visualización en Panel del Laboratorista

### Display de Cada Paciente:

```
┌────────────────────────────────────┐
│ TEST1234567890              #1     │
│ 🕐 Turno: 08:00 - 10:00           │ ← NUEVO: Muestra el turno
├────────────────────────────────────┤
│ Juan Pérez García                  │
│ CI: 1234567-8                      │
│ Registro: 13:45:23                 │
└────────────────────────────────────┘
```

**Beneficios:**
- El laboratorista puede ver claramente el horario del turno
- Puede identificar si hay pacientes fuera de su horario
- Mejor gestión del flujo de atención

## 🧪 Casos de Prueba

### Caso 1: Orden Normal

**Entrada (orden de llegada):**
1. Paciente A - Turno: 08:00-10:00 (llega 07:50)
2. Paciente B - Turno: 10:00-12:00 (llega 07:55)
3. Paciente C - Turno: 14:00-16:00 (llega 08:00)

**Salida (orden en cola):**
1. Paciente A - Turno: 08:00-10:00 ✅
2. Paciente B - Turno: 10:00-12:00 ✅
3. Paciente C - Turno: 14:00-16:00 ✅

**Resultado**: Orden correcto mantenido

### Caso 2: Llegada Desordenada

**Entrada (orden de llegada):**
1. Paciente C - Turno: 14:00-16:00 (llega 07:50)
2. Paciente A - Turno: 08:00-10:00 (llega 07:55)
3. Paciente B - Turno: 10:00-12:00 (llega 08:00)

**Salida (orden en cola):**
1. Paciente A - Turno: 08:00-10:00 ✅
2. Paciente B - Turno: 10:00-12:00 ✅
3. Paciente C - Turno: 14:00-16:00 ✅

**Resultado**: Automáticamente reordenado

### Caso 3: Mismo Turno

**Entrada:**
1. Paciente A - Turno: 10:00-12:00 (llega 09:50, timestamp: 1000)
2. Paciente B - Turno: 10:00-12:00 (llega 09:55, timestamp: 1100)
3. Paciente C - Turno: 10:00-12:00 (llega 10:00, timestamp: 1200)

**Salida (orden en cola):**
1. Paciente A - Turno: 10:00-12:00 ✅ (timestamp menor)
2. Paciente B - Turno: 10:00-12:00 ✅
3. Paciente C - Turno: 10:00-12:00 ✅

**Resultado**: Desempate por orden de llegada

### Caso 4: Paciente Tarde

**Entrada:**
1. Paciente A - Turno: 08:00-10:00 (llega 13:00) ⚠️ Fuera de horario
2. Paciente B - Turno: 14:00-16:00 (llega 13:05)
3. Paciente C - Turno: 16:00-18:00 (llega 13:10)

**Salida (orden en cola):**
1. Paciente A - Turno: 08:00-10:00 ✅ (su turno es más temprano)
2. Paciente B - Turno: 14:00-16:00 ✅
3. Paciente C - Turno: 16:00-18:00 ✅

**Resultado**: Se respeta el orden del turno asignado, aunque esté fuera de horario

## 📈 Logs de Diagnóstico

### Al Agregar Paciente

```bash
✅ Paciente agregado a la cola: {
  id: 'PAT-1234567890',
  code: 'TEST1234567890',
  name: 'Juan Pérez',
  sector: '151',
  sectorDescription: 'SECTOR A'
}
📅 Paciente agregado y cola ordenada por turno. Turno del paciente: 08:00-10:00
📡 Emitiendo actualización de cola, sectores: [ '151' ]
```

### Verificación en Consola

Para verificar que el ordenamiento funciona correctamente, puedes:

```javascript
// En la consola del navegador (panel del laboratorista)
console.table(
  waiting.map(p => ({
    position: p.position,
    turno: `${p.horaInicial}-${p.horaFinal}`,
    nombre: p.name,
    codigo: p.code
  }))
);
```

**Output esperado:**
```
┌─────────┬──────────┬───────────────┬──────────────┬──────────────┐
│ (index) │ position │ turno         │ nombre       │ codigo       │
├─────────┼──────────┼───────────────┼──────────────┼──────────────┤
│ 0       │ 1        │ '08:00-10:00' │ 'Juan...'    │ 'TEST123'    │
│ 1       │ 2        │ '10:00-12:00' │ 'María...'   │ 'TEST456'    │
│ 2       │ 3        │ '14:00-16:00' │ 'Carlos...'  │ 'TEST789'    │
└─────────┴──────────┴───────────────┴──────────────┴──────────────┘
```

## ⚙️ Configuración del Generador de Pruebas

El botón de test en `/scan` ahora genera horarios aleatorios. Para probar el ordenamiento:

```typescript
// En src/pages/scan.tsx - generateRandomTestData()

// Genera horarios aleatorios entre 08:00 y 16:00
const horaInicial = `${String(Math.floor(8 + Math.random() * 4)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
const horaFinal = `${String(Math.floor(12 + Math.random() * 4)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
```

**Para probar ordenamiento:**
1. Haz clic en "Test Scan" varias veces
2. Los pacientes tendrán turnos aleatorios
3. Observa en el panel que se ordenan automáticamente por turno
4. Los primeros turnos aparecen primero en la cola

## 🔄 Mantenimiento y Actualizaciones

### Si el formato de hora cambia

Si el servicio SOAP cambia el formato de hora (ej: de "HH:MM" a otro formato):

1. Actualizar `timeToMinutes()` para parsear el nuevo formato
2. Actualizar la visualización en `lab.tsx`
3. Probar con datos de prueba

### Si se necesita ordenar por fecha también

Actualmente ordena solo por hora. Si necesitas ordenar también por fecha:

```typescript
private comparePatientsByTurn(p1: Patient, p2: Patient): number {
  // Comparar fecha primero
  const date1 = new Date(p1.fecha);
  const date2 = new Date(p2.fecha);
  
  if (date1.getTime() !== date2.getTime()) {
    return date1.getTime() - date2.getTime();
  }
  
  // Luego comparar hora
  const time1 = this.timeToMinutes(p1.horaInicial);
  const time2 = this.timeToMinutes(p2.horaInicial);
  
  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  
  return p1.timestamp - p2.timestamp;
}
```

## ✅ Resumen

**Antes:**
- ❌ Orden por llegada (FIFO simple)
- ❌ Pacientes con turnos tardíos atendidos primero
- ❌ Desorganización en la atención

**Ahora:**
- ✅ Orden por turno asignado (horaInicial)
- ✅ Respeto de horarios de atención
- ✅ Organización automática
- ✅ Visualización clara del turno en el panel
- ✅ Logs para debugging

**Archivos modificados:**
- `src/lib/queueStore.ts` - Lógica de ordenamiento
- `src/pages/lab.tsx` - Visualización del turno

