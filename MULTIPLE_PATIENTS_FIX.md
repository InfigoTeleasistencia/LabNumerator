# Fix: Múltiples Pacientes Llamados Simultáneamente

## Problema Identificado

Cuando se llamaba a un segundo paciente, el primero desaparecía de todas las pantallas (tanto sala de espera como laboratorista). Esto ocurría porque:

1. El sistema solo mantenía UN `currentPatientId` por sector
2. Cuando se llamaba a un nuevo paciente, el anterior se marcaba como completado inmediatamente
3. La pantalla de display solo mostraba el paciente más reciente

## Solución Implementada

### 1. Modificación en `queueStore.ts`

**Antes:**
- `callNext()` completaba automáticamente el paciente anterior del sector
- Solo se permitía UN paciente en estado "called"

**Ahora:**
- `callNext()` solo completa el paciente del **mismo puesto específico**
- Múltiples pacientes pueden estar en estado "called" simultáneamente (uno por puesto)
- Cada puesto maneja su propio paciente independientemente

```typescript
// Si hay un paciente actual en ESTE puesto específico, moverlo a completado
if (puesto) {
  const currentPatientInPuesto = Array.from(this.patients.values())
    .find(p => p.sector === sectorId && p.status === 'called' && p.puesto === puesto);
  
  if (currentPatientInPuesto) {
    currentPatientInPuesto.status = 'completed';
    currentPatientInPuesto.completedAt = Date.now();
    this.addToRecent(sectorId, currentPatientInPuesto.id);
  }
}
```

### 2. Nueva Propiedad `calledPatients`

Se agregó un array `calledPatients` a cada sector que contiene TODOS los pacientes en estado "called":

**En `api/queue/state.ts`:**
```typescript
Object.keys(state.sectors).forEach(sectorId => {
  const calledPatients = queueStore.getCalledPatients(sectorId);
  (state.sectors[sectorId] as any).calledPatients = calledPatients;
});
```

**En `socketManager.ts`:**
- Se incluye `calledPatients` en cada actualización WebSocket
- Permite que todos los clientes reciban la lista completa de pacientes llamados

### 3. Actualización de la Pantalla de Display (`display.tsx`)

**Antes:**
- Mostraba solo UN paciente (el `current`)
- Diseño vertical centrado

**Ahora:**
- Muestra TODOS los pacientes llamados en una grilla horizontal
- Grid adaptativo:
  - 1 paciente: columna única grande
  - 2 pacientes: 2 columnas
  - 3+ pacientes: grid adaptativo con mínimo 300px
- Cada tarjeta muestra:
  - Cédula del paciente (grande, fondo rojo)
  - Número de puesto (mediano, fondo azul)

### 4. Panel del Laboratorista (`lab.tsx`)

**Sin cambios en esta actualización**, ya que:
- Cada laboratorista solo ve SU paciente específico
- La lógica de filtrado por `puesto` ya estaba implementada correctamente

## Flujo de Funcionamiento

### Escenario: Múltiples Puestos Llamando Pacientes

1. **Puesto 1** llama al paciente A:
   - Paciente A: estado="called", puesto=1
   - Display: muestra paciente A

2. **Puesto 2** llama al paciente B (mientras A sigue en atención):
   - Paciente A: sigue en estado="called", puesto=1
   - Paciente B: estado="called", puesto=2
   - Display: muestra pacientes A y B en grid

3. **Puesto 1** llama al paciente C (termina con A):
   - Paciente A: estado="completed"
   - Paciente B: sigue en estado="called", puesto=2
   - Paciente C: estado="called", puesto=1
   - Display: muestra pacientes B y C en grid

## Logs de Diagnóstico

Se agregaron logs en `queueStore.callNext()`:
```
✅ Paciente {code} completado en Puesto {puesto}
📢 Paciente {code} llamado a Puesto {puesto}
```

Y en `display.tsx`:
```
🎯 [Display] Pacientes llamados: {count}
```

## Beneficios

1. ✅ Múltiples puestos pueden operar simultáneamente
2. ✅ Los pacientes permanecen visibles hasta ser completados
3. ✅ La pantalla de display muestra todos los pacientes en atención
4. ✅ Cada laboratorista solo ve su paciente asignado
5. ✅ El sonido se reproduce solo cuando se llama un NUEVO paciente
6. ✅ Grid adaptativo mejora la experiencia visual

## Testing

Para probar:

1. Abrir `/lab/1` y `/lab/2` en ventanas separadas
2. Abrir `/display` en otra ventana
3. Validar varios pacientes en `/scan`
4. Llamar pacientes desde diferentes puestos
5. Verificar que TODOS aparecen en `/display`
6. Verificar que cada laboratorista solo ve SU paciente
7. Llamar un segundo paciente desde un puesto
8. Verificar que el anterior desaparece SOLO de ese puesto
9. Verificar que el paciente del OTRO puesto sigue visible

## Archivos Modificados

- `src/lib/queueStore.ts` - Lógica de llamada por puesto específico
- `src/pages/api/queue/state.ts` - Agregar `calledPatients` al estado
- `src/lib/socketManager.ts` - Incluir `calledPatients` en actualizaciones
- `src/pages/display.tsx` - Grid de múltiples pacientes llamados

## Fecha

Noviembre 13, 2025

