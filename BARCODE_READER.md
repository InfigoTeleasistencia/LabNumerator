# 🔍 Guía del Lector de Códigos de Barras

## Union UN-BR60

Este documento explica cómo funciona el lector Union UN-BR60 y cómo se integra con la aplicación.

## 🔌 Especificaciones Técnicas

- **Modelo**: Union UN-BR60
- **Conexión**: USB
- **Modo**: HID (Human Interface Device)
- **Función**: Emula un teclado USB
- **Compatibilidad**: Windows, macOS, Linux (sin drivers)

## 💡 Cómo Funciona

### Principio de Operación

El lector UN-BR60 funciona como un **teclado USB**:

1. Escaneas un código de barras
2. El lector "escribe" el contenido en el campo activo
3. Automáticamente presiona `Enter` al finalizar

Es como si alguien escribiera el código muy rápido y presionara Enter.

### Ejemplo Práctico

```
Código escaneado: LAB001

Lo que hace el lector:
1. Presiona tecla 'L'
2. Presiona tecla 'A'
3. Presiona tecla 'B'
4. Presiona tecla '0'
5. Presiona tecla '0'
6. Presiona tecla '1'
7. Presiona tecla 'Enter' ⏎
```

## 🔧 Configuración

### 1. Instalación Física

1. Conecta el lector al puerto USB
2. Espera a que el sistema lo reconozca (1-2 segundos)
3. El LED del lector debe encenderse
4. ¡Listo! No necesita drivers

### 2. Verificación

Para verificar que funciona:

1. Abre un editor de texto (Notepad, TextEdit, etc.)
2. Escanea un código de barras
3. Deberías ver el código escrito en el editor

Si esto funciona, ¡el lector está listo!

## 💻 Integración con la Aplicación

### Hook Personalizado: useBarcodeScanner

La aplicación incluye un hook React que captura los escaneos:

```typescript
const { isScanning } = useBarcodeScanner({
  onScan: (code) => {
    console.log('Código escaneado:', code);
    // Tu lógica aquí
  },
  minLength: 4,    // Mínimo 4 caracteres
  timeout: 100,    // 100ms entre caracteres
});
```

### Características del Hook

- **Detección automática**: No necesitas enfocar un input específico
- **Buffer inteligente**: Agrupa caracteres rápidos en un solo código
- **Enter como delimitador**: Procesa cuando detecta Enter
- **Timeout**: Si pasan >100ms entre caracteres, limpia el buffer

### Flujo Técnico

```
Usuario escanea
    │
    ▼
Lector envía: L-A-B-0-0-1-Enter (muy rápido, <100ms)
    │
    ▼
Hook captura cada keypress
    │
    ▼
Buffer: "LAB001"
    │
    ▼
Detecta Enter → onScan("LAB001")
    │
    ▼
Validación contra API
```

## ⚙️ Configuraciones Avanzadas

### Cambiar Sufijo (Enter)

Algunos lectores permiten configurar qué tecla envían al final:

- **Enter** (default): `\n` o `\r\n`
- **Tab**: `\t`
- **Ninguno**: Solo el código

Para esta aplicación, recomendamos **Enter**.

### Configurar mediante Códigos Especiales

El UN-BR60 puede configurarse escaneando códigos especiales del manual:

- Habilitar/deshabilitar Enter
- Cambiar delay entre caracteres
- Agregar prefijo/sufijo
- Modo mayúsculas/minúsculas

**Recomendación**: Usar configuración por defecto.

## 🐛 Solución de Problemas

### El lector no escanea

**Síntomas**: Nada pasa al escanear

**Causas posibles**:
- Lector no está conectado
- LED apagado
- USB sin energía

**Soluciones**:
1. Verifica conexión USB
2. Prueba otro puerto USB
3. Verifica LED encendido
4. Prueba en un editor de texto simple

### Escanea pero la app no detecta

