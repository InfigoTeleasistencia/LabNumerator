# Sistema Automático de Limpieza de Cola

## Implementación: AMBAS Estrategias

El sistema implementa **DOS estrategias complementarias** para mantener la cola limpia y actualizada:

1. **Limpieza por tiempo (2 horas)** - Durante el día
2. **Limpieza diaria (medianoche)** - Al cambio de día

## Estrategia 1: Limpieza de Pacientes Obsoletos (>2 horas)

### ¿Qué hace?

Cada **15 minutos**, el sistema revisa todos los pacientes en la cola y:

- ✅ Remueve pacientes que llevan **más de 2 horas** desde que se agregaron
- ✅ Aplica a pacientes en estado `waiting` (esperando)
- ✅ Aplica a pacientes en estado `called` (siendo atendidos)
- ✅ Marca pacientes como `expired` antes de removerlos

### ¿Por qué es útil?

- Elimina pacientes que probablemente **no se presentaron**
- Mantiene la cola **actualizada** durante todo el día
- Evita **confusión** del personal con pacientes "fantasma"
- **No interrumpe** el flujo normal si los pacientes se atienden en tiempo razonable

### Ejemplo

```
08:00 - Paciente A agregado
10:05 - ✅ Paciente A sigue en cola (2h 5min, pero <2h desde última limpieza)
10:15 - 🧹 Limpieza ejecutada: Paciente A removido (>2h)

Log:
🧹 Removido paciente obsoleto (waiting): PAC-001 - 125 minutos
🧹 Limpieza completada: 1 pacientes obsoletos removidos
```

## Estrategia 2: Limpieza Diaria (Cambio de Día)

### ¿Qué hace?

Cada **5 minutos**, el sistema verifica si cambió el día, y si es así:

- ✅ Limpia **toda la cola** de espera
- ✅ Remueve pacientes no completados del día anterior
- ✅ **Mantiene** pacientes completados del día actual (para historial)
- ✅ Resetea contadores y estadísticas

### ¿Por qué es útil?

- Garantiza un **inicio fresco** cada día
- Elimina **residuos** del día anterior
- **Predecible** y alineado con horarios de operación
- Mantiene **historial** de pacientes completados hoy

### Ejemplo

```
2025-11-13 23:58 - Cola con 5 pacientes del día
2025-11-14 00:03 - Verificación de medianoche ejecutada
                   🌅 Nuevo día detectado

Log:
🌅 Nuevo día detectado (2025-11-13 → 2025-11-14). Limpiando cola...
🌅 Limpieza diaria completada: 5 pacientes removidos, 0 mantenidos
```

## Configuración

### Tiempos Configurables

En `src/lib/queueStore.ts`:

```typescript
// Tiempo máximo en cola antes de limpieza
const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 horas

// Frecuencia de limpieza de obsoletos
15 * 60 * 1000  // 15 minutos

// Frecuencia de verificación de día
5 * 60 * 1000   // 5 minutos
```

### Para Ajustar los Tiempos

#### Cambiar tiempo de expiración (ej: 3 horas en vez de 2):

```typescript
const threeHoursInMs = 3 * 60 * 60 * 1000; // 3 horas
if (age > threeHoursInMs) {
  // ...
}
```

#### Cambiar frecuencia de limpieza (ej: cada 30 minutos):

```typescript
this.cleanupInterval = setInterval(() => {
  this.cleanupStalePatients();
}, 30 * 60 * 1000); // 30 minutos
```

## Logs de Diagnóstico

### Al iniciar el servidor:

```
🔄 Tareas automáticas de limpieza iniciadas
   - Pacientes obsoletos: cada 15 minutos
   - Cambio de día: cada 5 minutos
```

### Limpieza de obsoletos:

```
🧹 Removido paciente obsoleto (waiting): PAC-123 - 135 minutos
🧹 Marcado paciente como expirado (called): PAC-456 - 142 minutos
🧹 Limpieza completada: 2 pacientes obsoletos removidos
```

### Limpieza diaria:

```
🌅 Nuevo día detectado (2025-11-13 → 2025-11-14). Limpiando cola...
🌅 Limpieza diaria completada: 12 pacientes removidos, 3 mantenidos
```

### Sin cambios:

Si no hay pacientes para limpiar, no se generan logs para evitar spam.

## API Endpoint: Limpieza Manual

### POST `/api/queue/cleanup`

Permite forzar una limpieza manual completa.

#### Request:

```bash
curl -X POST http://localhost:3000/api/queue/cleanup
```

#### Response:

```json
{
  "success": true,
  "message": "Limpieza forzada ejecutada correctamente"
}
```

#### Uso desde código:

```typescript
const response = await axios.post('/api/queue/cleanup');
console.log(response.data);
```

## Flujo Completo del Sistema

### Escenario Normal (Día de Operación)

```
08:00 → Servidor inicia
        ├─ Ejecuta limpieza inicial
        ├─ Detecta si es nuevo día
        └─ Inicia timers

08:15 → Primera limpieza automática (15 min)
        └─ Sin pacientes >2h, no hace nada

10:00 → Pacientes validándose
        └─ Cola creciendo normalmente

12:15 → Limpieza automática
        └─ Remueve 2 pacientes que no se presentaron

15:30 → Operación normal
        └─ Cola limpia y actualizada

23:59 → Día termina
        └─ Algunos pacientes en cola

00:05 → Nuevo día detectado
        ├─ 🌅 Limpieza diaria ejecutada
        ├─ Cola completamente reseteada
        └─ Sistema listo para nuevo día
```

