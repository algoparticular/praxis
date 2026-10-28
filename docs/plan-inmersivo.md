# Plan: Anima más inmersivo

## Decisiones
- **Stack:** se queda en Vue 3. three.js no depende del framework (se monta en un `<canvas>` desde un composable) y `motion` ya se usa en modo vanilla. Migrar a React no compensa: habría que reescribir router, i18n, PWA y Suspense, sin tests, y el usuario no notaría la diferencia.
- **Datos:** las cartas pasan a ser JSON estático. Antes venían de Airtable; desde ahora `src/data/cards.json` es la fuente de verdad y se edita a mano (ver `docs/editar-cartas.md`). Sin token en el cliente.
- **Alcance:** Anima primero (`/praxis`, `/oracle`, `/oracleTheNine`, `/card/:id`, `/share/:id`), después la landing.

## Pasos
1. **Datos estáticos** — HECHO
   - `scripts/sync-cards.mjs` (ya eliminado) traía las cartas de Airtable a `src/data/cards.json` + `public/cards/`; esa sincronización se hizo por última vez antes de salir de Airtable.
   - `src/data/cards.js`: exporta `deck` y `getCard(id)`.
   - Componentes ya leen datos locales; se quitaron los retrasos artificiales de 2.5–3 s y la dependencia `airtable`.
   - Sync corrido: 33 cartas, imágenes convertidas a webp (19 MB → 8.5 MB). El script usa `sharp` y lee `.env.local`.
