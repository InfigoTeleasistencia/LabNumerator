# Panel de Testing Personalizado

## 🎯 Objetivo

Proporcionar a los testers una herramienta completa para crear pacientes de prueba con datos específicos, permitiendo probar cualquier escenario sin depender de datos aleatorios.

## ✨ Características

### 1. Dos Modos de Testing

#### 🎲 Modo Aleatorio
- Un clic rápido para generar un paciente con datos aleatorios
- Útil para pruebas rápidas y poblar la cola

#### 🧪 Modo Personalizado
- Formulario completo para especificar cada dato
- Perfecto para probar escenarios específicos

## 📋 Campos Editables

### Información Personal
1. **Nombre** - Nombre del paciente
2. **Apellido 1** - Primer apellido
3. **Apellido 2** - Segundo apellido
4. **Cédula** - Número de documento (solo números, 7 dígitos)
5. **Dígito** - Dígito verificador (1 dígito)

### Información del Turno
6. **Hora Inicial** - Inicio del turno (selector de hora)
7. **Hora Final** - Fin del turno (selector de hora)

### Información del Sector
8. **Sector** - Número de sector (ej: 151)
9. **Descripción** - Descripción del sector (ej: SECTOR A)

## 🎨 Ubicación e Interfaz

### Ubicación
- **Esquina inferior derecha** de la pantalla de validación (`/scan`)
- Botones siempre visibles
- Panel que se expande/colapsa

### Botones

```
┌──────────────┬──────────────┐
│ 🎲 Aleatorio │ 🧪 Personalizar │
└──────────────┴──────────────┘
```

**Estados:**
- ✅ Activo: Cuando `status === 'idle'`
- ❌ Deshabilitado: Cuando hay una validación en progreso

### Panel Expandido

```
┌─────────────────────────────────────┐
│ Datos de Prueba Personalizados     │
├─────────────────────────────────────┤
│ Nombre:     [Juan...............]   │
│ Apellido 1: [Pérez..........]      │
│ Apellido 2: [García.........]      │
│ Cédula:     [1234567] Dígito: [8]  │
│ Hora Inicial: [08:00] Final: [10:00]│
│ Sector: [151] Desc: [SECTOR A...]  │
│                                     │
│ [✓ Crear Paciente de Prueba]       │
└─────────────────────────────────────┘
```

**Dimensiones:**
- Ancho: 350px
- Max altura: 500px (con scroll si es necesario)
- Fondo: Blanco semi-transparente (95%)
- Sombra: Prominente para destacar

## 🔄 Flujo de Uso

### Escenario 1: Test Aleatorio Rápido

```
1. Usuario hace clic en "🎲 Aleatorio"
   ↓
2. Sistema genera datos aleatorios:
   - Nombre de lista predefinida
   - Cédula aleatoria
   - Horario aleatorio entre 08:00-16:00
   ↓
3. Paciente se crea inmediatamente
   ↓
4. Animación de validación exitosa
```

**Tiempo total**: ~2 segundos

### Escenario 2: Test Personalizado

```
1. Usuario hace clic en "🧪 Personalizar"
   ↓
2. Panel se expande con formulario
   ↓
3. Usuario modifica los datos deseados
   - Ejemplo: Cambiar turno a 14:00-16:00
   - Ejemplo: Poner cédula específica
   ↓
4. Usuario hace clic en "✓ Crear Paciente de Prueba"
   ↓
5. Panel se cierra automáticamente
   ↓
6. Paciente se crea con datos personalizados
   ↓
7. Animación de validación exitosa
```

**Tiempo total**: Variable (según edición)

## 🧪 Casos de Uso de Testing

### Caso 1: Probar Orden de Turnos

**Objetivo**: Verificar que los pacientes se ordenen correctamente por horario

**Pasos:**
1. Abrir panel personalizado
2. Crear paciente con turno 14:00-16:00
3. Crear paciente con turno 08:00-10:00
4. Crear paciente con turno 10:00-12:00
5. Verificar en `/lab/1` que aparecen en orden: 08:00, 10:00, 14:00

