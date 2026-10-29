# Cómo editar las cartas

Las cartas viven en el proyecto. Airtable ya no se usa: no hay token, sincronización ni base externa. Lo que está en `src/data/cards.json` y en `public/cards/` es lo que se publica.

## Dónde está cada cosa
| Qué | Dónde |
|-----|-------|
| Textos, colores, categoría, imagen | `src/data/cards.json` (una entrada por carta, ordenadas por `id`) |
| Ilustración de la carta | `public/cards/<id>.webp` (cuadrada, 2160 × 2160) |
| Miniatura del mazo | `public/cards/thumb/<id>.webp` (se genera sola) |
| Ilustración para teléfonos | `public/cards/1440/<id>.webp` (1440 px, se genera sola: es la que cargan los teléfonos y la mayoría de las pantallas; la de 2160 queda para pantallas grandes de alta densidad) |
| Escena de la carta (si la tiene) | `src/data/cardScenes.js` y `src/components/scenes/` |

## Campos de cada carta
`id`, `name_es`, `name_en`, `description_es`, `description_en`, `affirmation_es`, `affirmation_en`, `invitation_es`, `invitation_en`, `category` (`Paramis`, `Regular` o `Special`), `verb` (uno de los siete de `src/data/verbs.js`: `arraigar`, `fluir`, `encender`, `dar-recibir`, `resonar`, `ver`, `soltar`; la carta 10, el silencio, no lleva), `rarity`, `color`, `colorAlt` (formato `#rrggbb`), `image` (`[{ "url": "/cards/<id>.webp", "width": 2160, "height": 2160 }]`), `Status` (debe ser `ready`) y `author`.

Las cartas `Special` solo llevan descripción: no necesitan afirmación ni invitación.

## Tareas comunes
- **Cambiar un texto:** editá el campo en `cards.json`. Los saltos de línea van como `\n`.
- **Cambiar una ilustración:** reemplazá `public/cards/<id>.webp` (cuadrada, 2160 px) y corré `npm run thumbs` para regenerar las miniaturas y la versión de 1440 px. Si cambia el fondo, ajustá `color` y `colorAlt`.
- **Agregar una carta:** agregá su entrada con un `id` nuevo, su imagen en `public/cards/` y corré `npm run thumbs`.

## Verificar
`npm run check:cards` revisa que cada carta esté completa (textos en los dos idiomas, colores válidos, imagen y miniatura en disco) y, después de un build, que tenga su página para compartir. `npm run check` corre todas las verificaciones.

## Ojo
- La imagen del `og:image` de cada carta (la que se ve al compartir en redes) se genera sola al hacer el build, a partir de la ilustración y el color.
- Los navegadores guardan las imágenes de `/cards/` hasta un día, así que un cambio de ilustración puede tardar en verse para quien ya visitó la app.
