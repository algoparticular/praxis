# Analítica de uso (PostHog)

Anónima y sin cookies. Todo el código está en `src/analytics.js`; sin `VITE_POSTHOG_KEY` no se carga ni se envía nada (desarrollo, CI y smoke test no llaman a ningún lado).

## Activarla
1. En PostHog crear un proyecto y copiar la *Project API key* (empieza con `phc_`; es pública por diseño).
2. En Netlify, *Site configuration → Environment variables*: `VITE_POSTHOG_KEY` y, si el proyecto es europeo, `VITE_POSTHOG_HOST=https://eu.i.posthog.com` (por defecto `https://us.i.posthog.com`). Volver a desplegar: las variables `VITE_` se fijan al construir.

## Qué garantiza
- Sin cookies ni `localStorage`: el id vive en memoria y muere con la visita. Se cuentan **visitas**, no personas (no hay retención entre días, a propósito).
- Sin autocapture, replay, encuestas ni perfiles de persona (`$process_person_profile: false`): solo los eventos de abajo.
- Respeta Do Not Track y Global Privacy Control.
- `$current_url` y `$pathname` van sin barra final (`/card/27`, no `/card/27/`): Netlify sirve una carta abierta directamente con barra y el router la quita, y así no cuentan como dos páginas.
- El SDK se baja cuando la app está en reposo (chunk aparte, tope en `scripts/check-budget.mjs`).
- PostHog descarta por su cuenta los user-agents que parecen bots (incluido Chromium automatizado), así que en pruebas locales con Playwright no llega nada salvo que se oculte `navigator.webdriver` y `userAgentData`.

## Eventos
Todos llevan `lang` (`es`/`en`) e `installed` (la app corre como PWA instalada).

| Evento | Cuándo | Propiedades |
|---|---|---|
| `$pageview` | cada página a la que llega el router (un cambio solo de `#hash` o una navegación fallida no cuentan) | `route`, `card_id`, `from_route` |
| `oracle_mode_chosen` | entra al oráculo (mazo completo o Los Nueve), desde donde sea: la portada, la barra, la intro o un enlace | `mode`: `full` / `nine` |
| `card_picked` | saca una carta (oráculo, The Nine, anillo del mazo o `/deck`) | `card_id`, `mode`: `full` / `nine` / `deck` |
| `card_viewed` | abre la página de una carta | `card_id`, `scene`, `entry`: `picked` (la sacó) / `direct` (enlace compartido) |
| `scene_interacted` | primer toque a una zona táctil de la escena (arrastrar la página para bajar a la lectura no cuenta) | `card_id`, `scene`, `seconds_to_first` |
| `scene_milestone` | hito de una escena con dinámica | `card_id`, `scene`, `action` (`rulito_completed` con `times`, `cork_popped`, `refill_all`) |
| `card_reading_reached` | baja hasta la lectura | `card_id`, `seconds` |
| `card_left` | una vez por visita: se va de la carta, la oculta (cambia de app o de pestaña) o cierra la página; `seconds` llega hasta ese momento | `card_id`, `scene`, `seconds`, `touches`, `milestones`, `read` |
| `share_opened` | abre la pantalla de compartir | `card_id` |
| `share_clicked` | elige un canal | `card_id`, `channel` (`link`, `facebook`, `twitter`, `whatsapp`) |
| `language_changed` | cambia el idioma | `to` |
| `sound_toggled` | activa o apaga el sonido | `on` |
| `pwa_installed` | instala la app | |

## Embudos sugeridos (Product analytics → Funnels, por visita)
- **Ritual**: `$pageview` (route `/`) → `oracle_mode_chosen` → `card_picked` → `card_viewed` → `card_reading_reached`.
- **Escena**: `card_viewed` → `scene_interacted` → `scene_milestone` (desglosar por `scene` o `card_id`).
- **Compartir**: `card_viewed` → `share_opened` → `share_clicked`.
- **Llegada por enlace**: `card_viewed` con `entry = direct` → `oracle_mode_chosen` (¿quien llega por un enlace compartido entra al oráculo?).

## Añadir un evento
`import { track } from '../analytics.js'` y `track('nombre', { ... })`. Dentro de una escena, un hito de su dinámica va con `sceneMilestone('accion')`, que lo ata a la visita de la carta.