### Caso 2: Probar Cédulas Específicas

**Objetivo**: Verificar visualización correcta de cédulas en display

**Pasos:**
1. Abrir panel personalizado
2. Crear paciente con cédula 1111111-1
3. Crear paciente con cédula 9999999-9
4. Verificar en `/display` que ambas cédulas se ven correctamente

### Caso 3: Probar Nombres Largos

**Objetivo**: Verificar que la UI maneja nombres largos

**Pasos:**
1. Abrir panel personalizado
2. Ingresar nombre: "María Cristina"
3. Ingresar apellidos: "Fernández de la Rosa", "González Martínez"
4. Crear paciente
5. Verificar que el nombre completo se muestra correctamente en `/lab/1`

### Caso 4: Probar Turnos Fuera de Horario

**Objetivo**: Ver cómo el sistema maneja pacientes tarde

**Pasos:**
1. Crear paciente con turno 08:00-10:00 (simular que llegó a las 15:00)
2. Crear paciente con turno 16:00-18:00 (en su horario)
3. Verificar que el de 08:00 aparece primero en la cola

### Caso 5: Probar Múltiples Sectores

**Objetivo**: Verificar funcionamiento con diferentes sectores

**Pasos:**
1. Crear paciente en sector 151
2. Cambiar sector a 152 y crear otro
3. Verificar que se crean en sectores separados

## 💡 Validaciones y Restricciones

### Campos con Validación Automática

**Cédula:**
- Solo acepta números
- Máximo 7 dígitos
- Se auto-limpia de caracteres no numéricos

**Dígito:**
- Solo acepta números
- Máximo 1 dígito
- Se auto-limpia de caracteres no numéricos

**Horarios:**
- Input type="time" nativo del navegador
- Formato HH:MM automático
- Validación de formato incluida

### Valores por Defecto

```javascript
{
  nombre: 'Juan',
  apellido1: 'Pérez',
  apellido2: 'García',
  cedula: '1234567',
  digito: '8',
  horaInicial: '08:00',
  horaFinal: '10:00',
  sector: '151',
  sectorDescripcion: 'SECTOR A',
}
```

**Beneficios:**
- Formulario pre-poblado
- Solo se edita lo necesario
- Valores realistas y válidos

## 🎨 Estilos y UX

### Estados Visuales

**Botones Activos:**
- Color: Blanco semi-transparente
- Hover: Más opaco y brillante
- Cursor: Pointer
- Transición suave

**Botones Deshabilitados:**
- Color: Blanco muy tenue
- Cursor: Not-allowed
- Sin interactividad

**Panel Expandido:**
- Animación suave de entrada
- Fondo claro para contraste
- Inputs con borde claro
- Labels pequeños pero legibles
- Botón de submit destacado en rojo

### Responsividad

**Panel:**
- Ancho fijo: 350px
- Se adapta verticalmente
- Scroll interno si contenido excede 500px
- Sombra que lo destaca del fondo

**Inputs:**
- Width: 100% de su contenedor
- Padding consistente
- Border radius suave
- Focus states nativos

## 🔧 Código Relevante

### Estado del Formulario

```typescript
const [testFormData, setTestFormData] = useState({
  nombre: 'Juan',
  apellido1: 'Pérez',
  apellido2: 'García',
  cedula: '1234567',
  digito: '8',
  horaInicial: '08:00',
  horaFinal: '10:00',
  sector: '151',
  sectorDescripcion: 'SECTOR A',
});
```

### Actualización de Campo

```typescript
onChange={(e) => setTestFormData({ 
  ...testFormData, 
  cedula: e.target.value.replace(/\D/g, '') 
})}
```

**Características:**
- Spread operator para mantener otros campos
- `.replace(/\D/g, '')` elimina no-números
- Actualización inmediata

### Envío Personalizado

