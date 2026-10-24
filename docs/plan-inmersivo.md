# Plan: Praxis más inmersivo

## Decisiones
- **Stack:** se queda en Vue 3. three.js no depende del framework (se monta en un `<canvas>` desde un composable) y `motion` ya se usa en modo vanilla. Migrar a React no compensa: habría que reescribir router, i18n, PWA y Suspense, sin tests, y el usuario no notaría la diferencia.
- **Datos:** las cartas pasan a ser JSON estático. Airtable queda solo como editor (las cartas se editan poco). Sin token en el cliente.
- **Alcance:** Praxis primero (`/praxis`, `/oracle`, `/oracleTheNine`, `/card/:id`, `/share/:id`), después la landing.

## Pasos
1. **Datos estáticos** — HECHO (commit local, pendiente de push)
   - `scripts/sync-cards.mjs`: Airtable → `src/data/cards.json` + `public/cards/`. Se corre con `AIRTABLE_TOKEN=... npm run sync:cards`.
   - `src/data/cards.js`: exporta `deck` y `getCard(id)`.
   - Componentes ya leen datos locales; se quitaron los retrasos artificiales de 2.5–3 s y la dependencia `airtable`.
   - **Falta:** correr el sync con el token (hoy `cards.json` es `[]`) y commitear el resultado antes de desplegar.
2. **Ritual de sacar carta** en `/oracle`: barajado animado con `motion`, elección, volteo 3D (CSS 3D) y el color de la carta tiñendo la pantalla antes de mostrar el texto.
3. **Transición compartida mazo → carta:** la carta tocada crece hasta ser la ilustración de `/card/:id` (View Transitions API con Vue Router, o `motion`).
4. **three.js** donde aporte: campo de partículas o "células" en el hero de la landing (cursor, giroscopio, scroll) y mesa 3D para The Nine. Evaluar peso y batería en móvil.
5. **Landing:** scroll narrativo con `scroll()` de `motion`, cambiando color y ambiente entre secciones.
6. **Extras:** sonido ambiente y háptica opcionales con botón de silencio, cursor personalizado, `prefers-reduced-motion`.

## Pendientes
- Rotar el token de Airtable (sigue en el historial de git) y crear uno de solo lectura.
- Si las imágenes de `public/cards/` pesan mucho, convertirlas a webp en el script de sync.
- `public/paraFinetune.zip` (18 MB) se publica con el sitio; conviene sacarlo del repo.
- `/share/:id` ahora busca la carta por `id` (antes por posición en la lista); verificar que `id` coincide con la posición en Airtable.
- Leer las subpáginas del Notion de Algo Particular (Praxis, El Oráculo de las Partículas, Game Design Document) para ajustar el tono visual: no estaban accesibles.
