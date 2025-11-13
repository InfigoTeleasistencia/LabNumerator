# Fix: Panel del Laboratorista - Paciente Desaparece

## Problema Identificado

Cuando el **Laboratorista 1** llamaba a un paciente, lo veía correctamente en su pantalla. Sin embargo, cuando el **Laboratorista 2** llamaba a otro paciente, el **Laboratorista 1 perdía la vista de su paciente** que estaba atendiendo.

### Causa Raíz

El código estaba filtrando el paciente desde `sectorData.current`:

```typescript
// ❌ CÓDIGO ANTIGUO (INCORRECTO)
const current = sectorData?.current && sectorData.current.puesto === puestoNumber 
    ? sectorData.current 
    : null;
```

**Problema:** `sectorData.current` solo contiene **UN** paciente - el más reciente llamado. Cuando el Laboratorista 2 llama a alguien, `current` cambia al nuevo paciente, y el filtro por `puesto` falla para el Laboratorista 1.

### Escenario del Error

```
1. Lab 1 llama a Paciente A
   → current = Paciente A (puesto=1)
   → Lab 1 ve: Paciente A ✅

2. Lab 2 llama a Paciente B
   → current = Paciente B (puesto=2)  ← CAMBIÓ!
   → Lab 1 busca en current (Paciente B)
   → Paciente B.puesto = 2 ≠ 1
   → Lab 1 ve: null ❌ (perdió a Paciente A)
```

## Solución Implementada

En lugar de buscar en `sectorData.current`, ahora buscamos en el array completo `calledPatients` que contiene **TODOS** los pacientes en estado "called":

```typescript
// ✅ CÓDIGO NUEVO (CORRECTO)
// Obtener TODOS los pacientes llamados
const calledPatients = sectorData && (sectorData as any).calledPatients 
    ? (sectorData as any).calledPatients 
    : [];

// Filtrar el paciente actual de ESTE puesto específico
const current = calledPatients.find((p: any) => p.puesto === puestoNumber) || null;
```

### Cómo Funciona Ahora

```
1. Lab 1 llama a Paciente A
   → calledPatients = [Paciente A (puesto=1)]
   → Lab 1 busca puesto=1: encuentra Paciente A ✅
   → Lab 1 ve: Paciente A

2. Lab 2 llama a Paciente B
   → calledPatients = [Paciente B (puesto=2), Paciente A (puesto=1)]
   → Lab 1 busca puesto=1: encuentra Paciente A ✅
   → Lab 2 busca puesto=2: encuentra Paciente B ✅
   → Lab 1 ve: Paciente A
   → Lab 2 ve: Paciente B

3. Lab 3 llama a Paciente C
   → calledPatients = [Paciente C (puesto=3), Paciente B (puesto=2), Paciente A (puesto=1)]
   → Lab 1 ve: Paciente A ✅
   → Lab 2 ve: Paciente B ✅
   → Lab 3 ve: Paciente C ✅
```

## Cambios en el Código

### Archivo: `src/pages/lab.tsx`

**Líneas modificadas: 115-129**

#### Antes:
```typescript
const sectorData = selectedSector ? localQueueState.sectors[selectedSector] : null;

// Filtrar el paciente actual por el puesto del laboratorista
const current = sectorData?.current && sectorData.current.puesto === puestoNumber 
  ? sectorData.current 
  : null;

const waiting = sectorData?.waiting || [];
const recent = sectorData?.recent || [];
```

#### Después:
```typescript
const sectorData = selectedSector ? localQueueState.sectors[selectedSector] : null;

// Obtener TODOS los pacientes llamados
const calledPatients = sectorData && (sectorData as any).calledPatients 
  ? (sectorData as any).calledPatients 
  : [];

// Filtrar el paciente actual de ESTE puesto específico
const current = calledPatients.find((p: any) => p.puesto === puestoNumber) || null;

const waiting = sectorData?.waiting || [];
const recent = sectorData?.recent || [];

console.log('🏥 [Lab] Puesto:', puestoNumber, '| Paciente actual:', current?.code || 'ninguno', '| Total llamados:', calledPatients.length);
```

## Log de Diagnóstico

