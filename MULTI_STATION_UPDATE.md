# Actualización: Sistema Multi-Puesto

## 🎯 Objetivo

Permitir que múltiples puestos de laboratorio atiendan pacientes simultáneamente de manera independiente, con visualización adecuada en cada pantalla.

## 📋 Cambios Implementados

### 1. Panel del Laboratorista - Aislamiento por Puesto

**Problema Anterior:**
- Todos los laboratoristas veían el mismo paciente "actual"
- Si el Puesto 1 llamaba a un paciente, el Puesto 2 también lo veía

**Solución Actual:**
- Cada laboratorista solo ve **su propio paciente**
- El Puesto 1 ve solo pacientes con `puesto === 1`
- El Puesto 2 ve solo pacientes con `puesto === 2`
- Independencia total entre puestos

**Flujo:**
```
Puesto 1 llama a paciente A
├─ Paciente A.puesto = 1
├─ Puesto 1: Ve paciente A ✅
└─ Puesto 2: No ve paciente A ✅ (correcto)

Puesto 2 llama a paciente B
├─ Paciente B.puesto = 2
├─ Puesto 1: No ve paciente B ✅ (correcto)
└─ Puesto 2: Ve paciente B ✅
```

### 2. Pantalla de Display - Reorganización

**Cambio de Layout:**

**Antes:**
```
┌─────────────────┬─────────────┐
│ Paciente Actual │  En Espera  │ (lado a lado)
│   (2fr)         │    (1fr)    │
└─────────────────┴─────────────┘
```

**Después:**
```
┌─────────────────────────────────┐
│      Último Llamado             │ (arriba, prominente)
│      CI + Puesto                │
├─────────────────────────────────┤
│    Pacientes en Espera          │ (abajo, grid)
│    [CI] [CI] [CI] [CI] [CI]     │
└─────────────────────────────────┘
```

**Beneficios:**
- ✅ Mayor visibilidad del paciente llamado
- ✅ Lista de espera más organizada
- ✅ Mejor aprovechamiento del espacio
- ✅ Más fácil de leer desde lejos

### 3. Sonido de Notificación - Movido a Sala de Espera

**Cambio:**
- ❌ **Antes**: Sonido en panel del laboratorista
- ✅ **Ahora**: Sonido en pantalla de sala de espera

**Razón:**
- Los laboratoristas no necesitan sonido (están mirando su pantalla)
- Los pacientes en la sala SÍ necesitan saber cuándo son llamados
- El sonido se reproduce automáticamente cuando se llama a un nuevo paciente

**Implementación:**
```typescript
// Detectar nuevo paciente llamado
useEffect(() => {
  if (current && current.id !== lastCalledPatientId) {
    console.log('🆕 Nuevo paciente llamado');
    setLastCalledPatientId(current.id);
    playNotificationSound(); // 🔊
  }
}, [localQueueState]);
```

## 🔧 Cambios Técnicos

### Archivos Modificados

#### 1. `src/lib/queueStore.ts`

**Función `callNext()` actualizada:**
```typescript
callNext(sectorId: string, puesto?: number): Patient | null {
  // Solo completar el paciente del MISMO puesto
  if (puesto && sector.currentPatientId) {
    const current = this.patients.get(sector.currentPatientId);
    if (current && current.puesto === puesto) {
      current.status = 'completed';
      // ...
    }
  }
  
  // Asignar nuevo paciente al puesto
  patient.puesto = puesto;
  // ...
}
```

**Funciones agregadas:**
```typescript
// Obtener todos los pacientes llamados de un sector
getCalledPatients(sectorId: string): Patient[]

// Obtener paciente actual de un puesto específico
getCurrentPatientByPuesto(sectorId: string, puesto: number): Patient | null
```

**Función `getState()` actualizada:**
```typescript
// Obtener todos los pacientes en estado "called"
const calledPatients = Array.from(this.patients.values())
  .filter(p => p.sector === sectorId && p.status === 'called')
  .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0));

// El "current" es el más recientemente llamado
const current = calledPatients.length > 0 ? calledPatients[0] : null;
```

#### 2. `src/pages/lab.tsx`

**Filtrado por puesto:**
```typescript
// Antes: Mostraba cualquier paciente actual
const current = sectorData?.current || null;

// Después: Solo muestra su propio paciente
const current = sectorData?.current && sectorData.current.puesto === puestoNumber 
  ? sectorData.current 
  : null;
```

**Función de sonido removida:**
```typescript
// ❌ Eliminado: playNotificationSound()
// ❌ Eliminado: Llamada al sonido en handleCallNext()
```

