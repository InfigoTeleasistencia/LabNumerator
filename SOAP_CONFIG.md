# 🔌 Configuración del Servicio SOAP

## Servicio Web SOAP del Laboratorio

Esta aplicación se integra con el servicio SOAP de GXSalud para validar códigos de barras de pacientes.

## 📋 Información del Servicio

### Endpoint

```
URL: http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
WSDL: http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01?WSDL
```

### Método: labwbs01.Execute

**Input:**
- `Labosnro` (N10): Número del código de barras

**Output:**
- `Error` (C1): Indicador de error (N/S)
- `Errdescripcion` (C50): Descripción del error
- `Nombre` (C50): Nombre del paciente
- `Cedula` (N7): Cédula del paciente
- `Digito` (N1): Dígito verificador
- `Matricula` (N9): ID del socio
- `Usuario` (N11): ID de historia clínica
- `Dependencia` (N5): Código de dependencia
- `Depdescripcion` (C60): Nombre de dependencia
- `Sector` (N4): ID del sector de laboratorio
- `Secdescripcion` (C20): Descripción del sector
- `Fecha` (D): Fecha de extracción
- `Horainicial` (DT): Hora inicial del turno
- `Horafinal` (DT): Hora final del turno

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local`:

```env
# URL del servicio SOAP (producción)
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01

# Habilitar servicio SOAP real (false = usa mock)
USE_PRODUCTION_SOAP=true
```

### 2. Modo Desarrollo (Mock)

Por defecto, la aplicación usa datos simulados para desarrollo:

```env
USE_PRODUCTION_SOAP=false
```

**Códigos de prueba (mock):**
- `110007938` → VESPA AMATI JUAN (Sector A)
- `110007939` → GARCÍA LÓPEZ MARÍA (Sector A)
- `110007940` → RODRÍGUEZ PÉREZ CARLOS (Sector B)
- `110007941` → MARTÍNEZ GONZÁLEZ ANA (Sector B)
- `110007942` → SÁNCHEZ FERNÁNDEZ LUIS (Sector C)

### 3. Modo Producción (SOAP Real)

Para usar el servicio SOAP real:

```env
USE_PRODUCTION_SOAP=true
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
```

## 📡 Ejemplo de Comunicación

### Request SOAP

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gxs="GXSalud">
   <soapenv:Header/>
   <soapenv:Body>
      <gxs:labwbs01.Execute>
         <gxs:Labosnro>110007938</gxs:Labosnro>
      </gxs:labwbs01.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

### Response SOAP (Éxito)

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <labwbs01.ExecuteResponse xmlns="GXSalud">
         <Error>N</Error>
         <Errdescripcion/>
         <Nombre>VESPA AMATI JUAN</Nombre>
         <Cedula>1171684</Cedula>
         <Digito>0</Digito>
         <Matricula>1101658</Matricula>
         <Usuario>127619093</Usuario>
         <Dependencia>50</Dependencia>
         <Depdescripcion>SEDE CENTRAL</Depdescripcion>
         <Sector>151</Sector>
         <Secdescripcion>SECTOR A</Secdescripcion>
         <Fecha>2025-08-19</Fecha>
         <Horainicial>2025-08-19T06:45:00</Horainicial>
         <Horafinal>2025-08-19T07:30:00</Horafinal>
      </labwbs01.ExecuteResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

### Response SOAP (Error)

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <labwbs01.ExecuteResponse xmlns="GXSalud">
         <Error>S</Error>
         <Errdescripcion>Código no encontrado</Errdescripcion>
      </labwbs01.ExecuteResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

## ✅ Validaciones Implementadas

### 1. Validación de Duplicados
- ❌ Rechaza si el código ya está en la cola
- Mensaje: "Este código ya está en la cola"

### 2. Validación de Horario
- ❌ Rechaza si `HoraFinal` ya pasó
- Mensaje: "Turno vencido: El horario de atención finalizó a las XX:XX"

### 3. Validación de Respuesta
- ❌ Rechaza si el servicio retorna `Error = S`
- ❌ Rechaza si faltan datos obligatorios (Nombre, Sector)

### 4. Manejo de Errores de Red
- ❌ Timeout después de 10 segundos
- ❌ Error de conexión
- ❌ Error HTTP

## 🏗️ Flujo de Validación

```
Usuario escanea código
        ↓
   POST /api/validate
        ↓
¿Código duplicado? → Sí → Error 409
        ↓ No
Llamar SOAP Service
        ↓
   ¿Error = S? → Sí → Error 400
        ↓ No
¿HoraFinal < Ahora? → Sí → Error 400 (Turno vencido)
        ↓ No
Agregar a cola del sector
        ↓
Emitir WebSocket update
        ↓
    Éxito 200
```

## 🔍 Debugging

### Ver Logs

En desarrollo, verás logs en la consola:

```javascript
console.log('Usando SOAP mock para desarrollo');
// o
console.log('Llamando al servicio SOAP de producción');
```

### Probar con cURL

```bash
curl -X POST \
  http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01 \
  -H 'Content-Type: text/xml' \
  -H 'SOAPAction: labwbs01.Execute' \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gxs="GXSalud">
   <soapenv:Header/>
   <soapenv:Body>
      <gxs:labwbs01.Execute>
         <gxs:Labosnro>110007938</gxs:Labosnro>
      </gxs:labwbs01.Execute>
   </soapenv:Body>
</soapenv:Envelope>'
```

### Probar con Postman

1. Crear request POST
2. URL: `http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01`
3. Headers:
   - `Content-Type: text/xml`
   - `SOAPAction: labwbs01.Execute`
4. Body (raw XML): (ver ejemplo arriba)

## 🚨 Troubleshooting

### Error: "Servicio no disponible"

**Causa**: No se puede conectar al servidor SOAP

**Soluciones**:
1. Verificar que el servidor esté activo
2. Verificar la URL en `.env.local`
3. Verificar conectividad de red (ping, telnet)
4. Verificar firewall

### Error: "Turno vencido"

**Causa**: La `HoraFinal` del turno ya pasó

**Soluciones**:
1. El paciente debe reagendar
2. Verificar reloj del servidor

### Error: "Código no encontrado"

**Causa**: El código no existe en el sistema

**Soluciones**:
1. Verificar que el código sea correcto
2. Verificar que la cita esté agendada

### Error: "Timeout"

**Causa**: El servicio tarda >10 segundos en responder

**Soluciones**:
1. Verificar rendimiento del servidor SOAP
2. Aumentar timeout en `/src/lib/soapClient.ts`:
   ```typescript
   timeout: 15000, // 15 segundos
   ```

## 🔐 Seguridad

### Recomendaciones

1. **Red Interna**: Idealmente, el servicio SOAP debe estar en red interna
2. **VPN**: Si está expuesto, usar VPN
3. **Firewall**: Restringir acceso por IP
4. **Logs**: Registrar todos los intentos de validación
5. **Rate Limiting**: Limitar requests por IP/usuario

## 📈 Performance

### Métricas Esperadas

- **Latencia promedio**: 200-500ms
- **Timeout**: 10 segundos
- **Requests concurrentes**: ~50

### Optimizaciones

Si el servicio es lento, considera:
1. Cache de resultados (Redis)
2. Aumentar timeout
3. Implementar retry logic
4. Connection pooling

## 📞 Contacto

Para problemas con el servicio SOAP, contactar al equipo de GXSalud.

---

**Archivo de implementación**: `/src/lib/soapClient.ts`