Se agregó un log para facilitar debugging:

```
🏥 [Lab] Puesto: 1 | Paciente actual: PAC-001 | Total llamados: 3
🏥 [Lab] Puesto: 2 | Paciente actual: PAC-002 | Total llamados: 3
🏥 [Lab] Puesto: 3 | Paciente actual: PAC-003 | Total llamados: 3
```

Permite ver en la consola:
- Qué puesto está consultando
- Qué paciente tiene asignado
- Cuántos pacientes están siendo atendidos en total

## Dependencia de `calledPatients`

Este fix depende de que `calledPatients` esté disponible en el estado. Esto ya fue implementado en cambios anteriores:

### En `src/pages/api/queue/state.ts`:
```typescript
Object.keys(state.sectors).forEach(sectorId => {
  const calledPatients = queueStore.getCalledPatients(sectorId);
  (state.sectors[sectorId] as any).calledPatients = calledPatients;
});
```

### En `src/lib/socketManager.ts`:
```typescript
Object.keys(state.sectors).forEach(sectorId => {
  const calledPatients = queueStore.getCalledPatients(sectorId);
  (state.sectors[sectorId] as any).calledPatients = calledPatients;
});
```

## Testing

### Test 1: Un Solo Puesto
1. Abrir `/lab/1`
2. Llamar un paciente
3. ✅ Paciente visible en Lab 1

### Test 2: Dos Puestos Simultáneos
1. Abrir `/lab/1` y `/lab/2` en ventanas separadas
2. Llamar paciente desde Lab 1
3. ✅ Lab 1 ve su paciente
4. Llamar paciente desde Lab 2
5. ✅ Lab 1 SIGUE viendo su paciente
6. ✅ Lab 2 ve su propio paciente

### Test 3: Tres Puestos Simultáneos
1. Abrir `/lab/1`, `/lab/2`, `/lab/3`
2. Llamar un paciente desde cada uno
3. ✅ Cada laboratorista ve SOLO su paciente
4. Ninguno pierde su vista

### Test 4: Completar y Llamar Siguiente
1. Lab 1 tiene Paciente A
2. Lab 2 tiene Paciente B
3. Lab 1 llama al siguiente (completa A, llama C)
4. ✅ Lab 1 ahora ve Paciente C
5. ✅ Lab 2 SIGUE viendo Paciente B (no se afecta)

## Comparación Visual

### ANTES (Incorrecto):
```
Lab 1: [Paciente A] ← visible
Lab 2: [vacío]

↓ Lab 2 llama paciente

Lab 1: [vacío] ← ❌ PERDIÓ SU PACIENTE
Lab 2: [Paciente B]
```

### AHORA (Correcto):
```
Lab 1: [Paciente A] ← visible
Lab 2: [vacío]

↓ Lab 2 llama paciente

Lab 1: [Paciente A] ← ✅ MANTIENE SU PACIENTE
Lab 2: [Paciente B] ← ✅ VE EL SUYO
```

## Beneficios

1. ✅ **Independencia entre puestos:** Cada laboratorista mantiene su vista
2. ✅ **Sin interferencia:** Llamar desde un puesto no afecta a otros
3. ✅ **Escalable:** Funciona con N puestos simultáneos
4. ✅ **Consistencia:** Cada puesto ve solo lo que le corresponde
5. ✅ **Debugging:** Log claro para diagnóstico

## Impacto en Otras Pantallas

- **Display (`/display`):** ✅ No afectado, sigue funcionando correctamente
- **Validation (`/scan`):** ✅ No afectado
- **Home (`/`):** ✅ No afectado

## Archivos Modificados

- `src/pages/lab.tsx` - Cambio en lógica de filtrado de paciente actual

## Fecha

Noviembre 13, 2025

## Resumen Ejecutivo

El bug crítico donde los laboratoristas perdían la vista de sus pacientes cuando otro puesto llamaba a alguien ha sido **completamente resuelto**.

Ahora cada laboratorista ve **únicamente su propio paciente** buscando en el array completo `calledPatients` en lugar de depender del campo `current` que solo contenía el más reciente.

**Resultado:** Múltiples puestos pueden operar simultáneamente sin interferirse. ✅

