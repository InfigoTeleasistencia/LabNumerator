# Configuración de Audio en Pantallas de Sala de Espera

## Problema

Los navegadores modernos bloquean la reproducción de audio si no hubo interacción del usuario (click, tap, tecla). Como las mini PCs no tienen teclado ni mouse, es necesario agregar un flag al acceso directo de Chrome para desactivar esta restricción.

## Solución

Modificar el acceso directo de Chrome que está en la carpeta de inicio de Windows (`shell:startup`).

### Pasos

1. En la mini PC, presionar `Win + R`
2. Escribir `shell:startup` y presionar Enter
3. Click derecho sobre el acceso directo de Chrome > **Propiedades**
4. En el campo **Destino**, agregar el flag `--autoplay-policy=no-user-gesture-required` después de `chrome.exe"` y antes de la URL

**Ejemplo - Si el destino actual es:**

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://SERVIDOR:PUERTO/display
```

**Debe quedar:**

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --autoplay-policy=no-user-gesture-required --kiosk http://SERVIDOR:PUERTO/display
```

5. Click en **Aceptar**
6. Reiniciar la PC para verificar

> El flag funciona igual en Chrome y en Edge (ambos usan Chromium).

### Importante

El flag **solo aplica si no hay otra instancia de Chrome corriendo**. Si Chrome ya estaba abierto (incluso en background), el flag se ignora. Si esto ocurre, se puede reemplazar el acceso directo por un archivo `.bat` en la misma carpeta `shell:startup` con este contenido:

```bat
@echo off
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --autoplay-policy=no-user-gesture-required --kiosk http://SERVIDOR:PUERTO/display
```

## Verificar que funciona

1. Conectar temporalmente un teclado a la mini PC
2. Presionar `F12` para abrir la consola de desarrollador > pestaña **Console**
3. Buscar el mensaje:
   - `🔊 [Display] AudioContext inicializado, estado: running` --> Audio OK
   - `⚠️ [Display] AudioContext suspendido...` --> El flag no se aplicó, revisar el acceso directo