**Síntomas**: Funciona en Notepad, pero no en la app

**Causas posibles**:
- Página `/scan` no está en foco
- JavaScript bloqueado
- Hook no inicializado

**Soluciones**:
1. Haz clic en la página `/scan`
2. Verifica consola del navegador
3. Recarga la página

### Caracteres se pierden

**Síntomas**: Código incompleto (ej: "LA01" en vez de "LAB001")

**Causas posibles**:
- Computadora muy lenta
- Lector muy rápido
- Buffer overflow

**Soluciones**:
1. Aumenta `timeout` en `useBarcodeScanner`
2. Escanea más despacio
3. Usa un input dedicado con `data-barcode-input`

### Caracteres duplicados

**Síntomas**: Código repetido (ej: "LAB001LAB001")

**Causas posibles**:
- Múltiples handlers escuchando
- Escaneo doble

**Soluciones**:
1. Asegúrate de tener un solo `useBarcodeScanner`
2. Evita escanear dos veces rápido

## 🎯 Mejores Prácticas

### 1. Códigos de Barras Óptimos

- **Formato**: CODE128, EAN-13, o similar
- **Longitud**: 6-20 caracteres
- **Caracteres**: Alfanuméricos (A-Z, 0-9)
- **Evita**: Espacios, caracteres especiales

### 2. Posicionamiento del Lector

- Altura: 10-15 cm del código
- Ángulo: Perpendicular (90°)
- Iluminación: Buena luz, sin reflejos
- Distancia del código: 5-20 cm

### 3. Calidad del Código Impreso

- Resolución: Mínimo 300 DPI
- Contraste: Alto (negro sobre blanco)
- Sin arrugas ni manchas
- Tamaño adecuado (mín. 3x1 cm)

## 📊 Formatos Compatibles

El UN-BR60 soporta múltiples formatos:

| Formato | Compatible | Recomendado |
|---------|-----------|-------------|
| CODE128 | ✅ | ⭐⭐⭐⭐⭐ |
| EAN-13 | ✅ | ⭐⭐⭐⭐ |
| EAN-8 | ✅ | ⭐⭐⭐ |
| UPC-A | ✅ | ⭐⭐⭐⭐ |
| CODE39 | ✅ | ⭐⭐⭐ |
| QR Code | ✅ | ⭐⭐⭐⭐⭐ |

**Recomendación**: CODE128 o QR para máxima flexibilidad.

## 🔗 Recursos Adicionales

### Generar Códigos de Barras

Herramientas online:
- https://barcode.tec-it.com/
- https://www.barcodesinc.com/generator/
- https://www.free-barcode-generator.net/

### Ejemplo de Código

```bash
# Generar códigos de prueba con Python
pip install python-barcode pillow

python
>>> import barcode
>>> from barcode.writer import ImageWriter
>>> CODE128 = barcode.get_barcode_class('code128')
>>> code = CODE128('LAB001', writer=ImageWriter())
>>> code.save('lab001')
```

## 📞 Soporte Técnico

### Union UN-BR60

- **Sitio web**: http://www.unioncorp.cn/
- **Manual**: Incluido en la caja
- **Soporte**: support@unioncorp.cn

### Aplicación

Para problemas con la integración en la app, revisa:
- `/src/hooks/useBarcodeScanner.ts` - Lógica de captura
- `/src/pages/scan.tsx` - Implementación
- Console del navegador - Logs de debug

## ✅ Checklist de Puesta en Marcha

- [ ] Lector conectado y LED encendido
- [ ] Probado en editor de texto
- [ ] Página `/scan` cargada
- [ ] JavaScript habilitado
- [ ] Códigos de barras impresos con buena calidad
- [ ] Iluminación adecuada
- [ ] Distancia correcta al escanear
- [ ] Enter configurado como sufijo
- [ ] Sin caracteres especiales en códigos

---

¡Con esta configuración, tu lector debería funcionar perfectamente! 🎉


