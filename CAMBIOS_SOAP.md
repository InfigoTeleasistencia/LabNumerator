# 🔄 Cambios Realizados para Integración SOAP

## Resumen

Se actualizó la aplicación para integrar el servicio SOAP de GXSalud (`alabwbs01`), implementando gestión por sectores y validación de turnos vencidos.

## ✅ Cambios Implementados

### 1. Cliente SOAP (Nuevo)

**Archivo**: `/src/lib/soapClient.ts`

- ✅ Función `validateBarcodeWithSOAP()` para llamar al servicio SOAP
- ✅ Parser XML para respuestas SOAP
- ✅ Validación de `HoraFinal` (rechaza turnos vencidos)
- ✅ Manejo de errores del servicio (`Error = S`)
- ✅ Timeout de 10 segundos
- ✅ Mock para desarrollo con 5 códigos de prueba

**Validaciones:**
- Turno no vencido (`HoraFinal > ahora`)
- Respuesta completa (Nombre, Sector requeridos)
- Manejo de errores de red

### 2. Tipos Actualizados

**Archivo**: `/src/types/index.ts`

**Antes:**
```typescript
interface Patient {
  code: string;
  name: string;
  appointmentId: string;
  // ...
}

interface QueueState {
  waiting: Patient[];
  current: Patient | null;
  recent: Patient[];
}
```

**Después:**
```typescript
interface Patient {
  code: string; // LabOSNro
  name: string; // Nombre
  cedula: string; // Cedula-Digito
  matricula: string; // Matricula
  usuario: string; // Usuario (Historia Clínica)
  dependencia: string; // Dependencia
  sector: string; // Sector (ID)
  sectorDescription: string; // SecDescripcion
  fecha: string; // Fecha de extracción
  horaInicial: string; // HoraInicial
  horaFinal: string; // HoraFinal
  // ...
}

interface QueueState {
  sectors: {
    [sectorId: string]: {
      waiting: Patient[];
      current: Patient | null;
      recent: Patient[];
    };
  };
}
```

### 3. Queue Store con Sectores

**Archivo**: `/src/lib/queueStore.ts`

**Cambios:**
- ✅ Cola independiente por sector
- ✅ Método `addPatient()` asigna al sector correspondiente
- ✅ Método `callNext(sectorId)` llama siguiente del sector
- ✅ Método `getSectorState(sectorId)` obtiene estado de un sector
- ✅ Método `getAllSectors()` lista todos los sectores activos

**Estructura:**
```typescript
{
  sectors: {
    "151": {
      waiting: [...pacientes Sector A...],
      current: pacienteActual,
      recent: [...atendidos...]
    },
    "152": {
      waiting: [...pacientes Sector B...],
      current: null,
      recent: []
    }
  }
}
```

### 4. API de Validación

**Archivo**: `/src/pages/api/validate.ts`

**Cambios:**
- ✅ Usa `validateCodeWithExternalAPI()` que llama al SOAP
- ✅ Verifica duplicados antes de llamar SOAP
- ✅ Parsea respuesta SOAP y extrae todos los campos
- ✅ Asigna paciente al sector correspondiente
- ✅ Retorna información del sector en la respuesta

**Flujo:**
```
1. Verificar duplicado
2. Llamar servicio SOAP
3. Validar HoraFinal
4. Agregar a cola del sector
5. Emitir WebSocket update
```

### 5. API Queue/Next

**Archivo**: `/src/pages/api/queue/next.ts`

**Cambios:**
- ✅ Requiere `sectorId` en el body
- ✅ Llama `queueStore.callNext(sectorId)`
- ✅ Solo afecta la cola del sector seleccionado

**Request:**
```json
POST /api/queue/next
{
  "sectorId": "151"
}
```

### 6. Nueva API: Sectors

**Archivo**: `/src/pages/api/queue/sectors.ts` (Nuevo)

- ✅ GET endpoint para listar sectores activos
- ✅ Retorna array de IDs de sectores

