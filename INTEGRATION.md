# 🔌 Guía de Integración con API Externa

## Configuración de la API Externa

Esta aplicación puede integrarse con tu sistema de gestión de citas existente para validar códigos de barras en tiempo real.

## 📡 Endpoint Requerido

Tu API debe exponer un endpoint que valide códigos de barras:

### Request

```http
POST /validate
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "code": "LAB001"
}
```

### Response - Código Válido

```json
{
  "valid": true,
  "patient": {
    "name": "Juan Pérez",
    "appointmentId": "APT-2025-001",
    "code": "LAB001"
  }
}
```

### Response - Código Inválido

```json
{
  "valid": false,
  "error": "Código no válido o cita no encontrada"
}
```

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
EXTERNAL_API_URL=https://api.tu-laboratorio.com/validate
EXTERNAL_API_KEY=tu_api_key_secreto
```

### 2. Personalización del Cliente

Edita `/src/lib/externalApi.ts` si tu API tiene requisitos diferentes:

```typescript
export async function validateCodeWithExternalAPI(code: string): Promise<ValidationResponse> {
  try {
    const response = await axios.post(
      EXTERNAL_API_URL,
      { 
        code,
        // Agrega campos adicionales si es necesario
        timestamp: Date.now(),
        source: 'lab-queue-system'
      },
      {
        headers: {
          'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
          'Content-Type': 'application/json',
          // Agrega headers adicionales si es necesario
        },
        timeout: 5000,
      }
    );

    // Adapta el mapeo según tu respuesta
    return {
      valid: response.data.valid,
      patient: {
        name: response.data.patient.name,
        appointmentId: response.data.patient.appointmentId,
        code: response.data.patient.code,
      },
    };
  } catch (error) {
    console.error('Error validating code:', error);
    return {
      valid: false,
      error: 'Error al validar el código. Intente nuevamente.',
    };
  }
}
```

## 🧪 Pruebas

### Modo Desarrollo

En modo desarrollo (sin configurar variables de entorno), el sistema usa un mock que acepta estos códigos:

- `LAB001` → Juan Pérez
- `LAB002` → María González
- `LAB003` → Carlos Rodríguez
- `LAB004` → Ana Martínez
- `LAB005` → Luis Sánchez

### Probar con tu API

1. Configura las variables de entorno
2. Asegúrate de que `NODE_ENV=production` o elimina la condición del mock
3. Prueba con códigos reales de tu sistema

## 🔐 Seguridad

### Recomendaciones:

1. **Nunca expongas tu API key** en el código frontend
2. **Usa HTTPS** para todas las comunicaciones
3. **Implementa rate limiting** en tu API
4. **Valida tokens de sesión** si es necesario
5. **Registra intentos fallidos** para detectar fraudes

### Ejemplo con Headers Adicionales

```typescript
const response = await axios.post(
  EXTERNAL_API_URL,
  { code },
  {
    headers: {
      'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Request-ID': generateRequestId(),
      'X-Client-Version': '1.0.0',
    },
    timeout: 5000,
  }
);
```

## 🔄 Flujo Completo

```
┌─────────────┐
│   Usuario   │
│   escanea   │
│   código    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Next.js    │◄────── 1. POST /api/validate { code }
│    API      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Validar si  │
│ ya está en  │
│    cola     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Tu API     │◄────── 2. POST /validate { code }
│  Externa    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Respuesta  │
│  válida?    │
└──────┬──────┘
       │
       ├─── Sí ──▶ Agregar a cola + Emitir WebSocket
       │
       └─── No ──▶ Retornar error al cliente
```

## 📊 Campos Adicionales

Si tu sistema necesita campos adicionales (ej: tipo de examen, médico, etc.), puedes extender los tipos:

### 1. Actualizar Types

```typescript
// src/types/index.ts
export interface Patient {
  id: string;
  code: string;
  name: string;
  appointmentId: string;
  timestamp: number;
  status: 'waiting' | 'called' | 'attending' | 'completed';
  calledAt?: number;
  completedAt?: number;
  position?: number;
  
  // Campos adicionales
  examType?: string;
  doctor?: string;
  priority?: 'normal' | 'urgent';
}
```

### 2. Actualizar ValidationResponse

```typescript
export interface ValidationResponse {
  valid: boolean;
  patient?: {
    name: string;
    appointmentId: string;
    code: string;
    
    // Campos adicionales
    examType?: string;
    doctor?: string;
    priority?: 'normal' | 'urgent';
  };
  error?: string;
}
```

## 🚨 Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` | API no accesible | Verificar URL y conectividad |
| `401 Unauthorized` | API key inválida | Verificar credenciales |
| `timeout` | Respuesta lenta | Aumentar timeout o optimizar API |
| `409 Conflict` | Código duplicado | Informar al usuario |

### Implementar Retry Logic

```typescript
async function validateWithRetry(code: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await validateCodeWithExternalAPI(code);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 📞 Soporte

Si necesitas ayuda con la integración:

1. Revisa los logs del servidor: `console.log` en `/src/lib/externalApi.ts`
2. Usa herramientas como Postman para probar tu API directamente
3. Verifica que tu API retorna el formato correcto

## ✅ Checklist de Integración

- [ ] API externa accesible desde el servidor Next.js
- [ ] Variables de entorno configuradas
- [ ] API key válida y activa
- [ ] Formato de respuesta compatible
- [ ] HTTPS habilitado
- [ ] Timeout adecuado configurado
- [ ] Manejo de errores implementado
- [ ] Logs configurados para debugging
- [ ] Pruebas con códigos reales
- [ ] Rate limiting considerado