```typescript
const handleCustomTestScan = async () => {
  const testData = {
    code: `TEST${Date.now()}`,
    name: `${testFormData.nombre} ${testFormData.apellido1} ${testFormData.apellido2}`,
    cedula: parseInt(testFormData.cedula),
    digito: parseInt(testFormData.digito),
    // ... más campos
  };
  
  await handleScan(testData.code, testData);
  setShowTestPanel(false); // Cerrar panel
};
```

## 📊 Comparación: Antes vs Después

### Antes

```
Solo botón "Test Scan"
├─ Datos completamente aleatorios
├─ No se puede especificar turno
├─ No se puede especificar cédula
└─ Difícil probar escenarios específicos
```

**Limitaciones:**
- ❌ No se podía probar cédulas específicas
- ❌ No se podía probar orden de turnos
- ❌ No se podía probar nombres específicos
- ❌ Dependencia del azar

### Después

```
Dos botones + Panel
├─ 🎲 Aleatorio: Para pruebas rápidas
└─ 🧪 Personalizar: Para casos específicos
    ├─ Control total sobre datos
    ├─ Valores por defecto útiles
    ├─ Validación automática
    └─ UI intuitiva
```

**Ventajas:**
- ✅ Probar cualquier escenario
- ✅ Reproducir bugs específicos
- ✅ Testing sistemático
- ✅ Documentación de casos de prueba

## 📝 Notas para Testers

### Tips de Uso

1. **Para pruebas rápidas**: Usa "Aleatorio"
2. **Para casos específicos**: Usa "Personalizar"
3. **Panel se cierra automáticamente** al crear paciente
4. **Datos persisten** mientras el panel está abierto
5. **ESC no cierra el panel** - usar botón "Cerrar"

### Escenarios Recomendados

**Testing de Orden:**
```
Paciente 1: 14:00-16:00
Paciente 2: 08:00-10:00
Paciente 3: 10:00-12:00
Resultado esperado: 2, 3, 1
```

**Testing de Bordes:**
```
Cédula: 9999999-9 (máximo)
Cédula: 1000000-0 (mínimo)
Turno: 00:00-02:00 (madrugada)
Turno: 22:00-23:59 (noche)
```

**Testing de Nombres:**
```
Nombre corto: "A B C"
Nombre largo: "María Cristina Fernández..."
Nombre con caracteres especiales: "José María O'Brien"
```

## 🐛 Debugging

### Panel no aparece

**Verificar:**
- ¿Status está en 'idle'?
- ¿Hiciste clic en "Personalizar"?

**Solución:**
- Esperar que termine cualquier validación en curso
- Refrescar la página

### Datos no se guardan

**Causa:**
- El estado se resetea al cerrar/abrir el panel

**Solución:**
- Llenar todos los datos antes de cerrar
- O simplemente editar y crear inmediatamente

### Horarios no se aceptan

**Verificar:**
- El navegador soporta input type="time"
- El formato es HH:MM

**Solución:**
- Usar navegador moderno (Chrome, Firefox, Edge)
- Formato 24 horas: 14:00, no 2:00 PM

## ✅ Checklist de Testing

- [ ] Botón "Aleatorio" funciona
- [ ] Botón "Personalizar" abre el panel
- [ ] Todos los campos son editables
- [ ] Cédula solo acepta números
- [ ] Dígito solo acepta 1 número
- [ ] Horarios usan selector nativo
- [ ] Botón "Crear" funciona
- [ ] Panel se cierra después de crear
- [ ] Paciente aparece en `/lab`
- [ ] Datos personalizados se respetan
- [ ] Orden por turno funciona correctamente

## 🎉 Resumen

El panel de testing personalizado transforma la experiencia de testing, permitiendo:

✅ **Control Total** - Cada campo es editable
✅ **Flexibilidad** - Dos modos: rápido y personalizado  
✅ **Productividad** - Valores por defecto inteligentes
✅ **Confiabilidad** - Validación automática de inputs
✅ **Reproducibilidad** - Probar escenarios específicos una y otra vez

¡Ahora puedes probar cualquier escenario imaginable! 🚀

