# Plan: Praxis más inmersivo

## Decisiones
- **Stack:** se queda en Vue 3. three.js no depende del framework (se monta en un `<canvas>` desde un composable) y `motion` ya se usa en modo vanilla. Migrar a React no compensa: habría que reescribir router, i18n, PWA y Suspense, sin tests, y el usuario no notaría la diferencia.
- **Datos:** las cartas pasan a ser JSON estático. Airtable queda solo como editor (las cartas se editan poco). Sin token en el cliente.
- **Alcance:** Praxis primero (`/praxis`, `/oracle`, `/oracleTheNine`, `/card/:id`, `/share/:id`), después la landing.

## Pasos
1. **Datos estáticos** — HECHO
   - `scripts/sync-cards.mjs`: Airtable → `src/data/cards.json` + `public/cards/`. Se corre con `AIRTABLE_TOKEN=... npm run sync:cards`.
   - `src/data/cards.js`: exporta `deck` y `getCard(id)`.
   - Componentes ya leen datos locales; se quitaron los retrasos artificiales de 2.5–3 s y la dependencia `airtable`.
   - Sync corrido: 33 cartas, imágenes convertidas a webp (19 MB → 8.5 MB). El script usa `sharp` y lee `.env.local`.
2. **Ritual de sacar carta** — HECHO (primera versión, falta pulir el estilo visual) en `/oracle` y `/oracleTheNine`: barajado animado con `motion`, elección, volteo 3D (CSS 3D) y el color de la carta tiñendo la pantalla antes de mostrar el texto.
3. **Transición compartida mazo → carta** — HECHO: la carta tocada vuela hasta ser la ilustración de `/card/:id` (copia fija en el `body` + `motion`, módulo `src/cardTransition.js`; sin depender de la View Transitions API). Reemplaza la tintura de color del paso 2.
4. **three.js** donde aporte. Hero de la landing — HECHO (primera versión): interior de un cuerpo visto por un personaje diminuto, medio acuoso: células con los sprites del hero (pocas grandes, muchas pequeñas de fondo), haces de luz suaves con shader, transición del hero al azul oscuro (#143246) de la sección del oráculo, corrientes lentas con inercia, el cursor arrastra el líquido, partículas en suspensión que orbitan las células; también reacciona al giroscopio y al scroll (`src/composables/useCellField.js`, three cargado bajo demanda: 192 kB gzip en chunk aparte; respaldo con las células estáticas sin WebGL). Pendiente: mesa 3D para The Nine (idea del autor: las 9 cartas en grilla de 3×3 sobre una mesa, que se puede rotar arrastrando con las cartas siempre en el centro; se hace después de cerrar la landing) y medir batería en móvil real.
5. **Landing:** scroll narrativo con `scroll()` de `motion`, cambiando color y ambiente entre secciones. Hecho en el bloque del oráculo: las 4 esquinas aparecen una por una con el scroll, el texto entra escalonado y el hombrecito y el bonsái (ahora separados) entran por su cuenta. Se quitó la sección crema (`#about`, galería + "Navega el Universo"): ahora el scroll pasa del azul oscuro al naranja con la frase (degradé en `#uno`), el hero es más largo y las esquinas aparecen más tarde, repartidas en el scroll. El naranja se aclara con un degradé hasta el footer crema, y el logo (que lleva naranja) pasó al final del footer. Con esto la landing queda cerrada, salvo ajustes de gusto.
6. **Extras:** sonido ambiente y háptica opcionales con botón de silencio, cursor personalizado, `prefers-reduced-motion`.

## Pendientes
- Leer las subpáginas del Notion de Algo Particular (Praxis, El Oráculo de las Partículas, Game Design Document) para ajustar el tono visual: no estaban accesibles.
