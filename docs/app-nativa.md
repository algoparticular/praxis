# Anima nativa (iOS y Android)

Plan para que praxis salga de la PWA y sea una app de iOS y Android, sobre todo para tener cosas nativas: widgets en la pantalla de inicio. Planificado el 27 de noviembre de 2026; todavía no se hizo nada.

## Decisiones tomadas

- **praxis reemplaza a `oraculo`.** `juanmanuelynz/oraculo` era una app aparte en React Native (Expo SDK 54) con una lista de cartas, su detalle, la carta del día y widgets nativos. No tiene nada de lo vivo de praxis (escenas WebGL, juegos, sonido, el mundo de Sid), y rehacerlo en React Native sería reescribirlo todo. Se toma de `oraculo` lo que sirve (los widgets, la carta del día, el plan de publicación) y después se archiva.
- **Capacitor**, no React Native: mete el build de Vite (`dist/`) dentro de una app nativa con proyectos `ios/` y `android/` reales, a los que se suman los widgets. El código de las escenas no cambia.
- **Mismo bundle ID que `oraculo`: `com.algoparticular.anima`.** `oraculo` nunca se publicó (ni en TestFlight), así que no hay una app anterior que actualizar ni una clave de firma que conservar.
- **Dos familias de widgets:** la carta del día (la de `oraculo`, primero) y una del mundo de Sid (ideas a explorar más adelante). El puente hacia los widgets se hace general desde el principio para que la segunda entre sin rehacer nada.
- Hay una Mac para compilar iOS con Xcode.

## Pendiente de revisar

- **Cuenta de Apple Developer:** no se sabe si está activa (developer.apple.com/account). Que sepamos cuesta 99 USD por año; confirmarlo.
- **Cuenta de Google Play Console:** no se sabe si existe. Que sepamos es un pago único de 25 USD; confirmarlo.
- **Sin verificar:** si un Apple ID gratis (equipo personal en Xcode) puede usar App Groups, que es lo que comparte datos con el widget. Creemos que no; confirmarlo antes de probar el widget en un iPhone.
- Otras cosas nativas que puedan interesar (notificaciones, hápticos, algo durante la meditación): sin decidir.

## Fases

### 0. Cuentas
Revisar las dos cuentas de arriba. Sin la de Apple paga se puede avanzar con el simulador.

### 1. Shell nativo
- Sumar Capacitor a praxis (`ios/`, `android/`) con el bundle ID `com.algoparticular.anima`.
- Revisar lo que hoy supone que es una web o una PWA y decidir qué hace dentro de la app:
  - el service worker (`vite-plugin-pwa`, `src/pwa.js`): dentro de la app los archivos ya están en el teléfono;
  - `display-mode: standalone` (`.status-strip` en `App.vue`, `worldResume.js`) y los bordes seguros bajo el reloj;
  - el permiso del giroscopio en iOS (`useTilt.js`);
  - el wake lock del mundo de Sid (`keepAwake` en `LabSid.vue`);
  - el sonido al pasar a segundo plano y al volver;
  - `topColour.js` y el color de la barra;
  - PostHog (`src/analytics.js`) desde la app.
- Ícono y pantalla de inicio a partir de los que ya existen (`public/icon-512.png`, el crema y el navy del manifest).
- Ver si `npm run check` suma algo para el build nativo.

### 2. Carta del día en praxis
- Hoy praxis no tiene carta del día. Portar `getCardOfTheDay` de `oraculo` (`constants/cards.ts`: un hash determinístico por fecha).
- Decidir dónde se ve en la app (a definir).

### 3. Puente hacia los widgets
- Un plugin chico de Capacitor que guarda datos para los widgets: el App Group (`group.com.algoparticular.anima`, `UserDefaults`) en iOS y `SharedPreferences` en Android, y les pide que se redibujen.
- General, con una clave por widget, no atado a la carta del día, para que el del mundo de Sid lea lo suyo (lo que ya guarda `worldMemory.js`).

### 4. Widget de la carta del día en iOS
- Traer `ios/OracleWidget/` de `oraculo` (WidgetKit + SwiftUI, tamaños chico y mediano, se renueva a medianoche, elige idioma por el del sistema). Solo cambia el puente: hoy es un módulo de React Native (`WidgetBridge.swift`, `.m`).
- Deep link `anima://card/:id` que abre la carta en praxis.
- Imágenes del widget a partir de `public/cards/` (en `oraculo`, `assets/cards_widget/`, 800×800).
- Spec de referencia: `docs/specs/widgets.md` de `oraculo`.
- Un widget no puede mostrar WebGL: imagen fija, nombre y afirmación.

### 5. Widget de la carta del día en Android
- Reescribirlo en Kotlin nativo (Glance o RemoteViews): el de `oraculo` usa `react-native-android-widget`, que necesita React Native.
- Los mismos dos tamaños y el mismo diseño que en iOS.

### 6. Publicación
- Retomar `docs/plans/store-submission.md` de `oraculo` (y `docs/store/`: ficha, política de privacidad, cuestionarios).
- Como nunca se publicó, se puede generar una clave de firma de Android nueva (o usar la de Play App Signing); la de `oraculo` (`oraculo-release.keystore`, fuera de git, con contraseña temporal) no hace falta conservarla.
- Riesgo: Apple a veces rechaza apps que son "solo una web". Los widgets, el sonido y que funcione sin red ayudan.

### 7. Cierre
- Archivar `juanmanuelynz/oraculo`.
- Actualizar `CLAUDE.md` y `docs/` de praxis con lo nativo.

### Después
- Explorar ideas para el widget del mundo de Sid.
