# Calculator App - Expo

Esta es una aplicación de calculadora moderna construida con [Expo](https://expo.dev) y React Native.

## Características

- Lógica matemática completa (Suma, Resta, Multiplicación, División).
- Interfaz oscura elegante.
- Retroalimentación háptica al presionar botones.
- Diseño responsivo que se ajusta al contenido.

## Glosario de Componentes y Conceptos

### Operador Spread (...)
El operador spread (...) permite copiar, combinar o expandir elementos de arrays u objetos. Es una forma limpia y concisa de manipular estructuras de datos inmutables, lo cual es clave en TypeScript y frameworks modernos.

En este proyecto, lo utilizamos para expandir estilos:
```tsx
style={{
    ...globalStyles.buttonText,
    color: blackText ? 'black' : 'white',
}}
```

### Haptics.selectionAsync()
Ejecuta una vibración corta (haptic feedback) en el dispositivo, simulando una pequeña respuesta táctil cuando el usuario presiona el botón. Esto mejora la experiencia de usuario al dar una sensación física al interactuar con la interfaz.

## Instalación

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Inicia la aplicación:
   ```bash
   npx expo start
   ```