2. **Ritual de sacar carta** — HECHO (primera versión, falta pulir el estilo visual) en `/oracle` y `/oracleTheNine`: barajado animado con `motion`, elección, volteo 3D (CSS 3D) y el color de la carta tiñendo la pantalla antes de mostrar el texto.
3. **Transición compartida mazo → carta** — HECHO: la carta tocada vuela hasta ser la ilustración de `/card/:id` (copia fija en el `body` + `motion`, módulo `src/cardTransition.js`; sin depender de la View Transitions API). Reemplaza la tintura de color del paso 2.
4. **three.js** donde aporte. Hero de la landing — HECHO (primera versión): interior de un cuerpo visto por un personaje diminuto, medio acuoso: células con los sprites del hero (pocas grandes, muchas pequeñas de fondo), haces de luz suaves con shader, transición del hero al azul oscuro (#143246) de la sección del oráculo, corrientes lentas con inercia, el cursor arrastra el líquido, partículas en suspensión que orbitan las células; también reacciona al giroscopio y al scroll (`src/composables/useCellField.js`, three cargado bajo demanda: 192 kB gzip en chunk aparte; respaldo con las células estáticas sin WebGL). **The Nine** — HECHO (primera versión): las 9 cartas boca abajo en grilla de 3×3 sobre una alfombra redonda con el cielo de estrellas de fondo (`src/components/CardTable.vue` + `src/composables/useCardTable.js`, three cargado bajo demanda). Se reparten desde el centro; arrastrar gira la mesa con inercia y cambia la elevación (límites), un toque elige. La elegida se une a la cámara, se voltea sobre el eje X de la cámara y se entrega al DOM (clon fijo + `setPendingTransition`) igual que el ritual de `/oracle`. Respaldo a `OracleTemplate` sin WebGL o con `prefers-reduced-motion` (`src/composables/webgl.js`). El mazo completo (`/oracle`) usa la misma mesa con las 33 cartas en abanico en espiral (`layout="spiral"`). La intro de `/praxis` (`Home.vue`) toma el cielo de la sección oráculo de la landing (fondo azul oscuro, estrellas con fugaces, esquinas) y el selector de modo son dos cartas con miniatura (abanico y grilla de 3×3); el texto quedó solo en la intención. Pendiente: medir batería en móvil real.
5. **Landing:** scroll narrativo con `scroll()` de `motion`, cambiando color y ambiente entre secciones. Hecho en el bloque del oráculo: las 4 esquinas aparecen una por una con el scroll, el texto entra escalonado y el hombrecito y el bonsái (ahora separados) entran por su cuenta. La unión hero → oráculo es un solo degradé dentro del oráculo (empieza en el morado del hero) y el cielo continúa dentro de la sección de la frase, apagándose en el violeta. El cielo del oráculo ya no es una imagen: es un canvas (`src/composables/useStarField.js`) con estrellas planas del mismo amarillo de la ilustración que parpadean por pasos, como animación cuadro a cuadro, y una estrella fugaz dibujada cada 4–9 s. Se quitó la sección crema (`#about`, galería + "Navega el Universo"): ahora el scroll pasa del azul oscuro al naranja con la frase (degradé en `#uno`), el hero es más largo y las esquinas aparecen más tarde, repartidas en el scroll. El naranja se aclara con un degradé hasta el footer crema, y el logo (que lleva naranja) pasó al final del footer. Con esto la landing queda cerrada, salvo ajustes de gusto.
6. **Extras** — HECHO (falta probar en un iPhone real):
   - Sonido sintetizado con Web Audio, sin archivos ni licencias (`src/audio/synth.js`, control en `src/composables/useSound.js`): acorde abierto que respira (sol mayor; cada carta suena en su propio acorde, ver `docs/cartas.md`), campanas tipo cuenco en escala pentatónica, gotas de agua, reverberación amplia; efectos de campanitas al elegir carta, giro, barajado, estrella fugaz y toque de botones. Apagado por defecto, con botón fijo abajo a la izquierda (`SoundToggle.vue`); la preferencia se guarda.
   - iOS: el audio arranca solo dentro de un gesto (click/touchend), `navigator.audioSession.type = 'playback'` para que el interruptor de silencio no lo corte (con pista silenciosa como respaldo en iOS antiguos), se reanuda tras interrupciones y hay respaldo a `webkitAudioContext`. La vibración (`navigator.vibrate`) solo funciona en Android; en iOS no existe.
   - Cursor personalizado: una partícula circular con el resplandor de la marca, que es blanca en general, amarilla en la sección del oráculo (atributo `data-cursor="yellow"` en la sección) y naranja sobre superficies claras como el footer; solo con ratón (`CustomCursor.vue`).
   - `prefers-reduced-motion` en toda la app: CSS global, parallax de `vue-kinesis` apagado, sin bucles de JavaScript.

**El mazo** (`/deck`) — HECHO (primera versión): galería de las 33 cartas con el mismo cielo estrellado de la landing, título y filtros por categoría (Todas / Paramis / Regulares / Especiales). En 3D (`src/components/DeckRing.vue` + `src/composables/useDeckRing.js`) las cartas están boca arriba en un anillo: arrastrar, rueda o flechas lo giran y se detiene en la carta más cercana; un toque abre la carta con la misma entrega (`handOffCard` en `src/cardTransition.js`, compartida con las mesas). Un filtro reordena las cartas en un arco. Respaldo 2D (`DeckTemplate.vue`) sin WebGL o con `prefers-reduced-motion`. La galería carga miniaturas de 480 px (`public/cards/thumb/`, 0,9 MB contra 8,7 MB; se generan con `npm run thumbs` y con `sync:cards`).

## Para retomar: The Nine en 3D
Rama: `claude/cool-heisenberg-l4fuyc`. Los pasos 1 a 6 están hechos y la landing está cerrada. Falta solo esto.

**Idea del autor.** Las 9 cartas sobre una mesa en grilla de 3×3. Se puede rotar la mesa arrastrando, y las cartas quedan siempre en el centro. Se ve en `/oracleTheNine`.

**Qué hay hoy y se puede reutilizar**
- `src/views/OracleTheNine.vue`: baraja las 33 cartas, toma 9 y las muestra con `OracleTemplate` (grilla plana de 3×3).
- `src/components/OracleTemplate.vue`: el ritual actual (barajado y reparto, elección, volteo, vuelo a `/card/:id`) con sonidos y vibración.
- `src/cardTransition.js` + `CardTemplate.vue`: la entrega a la página de la carta. Espera una copia fija en el `body` con el rectángulo, el borde y el radio de la carta (ver `handleTakeCard`), y la anima hasta `#illustration`.
- `src/data/cards.js`: `getCard(id)`, con la imagen en `image[0].url`, `color` y `colorAlt`.
- `src/composables/useStarField.js`: el cielo con estrellas y fugaces, reutilizable como fondo.
- `src/composables/useSound.js`: `play('pick' | 'flip' | 'shuffle')` y `vibrate()`.
- `src/composables/useCellField.js`: el patrón a seguir para three.js (carga bajo demanda, respaldo sin WebGL, `prefers-reduced-motion`).

**Diseño propuesto (no implementado)**
- Un composable `useNineTable.js` y un componente `NineTable.vue`, con respaldo a `OracleTemplate` si no hay WebGL.
- Mesa: un disco tipo alfombra, del verde azulado de la ilustración de la landing, con sombras suaves bajo las cartas. Fondo con el cielo de estrellas.
- Cartas: planos con textura de canvas. Dorso azul oscuro con el símbolo y el borde crema. El frente se carga solo al elegir (9 imágenes de unos 250 kB).
- Cámara orbital: arrastrar en horizontal gira la mesa, con inercia, y en vertical cambia la elevación, limitada. Distinguir toque de arrastre (menos de 8 px y menos de 350 ms). Al pasar el puntero, la carta se levanta un poco. `touch-action: none` en el canvas.
- Elección: las demás se desvanecen, la elegida se une a la cámara, se voltea girando sobre el eje X de la cámara y se entrega al DOM calculando su rectángulo, que es proporcional 1:1.2, con borde de 10/512 del ancho y radio de 0.19 del ancho. Después `setPendingTransition` y `router.push`.
- Ajustar la distancia de la cámara según la proporción de la pantalla, para móviles verticales. Con movimiento reducido: sin autorrotación ni animación de entrada.

**Por decidir con el autor:** si las posiciones de las 9 cartas tienen un significado propio, y si las cartas empiezan boca abajo, como hoy.

## Pendientes
- Probar el sonido en un iPhone real, con el interruptor de silencio puesto y quitado.
- Medir batería y fluidez de las escenas de three.js en un teléfono real.
- About y Collaborate terminan en un bloque naranja que corta en seco contra el footer crema (solo se suavizó la landing).
- Leer las subpáginas del Notion de Algo Particular (Anima, El Oráculo de las Partículas, Game Design Document) para ajustar el tono visual: no estaban accesibles.
