# ⚡ Inicio Rápido - 5 Minutos

## 🚀 Instalación y Arranque

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:3000 en tu navegador.

## 🎯 Prueba Rápida (Sin Lector)

### Opción 1: Usando el Teclado

1. Ve a http://localhost:3000/scan
2. Escribe cualquiera de estos códigos:
   - `LAB001`
   - `LAB002`
   - `LAB003`
3. Presiona `Enter`
4. ¡Deberías ver el código validado!

### Opción 2: Flujo Completo

**Terminal 1**: Abre http://localhost:3000/scan (Validación)
**Terminal 2**: Abre http://localhost:3000/display (Pantalla de espera)
**Terminal 3**: Abre http://localhost:3000/lab (Laboratorista)

1. En `/scan`: Escanea código `LAB001` + Enter
2. En `/display`: Verás el paciente en la cola
3. En `/lab`: Presiona "Llamar Siguiente"
4. En `/display`: Verás el paciente actual actualizado

## 🔌 Con Lector Union UN-BR60

1. Conecta el lector USB
2. Ve a http://localhost:3000/scan
3. Escanea un código de barras
4. ¡Funciona automáticamente!

## 📝 Códigos de Prueba

Mientras estés en modo desarrollo (sin API externa configurada):

```
LAB001 → Juan Pérez
LAB002 → María González
LAB003 → Carlos Rodríguez
LAB004 → Ana Martínez
LAB005 → Luis Sánchez
```

## 🎨 Páginas Disponibles

| URL | Descripción | Para quién |
|-----|-------------|-----------|
| `/` | Página principal | Selección de rol |
| `/scan` | Validación de códigos | Recepción |
| `/display` | Pantalla de atención | Sala de espera |
| `/lab` | Panel de control | Laboratorista |

## 🔧 Configuración de API Externa

Si tienes tu propia API para validar códigos:

1. Copia `.env.local.example` a `.env.local`
2. Configura tu URL y API key
3. Edita `src/lib/externalApi.ts` si es necesario

```env
EXTERNAL_API_URL=https://tu-api.com/validate
EXTERNAL_API_KEY=tu_api_key
```

## 🎯 Escenario de Uso Real

### Setup para un Laboratorio

**1. Computadora de Recepción**
- Lector UN-BR60 conectado
- Navegador en `/scan`
- Pantalla completa (F11)

**2. Pantalla en Sala de Espera**
- TV o monitor grande
- Navegador en `/display`
- Pantalla completa (F11)
- Auto-actualización habilitada

**3. Computadora del Laboratorista**
- Navegador en `/lab`
- Botón grande para llamar siguiente

## 🐛 Problemas Comunes

### "No hay pacientes en espera"
→ Primero agrega pacientes en `/scan`

### "Socket.IO desconectado"
→ Recarga la página

### "Código no válido"
→ Usa los códigos de prueba: LAB001-LAB005

### El lector no funciona
→ Prueba escribir el código manualmente + Enter

## 📱 Para Producción

```bash
# Compilar
npm run build

# Iniciar en producción
npm start
```

## 🎉 ¡Listo!

Tu sistema está funcionando. Para más detalles:
- 📖 [README.md](./README.md) - Documentación completa
- 🔌 [INTEGRATION.md](./INTEGRATION.md) - Integración con API
- 🔍 [BARCODE_READER.md](./BARCODE_READER.md) - Guía del lector

---

**¿Necesitas ayuda?** Revisa la documentación completa en README.md