### 7. Página de Escaneo

**Archivo**: `/src/pages/scan.tsx`

**Cambios:**
- ✅ Muestra sector asignado después de validar
- ✅ Muestra CI del paciente
- ✅ Mensajes de error mejorados (incluye `errorDescription`)
- ✅ Auto-reset después de 6 segundos (éxito) o 4 segundos (error)

**Nueva UI:**
```
✅ Código validado
VESPA AMATI JUAN
CI: 1171684-0

[Sector: SECTOR A] [Posición: #3]
```

### 8. Página de Pantalla

**Archivo**: `/src/pages/display.tsx`

**Cambios:**
- ✅ Selector de sectores (tabs arriba)
- ✅ Muestra solo el sector seleccionado
- ✅ Auto-selecciona el primer sector
- ✅ Contador de espera por sector en el tab
- ✅ Muestra CI del paciente actual

**Nueva UI:**
```
[Sector A (3)] [Sector B (5)] [Sector C (1)]

         SECTOR A
     Paciente Actual
     
      110007938
   VESPA AMATI JUAN
    CI: 1171684-0
```

### 9. Página del Laboratorista

**Archivo**: `/src/pages/lab.tsx`

**Cambios:**
- ✅ Selector de sectores con botones
- ✅ Muestra información del sector seleccionado
- ✅ Botón "Llamar Siguiente" específico del sector
- ✅ Estadísticas generales (todos los sectores):
  - Total en espera
  - Total en atención
  - Total atendidos
  - Sectores activos
- ✅ Lista de espera del sector seleccionado
- ✅ Muestra CI, matrícula y hora de registro

**Nueva UI:**
```
Seleccionar Sector:
[SECTOR A - 3 en espera] [SECTOR B - 5 en espera]

Atendiendo Ahora (SECTOR A)
    110007938
 VESPA AMATI JUAN
   CI: 1171684-0

[Llamar Siguiente (3 en espera)]

Estadísticas Generales:
8 En Espera | 2 En Atención | 15 Atendidos | 3 Sectores
```

### 10. Hook useSocket

**Archivo**: `/src/hooks/useSocket.ts`

**Cambios:**
- ✅ Estado inicial con `sectors: {}`
- ✅ Compatible con nueva estructura de `QueueState`

### 11. Dependencias

**Archivo**: `package.json`

**Nueva dependencia:**
```json
"fast-xml-parser": "^4.3.5"
```

Para parsear respuestas SOAP/XML.

### 12. Variables de Entorno

**Archivo**: `.env.local` (crear)

```env
# URL del servicio SOAP
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01

# Usar producción (true) o mock (false)
USE_PRODUCTION_SOAP=false
```

### 13. Documentación

**Nuevos archivos:**
- `SOAP_CONFIG.md` - Configuración detallada del SOAP
- `CAMBIOS_SOAP.md` - Este archivo

**Actualizados:**
- `README.md` - Información completa actualizada
- `QUICKSTART.md` - Códigos de prueba actualizados
- `PROJECT_SUMMARY.md` - Resumen actualizado

## 🎯 Códigos de Prueba (Mock)

Mientras `USE_PRODUCTION_SOAP=false`:

| Código | Paciente | Sector | Sector Desc |
|--------|----------|--------|-------------|
| 110007938 | VESPA AMATI JUAN | 151 | SECTOR A |
| 110007939 | GARCÍA LÓPEZ MARÍA | 151 | SECTOR A |
| 110007940 | RODRÍGUEZ PÉREZ CARLOS | 152 | SECTOR B |
| 110007941 | MARTÍNEZ GONZÁLEZ ANA | 152 | SECTOR B |
| 110007942 | SÁNCHEZ FERNÁNDEZ LUIS | 153 | SECTOR C |

## 🔄 Migración desde Versión Anterior

Si tenías la versión anterior:

### 1. Actualizar Dependencias
```bash
npm install
```

### 2. Crear .env.local
```bash
cp .env.local.example .env.local
# Editar con tus valores
```

