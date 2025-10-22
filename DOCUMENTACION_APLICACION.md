# 📋 Documentación - Sistema de Numeración de Atención para Laboratorio (LabNumerator)

**Versión:** 1.0.0  
**Fecha:** Octubre 2025  
**Organización:** Infigo Teleasistencia

---

## 📑 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Descripción General](#descripción-general)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Funcionalidades](#funcionalidades)
5. [Flujos de Trabajo](#flujos-de-trabajo)
6. [Tecnologías Utilizadas](#tecnologías-utilizadas)
7. [Configuración y Despliegue](#configuración-y-despliegue)
8. [Integración con GXSalud](#integración-con-gxsalud)
9. [Guía de Usuario](#guía-de-usuario)
10. [Mantenimiento y Soporte](#mantenimiento-y-soporte)

---

## 1. Resumen Ejecutivo

**LabNumerator** es un sistema web moderno diseñado para gestionar la cola de atención de pacientes en el laboratorio. La aplicación permite:

- **Registro rápido** mediante escaneo de código de barras
- **Validación automática** con el sistema GXSalud mediante servicio SOAP
- **Visualización en tiempo real** de la cola de espera
- **Gestión de múltiples sectores** del laboratorio
- **Sincronización instantánea** entre todas las pantallas mediante WebSockets

### Beneficios Principales

✅ **Reducción de tiempos de espera** - Proceso de registro automatizado  
✅ **Eliminación de errores** - Validación automática con GXSalud  
✅ **Transparencia** - Los pacientes ven su posición en tiempo real  
✅ **Eficiencia operativa** - Gestión centralizada de múltiples sectores  
✅ **Sin instalación en estaciones** - Aplicación web accesible desde cualquier navegador

---

## 2. Descripción General

### 2.1 Propósito

El sistema LabNumerator reemplaza el proceso manual de registro y numeración de pacientes en el laboratorio, automatizando la validación de turnos mediante integración directa con el sistema de gestión hospitalaria GXSalud.

### 2.2 Alcance

El sistema cubre tres áreas funcionales principales:

1. **Estación de Escaneo** - Donde los pacientes registran su llegada
2. **Pantalla de Visualización** - Muestra la cola de espera en tiempo real
3. **Panel de Control** - Permite al personal gestionar la cola

### 2.3 Usuarios del Sistema

| Tipo de Usuario | Descripción | Funciones |
|-----------------|-------------|-----------|
| **Paciente** | Persona que acude al laboratorio | Escanea código de barras, visualiza cola |
| **Operador de Escaneo** | Personal que asiste en el registro | Ayuda con el escaneo, verifica datos |
| **Personal de Laboratorio** | Técnicos y profesionales del lab | Llama pacientes, gestiona cola |
| **Administrador** | Responsable del sistema | Configuración, monitoreo, soporte |

---

## 3. Arquitectura del Sistema

### 3.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIOS                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ Paciente │    │ Operador │    │ Personal │                  │
│  └─────┬────┘    └─────┬────┘    └─────┬────┘                  │
└────────┼───────────────┼───────────────┼────────────────────────┘
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────▼────────────────┐
         │    NAVEGADOR WEB (Cliente)      │
         │  - React/Next.js Frontend       │
         │  - WebSocket Client             │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │   SERVIDOR LabNumerator         │
         │  ┌──────────────────────────┐  │
         │  │  Next.js Server (API)    │  │
         │  ├──────────────────────────┤  │
         │  │  WebSocket Server        │  │
         │  │  (Socket.io)             │  │
         │  ├──────────────────────────┤  │
         │  │  SOAP Client             │  │
         │  └────────┬────────┬────────┘  │
         └───────────┼────────┼───────────┘
                     │        │
         ┌───────────▼────┐   │
         │  GXSalud SOAP  │   │
         │  Service       │   │
         │  (ae89:8086)   │   │
         └────────────────┘   │
                              │
              ┌───────────────▼───────────┐
              │  Docker Container         │
              │  - Node.js 18.18          │
              │  - Puerto 3000            │
              └───────────────────────────┘
```

### 3.2 Componentes del Sistema

#### 3.2.1 Frontend (Cliente)

**Tecnología:** React con Next.js 14

**Páginas Principales:**

1. **`/scan`** - Estación de Escaneo
   - Captura de código de barras
   - Interfaz de lector manual
   - Feedback visual de validación

2. **`/display`** - Pantalla de Visualización
   - Cola de espera en tiempo real
   - Separación por sectores
   - Animaciones de actualización

3. **`/lab`** - Panel de Control del Laboratorio
   - Gestión de cola
   - Llamado de pacientes
   - Marcado de completados

4. **`/`** - Página Principal
   - Dashboard de bienvenida
   - Acceso rápido a todas las secciones

#### 3.2.2 Backend (Servidor)

**Tecnología:** Next.js API Routes + Socket.io

**APIs Principales:**

- **POST `/api/validate`** - Valida código de barras con SOAP
- **GET `/api/queue/state`** - Obtiene estado actual de la cola
- **GET `/api/queue/sectors`** - Lista sectores disponibles
- **POST `/api/queue/next`** - Llama siguiente paciente
- **WebSocket `/api/socket`** - Comunicación en tiempo real

#### 3.2.3 Integración SOAP

**Servicio:** GXSalud Web Service (labwbs01)

**Funciones:**
- Validación de códigos de barras
- Consulta de datos del paciente
- Verificación de turnos vigentes

### 3.3 Flujo de Datos

1. **Paciente escanea código** → Frontend captura
2. **Frontend envía a API** → `/api/validate`
3. **Servidor valida con SOAP** → GXSalud
4. **SOAP retorna datos** → Paciente + Sector
5. **Servidor agrega a cola** → Store en memoria
6. **WebSocket notifica** → Todas las pantallas
7. **Interfaces actualizan** → Visualización sincronizada

---

## 4. Funcionalidades

### 4.1 Registro de Pacientes

**Descripción:** Los pacientes registran su llegada escaneando el código de barras de su orden.

**Proceso:**
1. Paciente acerca código de barras al lector
2. Sistema valida con GXSalud
3. Verifica turno vigente
4. Asigna número en cola del sector correspondiente
5. Muestra confirmación en pantalla

**Validaciones:**
- ✅ Código existe en GXSalud
- ✅ Turno no vencido (dentro de horario)
- ✅ No está duplicado en la cola
- ✅ Sector asignado existe

**Tiempos:** < 2 segundos promedio

### 4.2 Visualización de Cola

**Descripción:** Pantallas muestran la cola de espera en tiempo real, separada por sectores.

**Información Mostrada:**
- Número de turno
- Nombre del paciente
- Sector asignado
- Tiempo en cola

**Características:**
- Actualización automática (WebSocket)
- Vista por sector o global
- Resaltado de próximo a atender
- Animaciones suaves

### 4.3 Gestión de Cola (Panel de Laboratorio)

**Descripción:** Personal del laboratorio gestiona el flujo de atención.

**Acciones Disponibles:**

1. **Llamar Siguiente**
   - Avanza al siguiente paciente
   - Notificación visual y sonora
   - Registro de hora de llamado

2. **Marcar Completado**
   - Remueve paciente de cola
   - Actualiza estadísticas
   - Libera espacio en lista

3. **Ver Estado Global**
   - Total de pacientes esperando
   - Distribución por sector
   - Tiempo promedio de espera

### 4.4 Sincronización en Tiempo Real

**Tecnología:** WebSockets (Socket.io)

**Eventos Sincronizados:**
- Nuevo paciente registrado
- Paciente llamado
- Paciente completado
- Cambios en el orden de la cola

**Garantías:**
- Latencia < 100ms
- Reconexión automática
- Estado consistente en todas las pantallas

---

## 5. Flujos de Trabajo

### 5.1 Flujo de Registro de Paciente

```
INICIO
  │
  ├─► Paciente llega con orden de laboratorio
  │
  ├─► Acerca código de barras al lector
  │     │
  │     ├─► Sistema captura código
  │     │
  │     ├─► Envía a servidor para validación
  │     │
  │     ├─► Servidor consulta GXSalud via SOAP
  │     │     │
  │     │     ├─► ¿Código válido?
  │     │     │     │
  │     │     │     ├─► NO → Muestra error
  │     │     │     │           │
  │     │     │     │           └─► FIN
  │     │     │     │
  │     │     │     └─► SÍ
  │     │     │           │
  │     │     │           ├─► ¿Turno vigente?
  │     │     │           │     │
  │     │     │           │     ├─► NO → Error "Turno vencido"
  │     │     │           │     │           │
  │     │     │           │     │           └─► FIN
  │     │     │           │     │
  │     │     │           │     └─► SÍ
  │     │     │           │           │
  │     │     │           │           ├─► ¿Ya en cola?
  │     │     │           │           │     │
  │     │     │           │           │     ├─► SÍ → Error "Ya registrado"
  │     │     │           │           │     │           │
  │     │     │           │           │     │           └─► FIN
  │     │     │           │           │     │
  │     │     │           │           │     └─► NO
  │     │     │           │           │           │
  │     │     │           │           │           ├─► Agrega a cola
  │     │     │           │           │           │
  │     │     │           │           │           ├─► Asigna número
  │     │     │           │           │           │
  │     │     │           │           │           ├─► Notifica WebSocket
  │     │     │           │           │           │
  │     │     │           │           │           └─► Muestra confirmación
  │     │     │           │           │                     │
FIN ◄─────────────────────────────────────────────────────┘
```

### 5.2 Flujo de Atención en Laboratorio

```
INICIO (Personal en Panel de Laboratorio)
  │
  ├─► Ve lista de pacientes en espera
  │
  ├─► Selecciona "Llamar Siguiente"
  │     │
  │     ├─► Sistema marca paciente como "Llamado"
  │     │
  │     ├─► Actualiza pantallas de visualización
  │     │     │
  │     │     └─► Resalta nombre del paciente
  │     │
  │     ├─► Personal atiende al paciente
  │     │
  │     ├─► ¿Atención completada?
  │     │     │
  │     │     ├─► SÍ → Marca como "Completado"
  │     │     │           │
  │     │     │           ├─► Remueve de cola
  │     │     │           │
  │     │     │           └─► Actualiza estadísticas
  │     │     │
  │     │     └─► NO → Paciente regresa a cola
  │     │               │
  │     │               └─► Marca como "Pendiente"
  │     │
FIN ◄─┘
```

### 5.3 Flujo de Sincronización WebSocket

```
EVENTO (Cambio en Cola)
  │
  ├─► Servidor emite evento WebSocket
  │     │
  │     ├─► Broadcast a todos los clientes conectados
  │     │     │
  │     │     ├─► Pantallas de Visualización
  │     │     │     │
  │     │     │     └─► Actualiza lista mostrada
  │     │     │
  │     │     ├─► Panel de Laboratorio
  │     │     │     │
  │     │     │     └─► Actualiza controles
  │     │     │
  │     │     └─► Estación de Escaneo
  │     │           │
  │     │           └─► Actualiza contador
  │     │
  │     └─► Clientes aplican cambio
  │           │
  │           ├─► Actualizan UI
  │           │
  │           └─► Mantienen sincronización
  │
FIN
```

---

## 6. Tecnologías Utilizadas

### 6.1 Stack Tecnológico

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| **Framework Frontend** | Next.js | 14.2.5 | Aplicación React con SSR |
| **Lenguaje** | TypeScript | 5.5.4 | Tipado estático |
| **UI Library** | React | 18.3.1 | Componentes de interfaz |
| **Comunicación Real-time** | Socket.io | 4.7.2 | WebSockets bidireccionales |
| **HTTP Client** | Axios | 1.7.2 | Peticiones SOAP/REST |
| **XML Parser** | fast-xml-parser | 4.3.5 | Parseo de respuestas SOAP |
| **State Management** | Zustand | 4.5.4 | Gestión de estado global |
| **Date Handling** | date-fns | 3.6.0 | Manipulación de fechas |
| **Runtime** | Node.js | 18.18.0 | Servidor JavaScript |
| **Containerización** | Docker | 19.03.4+ | Empaquetado de aplicación |
| **Process Manager** | PM2 | (opcional) | Gestión de procesos |

### 6.2 Protocolo SOAP

**Servicio:** GXSalud Web Service  
**Endpoint:** `http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01`  
**Método:** `labwbs01.Execute`  
**Autenticación:** HTTP Basic Authentication

**Request Example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:gxs="GXSalud">
   <soapenv:Header/>
   <soapenv:Body>
      <gxs:labwbs01.Execute>
         <gxs:Labosnro>110007938</gxs:Labosnro>
      </gxs:labwbs01.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

**Response Example:**
```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP-ENV:Body>
      <labwbs01.ExecuteResponse xmlns="GXSalud">
         <Error>N</Error>
         <Nombre>VESPA AMATI JUAN</Nombre>
         <Sector>151</Sector>
         <Secdescripcion>SECTOR A</Secdescripcion>
         <Horafinal>2025-10-22T18:30:00</Horafinal>
      </labwbs01.ExecuteResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

### 6.3 Arquitectura de Despliegue

**Opción Implementada:** Docker Container

**Características:**
- Imagen base: `node:18.18.0-slim`
- Build multi-etapa (deps → builder → runner)
- Puerto expuesto: 3000
- Volúmenes: Ninguno (stateless)
- Red: Bridge network personalizada

**Servidor de Producción:**
- OS: CentOS/RHEL
- IP: 172.20.50.136
- Docker: 19.03.4
- Jenkins: 2.87 (CI/CD)

---

## 7. Configuración y Despliegue

### 7.1 Variables de Entorno

| Variable | Descripción | Ejemplo | Requerida |
|----------|-------------|---------|-----------|
| `SOAP_URL` | URL del servicio SOAP | `http://ae89:8086/...` | ✅ Sí |
| `SOAP_USERNAME` | Usuario para autenticación SOAP | `gxsalud_user` | ✅ Sí |
| `SOAP_PASSWORD` | Contraseña para autenticación SOAP | `password123` | ✅ Sí |
| `USE_PRODUCTION_SOAP` | Usar SOAP real o mock | `true` | ✅ Sí |
| `NODE_ENV` | Entorno de ejecución | `production` | ✅ Sí |
| `PORT` | Puerto del servidor | `3000` | ⭕ No |

### 7.2 Proceso de Despliegue

**Método:** Jenkins CI/CD Automatizado

**Pasos del Pipeline:**

1. **Checkout** - Descarga código desde GitHub
2. **Preparación** - Limpia directorio de despliegue
3. **Transferencia** - Copia archivos via SCP
4. **Build** - Construye imagen Docker
5. **Deploy** - Levanta contenedor con docker-compose
6. **Health Check** - Verifica que la app responde
7. **Cleanup** - Limpia imágenes antiguas

**Trigger:** Push a rama `main` en GitHub

**Tiempo Promedio:** 3-5 minutos

### 7.3 Configuración en Servidor

**Archivo:** `/home/jenkins/lab-numerator/.env`

```env
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
USE_PRODUCTION_SOAP=true
NODE_ENV=production
PORT=3000
SOAP_USERNAME=usuario_real
SOAP_PASSWORD=contraseña_real
```

**Importante:** Este archivo NO se versiona en Git por seguridad.

### 7.4 Comandos de Gestión

**Ver estado:**
```bash
ssh jenkins@172.20.50.136
cd /home/jenkins/lab-numerator
docker-compose ps
```

**Ver logs:**
```bash
docker-compose logs -f
docker-compose logs --tail 100
```

**Reiniciar:**
```bash
docker-compose restart
```

**Reconstruir:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Liberar espacio:**
```bash
docker system prune -a -f
```

---

## 8. Integración con GXSalud

### 8.1 Descripción del Servicio

GXSalud provee un Web Service SOAP que permite consultar información de pacientes y sus turnos de laboratorio.

**Características:**
- Protocolo: SOAP 1.1
- Transporte: HTTP
- Autenticación: HTTP Basic
- Formato: XML
- Timeout: 10 segundos

### 8.2 Datos Obtenidos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Error` | String (N/S) | Indicador de error |
| `Errdescripcion` | String | Descripción del error si existe |
| `Nombre` | String | Nombre completo del paciente |
| `Cedula` | Number | Cédula de identidad |
| `Digito` | Number | Dígito verificador |
| `Matricula` | Number | Matrícula del socio |
| `Usuario` | Number | ID de historia clínica |
| `Dependencia` | Number | Código de dependencia |
| `Depdescripcion` | String | Nombre de la dependencia |
| `Sector` | Number | ID del sector de laboratorio |
| `Secdescripcion` | String | Nombre del sector |
| `Fecha` | Date | Fecha de la extracción |
| `Horainicial` | DateTime | Hora inicial del turno |
| `Horafinal` | DateTime | Hora final del turno |

### 8.3 Manejo de Errores

| Error | Causa | Acción del Sistema |
|-------|-------|-------------------|
| 401 Unauthorized | Credenciales incorrectas | Muestra error de autenticación |
| 404 Not Found | Código no existe | Muestra "Código no encontrado" |
| Timeout | Servicio lento | Muestra "Servicio no disponible" |
| Error=S | Error de negocio | Muestra descripción del error |
| Turno vencido | Hora actual > HoraFinal | Muestra "Turno vencido" |

### 8.4 Consideraciones de Red

**Resolución de Hostname:**
- El servidor `ae89` debe ser resoluble desde el contenedor Docker
- Alternativas:
  - Entrada en `/etc/hosts` del contenedor
  - DNS corporativo configurado
  - Uso de IP directa

**Firewall:**
- Puerto 8086 debe estar accesible desde el servidor de LabNumerator
- Protocolo: HTTP (no HTTPS)

---

## 9. Guía de Usuario

### 9.1 Estación de Escaneo (`/scan`)

**Para Pacientes:**

1. **Llegue con su orden de laboratorio**
   - Asegúrese de tener el código de barras visible

2. **Acerque el código al lector**
   - Mantenga el papel firme
   - Espere el sonido de confirmación

3. **Verifique sus datos en pantalla**
   - Nombre
   - Sector asignado
   - Número en cola

4. **Diríjase a la sala de espera**
   - Observe las pantallas para ver su turno
   - Estará en el sector indicado

**Entrada Manual (si lector falla):**

1. Haga clic en "Ingresar manualmente"
2. Escriba el número del código de barras
3. Presione Enter o clic en "Validar"

### 9.2 Pantalla de Visualización (`/display`)

**Información Mostrada:**

- **Sección Superior:** Próximos a atender
  - Los 3 primeros pacientes de cada sector
  - Resaltado en color por sector

- **Sección Lateral:** Estadísticas
  - Total en espera
  - Pacientes por sector
  - Tiempo promedio

**Actualización:**
- Automática (no requiere recargar)
- Transiciones suaves
- Sonido opcional al llamar paciente

### 9.3 Panel de Laboratorio (`/lab`)

**Para Personal del Laboratorio:**

**Vista Principal:**
- Lista completa de pacientes en espera
- Separación por sectores (pestañas)
- Información de cada paciente

**Llamar Siguiente Paciente:**

1. Seleccione el sector correspondiente
2. Haga clic en "Llamar Siguiente"
3. El sistema:
   - Resalta el paciente en pantallas
   - Emite notificación sonora (opcional)
   - Marca como "En atención"

**Completar Atención:**

1. Después de atender al paciente
2. Haga clic en "Completar"
3. El paciente sale de la cola
4. El siguiente avanza automáticamente

**Gestión de Excepciones:**

- **Paciente no se presenta:** Botón "Saltear" para pasar al siguiente
- **Paciente debe esperar:** Botón "Volver a cola" para reposicionar
- **Urgencia:** Botón "Priorizar" para adelantar

### 9.4 Configuración de Pantallas

**Recomendaciones de Visualización:**

1. **Estación de Escaneo:**
   - Monitor táctil o tradicional
   - Resolución mínima: 1280x720
   - Con lector de código de barras USB

2. **Pantallas de Visualización:**
   - TV o monitor grande (32"+ recomendado)
   - Modo pantalla completa (F11)
   - Resolución: 1920x1080 o superior

3. **Panel de Laboratorio:**
   - Computadora del personal
   - Pantalla tradicional
   - Con mouse/teclado

---

## 10. Mantenimiento y Soporte

### 10.1 Monitoreo del Sistema

**Indicadores de Salud:**

| Métrica | Normal | Advertencia | Crítico |
|---------|--------|-------------|---------|
| Tiempo de respuesta SOAP | < 500ms | 500ms - 2s | > 2s |
| Uso de CPU | < 50% | 50-80% | > 80% |
| Uso de memoria | < 512MB | 512MB - 1GB | > 1GB |
| Conexiones WebSocket | Activas | Reconectando | Desconectadas |

**Comandos de Monitoreo:**

```bash
# Ver estado del contenedor
docker-compose ps

# Ver uso de recursos
docker stats lab-numerator

# Ver logs en tiempo real
docker-compose logs -f

# Ver últimas 100 líneas de logs
docker-compose logs --tail 100
```

### 10.2 Problemas Comunes y Soluciones

#### Problema: "Servicio SOAP no disponible"

**Causas Posibles:**
- Servicio GXSalud caído
- Problemas de red
- Firewall bloqueando puerto 8086

**Diagnóstico:**
```bash
# Desde el servidor
docker-compose exec lab-numerator sh
ping ae89
telnet ae89 8086
```

**Solución:**
1. Verificar estado de GXSalud con IT
2. Revisar conectividad de red
3. Verificar reglas de firewall

#### Problema: "Error 401 - No Autorizado"

**Causas:**
- Credenciales SOAP incorrectas
- Credenciales expiradas

**Solución:**
1. Verificar usuario/contraseña en `.env`
2. Contactar administrador de GXSalud
3. Actualizar credenciales y reiniciar

#### Problema: "Pantallas no se actualizan"

**Causas:**
- WebSocket desconectado
- Problema de red
- Navegador en modo suspensión

**Solución:**
1. Refrescar página (F5)
2. Verificar consola del navegador (F12)
3. Reiniciar navegador si persiste

#### Problema: "Lector de código de barras no funciona"

**Causas:**
- Lector no conectado
- Driver no instalado
- Configuración incorrecta

**Solución:**
1. Verificar conexión USB
2. Probar en aplicación de texto (debe escribir)
3. Usar entrada manual temporalmente
4. Contactar soporte técnico

### 10.3 Respaldos y Recuperación

**Datos a Respaldar:**

1. **Archivo de configuración:**
   - `/home/jenkins/lab-numerator/.env`
   - Frecuencia: Después de cada cambio

2. **Logs de aplicación:**
   - Ubicación: `/home/jenkins/lab-numerator/logs/`
   - Retención: 30 días

**Procedimiento de Respaldo:**

```bash
# Respaldar configuración
cp /home/jenkins/lab-numerator/.env ~/backups/env.$(date +%Y%m%d).backup

# Respaldar logs
tar -czf ~/backups/logs.$(date +%Y%m%d).tar.gz /home/jenkins/lab-numerator/logs/
```

**Recuperación ante Desastres:**

1. Contenedor no inicia:
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose up -d
   ```

2. Aplicación con errores:
   ```bash
   # Volver a versión anterior
   cd /home/jenkins/lab-numerator
   git log --oneline  # Ver commits
   git checkout <commit-anterior>
   docker-compose up -d --build
   ```

3. Pérdida total:
   - Reinstalar desde Jenkins
   - Restaurar archivo `.env` desde respaldo
   - Ejecutar build en Jenkins

### 10.4 Actualizaciones

**Proceso de Actualización:**

1. **Desarrollo:**
   - Desarrollador hace cambios en código
   - Commit a rama de desarrollo
   - Pull request a rama `main`

2. **Revisión:**
   - Code review
   - Testing en ambiente de desarrollo
   - Aprobación de PR

3. **Despliegue:**
   - Merge a `main`
   - Jenkins detecta cambio
   - Deploy automático
   - Verificación de health check

**Rollback:**

Si una actualización falla:

```bash
# En Jenkins
# Buscar último build exitoso
# Click en "Rebuild"

# O manual en servidor:
cd /home/jenkins/lab-numerator
git checkout <commit-anterior-estable>
docker-compose up -d --build
```

### 10.5 Contactos de Soporte

| Componente | Responsable | Contacto |
|------------|-------------|----------|
| **Aplicación LabNumerator** | Equipo Desarrollo Infigo | desarrollo@infigo.com |
| **Servicio SOAP GXSalud** | Administrador GXSalud | soporte.gxsalud@hospital.com |
| **Infraestructura/Servidor** | IT Hospitalario | it@hospital.com |
| **Jenkins CI/CD** | DevOps Infigo | devops@infigo.com |
| **Red y Conectividad** | Redes Hospital | redes@hospital.com |

### 10.6 Registro de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2025-10-22 | - Versión inicial<br>- Integración con GXSalud<br>- WebSocket para tiempo real<br>- Deploy con Docker<br>- Autenticación HTTP Basic |

---

## Apéndices

### A. Glosario de Términos

| Término | Definición |
|---------|------------|
| **SOAP** | Simple Object Access Protocol - Protocolo para intercambio de mensajes XML |
| **WebSocket** | Protocolo para comunicación bidireccional en tiempo real |
| **Docker** | Plataforma de containerización de aplicaciones |
| **Jenkins** | Servidor de automatización para CI/CD |
| **Next.js** | Framework de React para aplicaciones web |
| **API REST** | Application Programming Interface basado en HTTP |
| **Health Check** | Verificación automática del estado de la aplicación |

### B. Referencias

- Next.js Documentation: https://nextjs.org/docs
- Socket.io Documentation: https://socket.io/docs
- Docker Documentation: https://docs.docker.com
- GXSalud SOAP API: Documentación interna

### C. Historial de Versiones del Documento

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2025-10-22 | Equipo Desarrollo | Documento inicial |

---

**Fin del Documento**

---

*Este documento es propiedad de Infigo Teleasistencia y contiene información confidencial. Su distribución está restringida al personal autorizado.*