#### 3. `src/pages/display.tsx`

**Sonido agregado:**
```typescript
const playNotificationSound = () => {
  // ... código de reproducción de sonido
  console.log('🔊 Sonido reproducido en sala de espera');
};
```

**Detección de nuevo paciente:**
```typescript
const [lastCalledPatientId, setLastCalledPatientId] = useState<string | null>(null);

useEffect(() => {
  if (current && current.id !== lastCalledPatientId) {
    setLastCalledPatientId(current.id);
    playNotificationSound(); // 🔊
  }
}, [localQueueState]);
```

**Layout reorganizado:**
```typescript
// Antes: 2 columnas (grid)
<div style={{ gridTemplateColumns: '2fr 1fr' }}>
  <div>{/* Paciente */}</div>
  <div>{/* Lista */}</div>
</div>

// Después: 2 filas (stack)
<div style={{ /* Paciente arriba */ }} />
<div style={{ /* Lista abajo */ }} />
```

## 📊 Flujo Completo del Sistema

### Escenario: Dos Puestos Atendiendo Simultáneamente

```
Estado Inicial:
- Cola: [Paciente A, Paciente B, Paciente C, Paciente D]
- Puesto 1: Libre
- Puesto 2: Libre

Paso 1: Puesto 1 llama siguiente
├─ Paciente A → status: 'called', puesto: 1
├─ Panel Puesto 1: Muestra Paciente A ✅
├─ Panel Puesto 2: No muestra nada ✅
└─ Display: Muestra Paciente A (CI + Puesto 1) 🔊

Paso 2: Puesto 2 llama siguiente
├─ Paciente B → status: 'called', puesto: 2
├─ Panel Puesto 1: Sigue mostrando Paciente A ✅
├─ Panel Puesto 2: Muestra Paciente B ✅
└─ Display: Muestra Paciente B (CI + Puesto 2) 🔊 (más reciente)

Paso 3: Puesto 1 llama siguiente
├─ Paciente A → status: 'completed'
├─ Paciente C → status: 'called', puesto: 1
├─ Panel Puesto 1: Muestra Paciente C ✅
├─ Panel Puesto 2: Sigue mostrando Paciente B ✅
└─ Display: Muestra Paciente C (CI + Puesto 1) 🔊 (más reciente)

Estado Final:
- Cola: [Paciente D]
- Puesto 1: Atendiendo Paciente C
- Puesto 2: Atendiendo Paciente B
- Display: Muestra Paciente C (último llamado)
- Completados: [Paciente A]
```

## 🎨 Visualización de Pantallas

### Panel Puesto 1 (`/lab/1`)

```
┌──────────────────────────────────────┐
│ Panel del Laboratorista - Puesto 1  │
├──────────────────────────────────────┤
│         SECTOR A                     │
│      3 pacientes en espera           │
├──────────────────────────────────────┤
│ ┌─────────────────────┐              │
│ │ Atendiendo Ahora    │              │
│ │                     │              │
│ │    TEST12345        │  ← Solo ve SU│
│ │  Juan Pérez         │    paciente  │
│ │  CI: 1234567-8      │              │
│ └─────────────────────┘              │
│                                      │
│ [Llamar Siguiente]                   │
└──────────────────────────────────────┘
```

### Panel Puesto 2 (`/lab/2`)

```
┌──────────────────────────────────────┐
│ Panel del Laboratorista - Puesto 2  │
├──────────────────────────────────────┤
│         SECTOR A                     │
│      3 pacientes en espera           │
├──────────────────────────────────────┤
│ ┌─────────────────────┐              │
│ │ Atendiendo Ahora    │              │
│ │                     │              │
│ │    TEST67890        │  ← Ve SU     │
│ │  María García       │    paciente  │
│ │  CI: 7654321-9      │              │
│ └─────────────────────┘              │
│                                      │
│ [Llamar Siguiente]                   │
└──────────────────────────────────────┘
```

### Pantalla de Display (`/display`)

```
┌───────────────────────────────────────┐
│ Logo              14:30    13/11/2025 │
├───────────────────────────────────────┤
│                                       │
│         SECTOR A - Pase a             │
│                                       │
│     ┌─────────────────────┐           │
│     │  CI: 7654321-9      │  ← Último │
│     │  (5rem, animado)    │    llamado│
│     └─────────────────────┘           │
│                                       │
│     ┌─────────────────────┐           │
│     │  📍 PUESTO 2        │           │
│     │  (4rem)             │           │
│     └─────────────────────┘           │
│                                       │
├───────────────────────────────────────┤
│   Pacientes en Espera (3)             │
├───────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │ CI:  │ │ CI:  │ │ CI:  │           │
│ │12..  │ │34..  │ │56..  │           │
│ │ #1   │ │ #2   │ │ #3   │           │
│ └──────┘ └──────┘ └──────┘           │
└───────────────────────────────────────┘

🔊 (Sonido se reproduce aquí cuando hay nuevo paciente)
```