### Escenario: Paciente No se Presenta

```
08:00 → Paciente A validado, agregado a cola
08:30 → Laboratorista llama a otros pacientes
09:00 → Paciente A nunca se presentó
09:15 → Limpieza automática (sin efecto, <2h)
10:15 → 🧹 Limpieza detecta Paciente A (>2h)
        └─ Removido de la cola
        └─ No molesta más al personal
```

### Escenario: Servidor Reiniciado

```
23:00 → Servidor se detiene
        └─ Cola guardada en disco

08:00 → Servidor reinicia
        ├─ Cola cargada desde disco
        ├─ 🌅 Nuevo día detectado
        ├─ Pacientes de ayer removidos
        └─ Cola limpia para hoy
```

## Persistencia

La limpieza **dispara guardado automático**:

```typescript
if (removedCount > 0) {
  this.scheduleSave(); // Guarda en data/queue-state.json
}
```

Esto garantiza que:
- ✅ La cola limpia persiste en disco
- ✅ No se "resucitan" pacientes obsoletos al reiniciar
- ✅ El estado es consistente entre servidor y disco

## Testing

### Test 1: Limpieza de Obsoletos

1. Agregar paciente manualmente en la consola del servidor:

```javascript
const { queueStore } = require('./src/lib/queueStore');

// Agregar paciente con timestamp viejo (3 horas atrás)
const oldTimestamp = Date.now() - (3 * 60 * 60 * 1000);
queueStore.addPatient({
  code: 'OLD-001',
  name: 'Paciente Viejo',
  cedula: '12345678',
  sector: '151',
  sectorDescription: 'SECTOR A',
  timestamp: oldTimestamp
});
```

2. Esperar 15 minutos o forzar limpieza:

```bash
curl -X POST http://localhost:3000/api/queue/cleanup
```

3. ✅ Verificar en logs: `🧹 Removido paciente obsoleto`

### Test 2: Limpieza Diaria

1. Cambiar manualmente `lastCleanupDate` en el código (temporal):

```typescript
this.lastCleanupDate = '2025-11-12'; // Día anterior
```

2. Reiniciar servidor
3. ✅ Verificar en logs: `🌅 Nuevo día detectado`

### Test 3: Limpieza Manual

1. Tener pacientes en cola
2. Ejecutar:

```bash
curl -X POST http://localhost:3000/api/queue/cleanup
```

3. ✅ Verificar respuesta `success: true`
4. ✅ Verificar logs de limpieza

## Ventajas del Enfoque DUAL

| Aspecto | Solo Diaria | Solo 2h | AMBAS ✅ |
|---------|-------------|---------|----------|
| Cola limpia durante el día | ❌ | ✅ | ✅ |
| Inicio fresco cada día | ✅ | ❌ | ✅ |
| Maneja pacientes que no llegan | ❌ | ✅ | ✅ |
| Reseteo predecible | ✅ | ❌ | ✅ |
| Sin confusión de días | ✅ | ⚠️ | ✅ |
| Mantenimiento automático | ⚠️ | ✅ | ✅ |

## Consideraciones

### Performance

- ✅ Operaciones ligeras (iteración sobre Maps)
- ✅ Solo ejecuta si hay pacientes para limpiar
- ✅ No bloquea operaciones de la cola
- ✅ Timers no acumulan memoria

### Casos Edge

1. **Servidor reiniciado múltiples veces:**
   - ✅ Fecha se carga desde disco o se inicializa
   - ✅ Limpieza diaria solo ejecuta una vez por día

2. **Cambio de horario (DST):**
   - ✅ Usa fecha ISO (YYYY-MM-DD), independiente de hora local
   - ✅ No afectado por cambios de horario

3. **Pacientes atendidos rápidamente:**
   - ✅ No se limpian (cambian a `completed`)
   - ✅ Solo afecta a `waiting` y `called` obsoletos

4. **Cola muy larga:**
   - ✅ Limpieza ayuda a mantenerla manejable
   - ⚠️ Si >100 pacientes esperan 2h, podría ser flujo lento

## Desactivar Limpieza (Solo para Testing)

```typescript
queueStore.stopAutomaticCleanup();
```

⚠️ **No recomendado en producción** - La cola crecerá indefinidamente.

## Archivos Modificados

1. **`src/lib/queueStore.ts`**
   - `cleanupStalePatients()` - Limpieza de obsoletos
   - `cleanupIfNewDay()` - Limpieza diaria
   - `startAutomaticCleanup()` - Inicialización de timers
   - `stopAutomaticCleanup()` - Detener timers
   - `forceCleanup()` - Limpieza manual

2. **`src/pages/api/queue/cleanup.ts`** (NUEVO)
   - Endpoint para limpieza manual

## Fecha

Noviembre 13, 2025

## Resumen Ejecutivo

El sistema ahora implementa **limpieza automática inteligente** que:

✅ **Mantiene la cola limpia durante el día** (elimina pacientes >2h cada 15 min)
✅ **Resetea la cola cada medianoche** (inicio fresco cada día)
✅ **Persiste cambios en disco** (consistencia)
✅ **Logs claros** para diagnóstico
✅ **API para limpieza manual** cuando sea necesario
✅ **Configurable** y adaptable a necesidades

**Resultado:** La cola se mantiene actualizada y relevante automáticamente, sin intervención manual. 🎉