### 3. Datos Existentes
⚠️ **Importante**: Los datos en memoria de la versión anterior NO son compatibles.

Al reiniciar con la nueva versión:
- Todas las colas se vacían
- Los pacientes deben volver a escanearse
- Se asignarán automáticamente a sus sectores

## 🧪 Testing

### Test Manual en Desarrollo

1. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

2. **Probar validación:**
   - Ir a http://localhost:3000/scan
   - Escanear código: `110007938`
   - Verificar: Se asigna a SECTOR A

3. **Probar sectores:**
   - Escanear `110007938` (Sector A)
   - Escanear `110007940` (Sector B)
   - Ir a http://localhost:3000/display
   - Verificar: Tabs de Sector A y Sector B

4. **Probar llamar paciente:**
   - Ir a http://localhost:3000/lab
   - Seleccionar Sector A
   - Presionar "Llamar Siguiente"
   - Verificar: Paciente aparece en "Atendiendo Ahora"

5. **Probar turno vencido:**
   - En `/src/lib/soapClient.ts`, cambiar línea:
     ```typescript
     horaFinal.setHours(7, 30, 0); // Cambiar a hora pasada
     ```
   - Escanear código
   - Verificar: "Turno vencido"

### Test con Servicio SOAP Real

1. **Configurar .env.local:**
   ```env
   USE_PRODUCTION_SOAP=true
   SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
   ```

2. **Verificar conectividad:**
   ```bash
   ping ae89
   # Debe responder
   ```

3. **Probar con código real:**
   - Escanear código de paciente real
   - Verificar respuesta del servicio

## 📊 Cambios en Datos

### Estructura de Paciente

**Campos nuevos:**
```typescript
cedula: "1171684-0"        // CI completa con dígito
matricula: "1101658"       // ID de socio
usuario: "127619093"       // Historia clínica
dependencia: "50 - SEDE CENTRAL"
sector: "151"              // ID del sector
sectorDescription: "SECTOR A"
fecha: "2025-08-19"
horaInicial: "2025-08-19T06:45:00"
horaFinal: "2025-08-19T07:30:00"
```

**Campos removidos:**
```typescript
appointmentId // Ya no se usa, reemplazado por usuario/matricula
```

## 🔒 Seguridad

**Validaciones agregadas:**
1. ✅ Código duplicado
2. ✅ Turno vencido (HoraFinal)
3. ✅ Timeout de conexión (10s)
4. ✅ Datos incompletos
5. ✅ Errores del servicio

## 🚀 Deploy a Producción

### Checklist

- [ ] Configurar `USE_PRODUCTION_SOAP=true`
- [ ] Configurar `SOAP_URL` correcto
- [ ] Verificar conectividad con servidor SOAP
- [ ] Testear con códigos reales
- [ ] Verificar horarios de turnos
- [ ] Configurar base de datos (recomendado)
- [ ] Habilitar logs de auditoría
- [ ] Configurar HTTPS
- [ ] Testear lectores USB en producción

## 📞 Soporte

Para problemas:

1. **Lector USB**: Ver [BARCODE_READER.md](./BARCODE_READER.md)
2. **Servicio SOAP**: Ver [SOAP_CONFIG.md](./SOAP_CONFIG.md)
3. **Configuración**: Ver [README.md](./README.md)
4. **Errores**: Revisar consola del navegador y servidor

## ✨ Próximos Pasos Sugeridos

1. **Persistencia**: Migrar de memoria a base de datos
2. **Autenticación**: Agregar login para laboratoristas
3. **Auditoría**: Guardar historial de validaciones
4. **Reportes**: Estadísticas por sector y período
5. **Notificaciones**: SMS/Email al paciente
6. **Multi-ventanilla**: Múltiples puestos por sector

---

**Fecha de cambios**: Octubre 2025  
**Versión**: 2.0.0 (SOAP + Sectores)  
**Autor**: Sistema de Atención para Laboratorios