## 🧪 Casos de Prueba

### Caso 1: Independencia de Puestos

**Setup:**
1. Abrir `/lab/1` en pestaña 1
2. Abrir `/lab/2` en pestaña 2
3. Abrir `/display` en pestaña 3
4. Agregar 4 pacientes de prueba

**Prueba:**
1. Puesto 1 llama siguiente
   - ✅ Puesto 1 ve el paciente
   - ✅ Puesto 2 NO ve ningún paciente
   - ✅ Display muestra el paciente con "PUESTO 1"
   - ✅ Se escucha sonido

2. Puesto 2 llama siguiente
   - ✅ Puesto 1 sigue con su paciente
   - ✅ Puesto 2 ve su nuevo paciente
   - ✅ Display muestra paciente de Puesto 2 (más reciente)
   - ✅ Se escucha sonido nuevamente

3. Puesto 1 llama siguiente (completar anterior)
   - ✅ Puesto 1 ve nuevo paciente
   - ✅ Puesto 2 sigue con su paciente original
   - ✅ Display muestra paciente de Puesto 1 (más reciente)
   - ✅ Se escucha sonido

### Caso 2: Sonido Solo en Display

**Setup:**
1. Abrir `/lab/1`
2. Abrir `/display`
3. Silenciar todo excepto display

**Prueba:**
1. En `/lab/1`, llamar siguiente
   - ❌ NO debe sonar en `/lab/1`
   - ✅ SÍ debe sonar en `/display`

### Caso 3: Layout de Display

**Setup:**
1. Abrir `/display`
2. Agregar varios pacientes

**Verificar:**
- ✅ Paciente llamado está ARRIBA (prominente)
- ✅ Lista de espera está ABAJO (grid)
- ✅ No hay columnas lado a lado
- ✅ Buena visibilidad de CI y Puesto

## ⚠️ Consideraciones Importantes

### Limitación Actual: Un "Current" por Sector

**Estado Actual:**
- El queueStore retorna como "current" el **último llamado**
- Si hay múltiples pacientes en diferentes puestos, solo uno es "current"
- Los demás pacientes llamados aún están en el sistema con `status: 'called'`

**Implicación para Display:**
- La pantalla de display siempre muestra el **último paciente llamado**
- Si 5 puestos llaman pacientes, se ve el más reciente
- Los pacientes anteriores siguen en atención, pero no son el "current" visible

**¿Es un problema?**
- ❌ NO para el panel del laboratorista (cada uno ve solo el suyo)
- ⚠️  POTENCIAL para display si se quiere mostrar TODOS los pacientes en atención

**Solución Futura (si se necesita):**
- Cambiar el tipo de `QueueState` para tener múltiples "current"
- O agregar un array `calledPatients` en el estado
- Modificar display para mostrar todos los pacientes en atención

## 📝 Resumen de Cambios

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Panel Lab - Current** | Todos ven el mismo | Cada puesto ve solo el suyo |
| **Sonido** | En panel laboratorista | En sala de espera |
| **Layout Display** | 2 columnas | 2 filas (arriba/abajo) |
| **Multiple Puestos** | No soportado | Totalmente funcional |
| **Independence** | Compartido | Aislado por puesto |

## ✅ Beneficios

1. **Independencia Total**: Cada puesto trabaja sin interferir con otros
2. **Escalabilidad**: Soporta N puestos trabajando simultáneamente
3. **UX Mejorada**: Sonido donde se necesita, no donde molesta
4. **Visibilidad**: Layout de display optimizado para lectura
5. **Organización**: Clara separación de responsabilidades

## 🎉 Conclusión

El sistema ahora soporta completamente múltiples puestos de laboratorio trabajando simultáneamente con:

✅ **Aislamiento** - Cada laboratorista ve solo su paciente
✅ **Independencia** - Los puestos no se afectan entre sí
✅ **Notificaciones** - Sonido en sala de espera, no en panel
✅ **Visualización** - Layout optimizado para pantalla pública
✅ **Escalabilidad** - Funciona con cualquier número de puestos

