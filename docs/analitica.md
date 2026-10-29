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
| `scene_milestone` | hito de una escena con dinámica | `card_id`, `scene`, `action` (`rulito_completed` con `times`, `cork_popped`, `refill_all`, `all_released` con `times`, `power_breath`, `pattern_seen` con `times` y `figure`, `pattern_reset` con `figure`, `light_shared` con `times`, `crown_lit` con `times`) |
| `card_reading_reached` | baja hasta la lectura | `card_id`, `seconds` |
| `card_left` | una vez por visita: se va de la carta, la oculta (cambia de app o de pestaña) o cierra la página; `seconds` llega hasta ese momento | `card_id`, `scene`, `seconds`, `touches`, `milestones`, `read`, y la fluidez (abajo) |
| `table_left` | deja una mesa 3D (sale, la oculta o cierra la página), solo si la mesa 3D llegó a mostrarse | `table`: `full` (`/oracle`) / `nine` (`/oracleTheNine`) / `deck` (el anillo de `/deck`), y la fluidez (abajo) |
| `share_opened` | abre la pantalla de compartir | `card_id`, `from`: `stage` (el botón sobre la escena) / `reading` (el del final de la lectura) |
| `share_clicked` | elige un canal | `card_id`, `channel` (`link`, `facebook`, `twitter`, `whatsapp`) |
| `language_changed` | cambia el idioma | `to` |
| `sound_toggled` | activa o apaga el sonido | `on` |
| `pwa_installed` | instala la app | |

## Fluidez
`card_left` y `table_left` llevan cómo se dibujó la página mientras estuvo abierta (`src/composables/useFramePace.js`, cada cuadro que pinta el navegador), si se midieron al menos 2 segundos:
- `fps`: cuadros por segundo promedio.
- `slow_pct`: % de cuadros lentos (más de 25 ms: a 60 por segundo, se saltó uno).
- `stutters`: tirones (cuadros de más de 50 ms, los que se notan).
- `worst_ms`: el cuadro más lento.
- `locked_30`: el navegador tuvo la página fija a 30 cuadros por segundo (al menos el 90% de los cuadros duró entre 28 y 40 ms). Es lo que hace Safari con el modo de ahorro de batería: la página se mueve pareja, pero cada cuadro dura 33 ms y cuenta como lento, así que con `locked_30` verdadero `slow_pct` sale cerca de 100% y no dice nada de la escena. Si una carta de ilustración plana también sale `locked_30`, es el teléfono y no la escena.
- `measured_s`: segundos medidos (una pausa de un segundo o más es la página oculta o el teléfono bloqueado, y no cuenta).
- `cores` y `dpr`: núcleos del procesador y densidad de la pantalla, como pista del equipo (lo mismo que usan las escenas 3D para reconocer uno de poca potencia). No distinguen a nadie. PostHog ya agrega sistema, navegador y tamaño de pantalla.

Sin `VITE_POSTHOG_KEY` (o con Do Not Track) no se mide nada. La batería no se puede medir desde una página web (Safari no lo permite): eso sigue siendo a mano. Para mirar un teléfono en vivo está el contador `?fps` (ver `plan-inmersivo.md`).

Para empezar: `card_left` con promedio de `fps` y de `slow_pct`, desglosado por `scene` (o por `card_id`) y por `$os`; lo mismo con `table_left` por `table`. Una escena con `slow_pct` alto en iOS es la que hay que aliviar primero. Siempre con `locked_30` en falso (o separándolo en el desglose): las visitas con el teléfono en ahorro de batería salen a 30 fps y con casi todos los cuadros lentos aunque la escena no pese nada. Las que se registraron antes de esta propiedad no la tienen; ahí la pista es `fps` de 29 a 30 con `slow_pct` por encima de 95.

## Embudos sugeridos (Product analytics → Funnels, por visita)
- **Ritual**: `$pageview` (route `/`) → `oracle_mode_chosen` → `card_picked` → `card_viewed` → `card_reading_reached`.
- **Escena**: `card_viewed` → `scene_interacted` → `scene_milestone` (desglosar por `scene` o `card_id`).
- **Compartir**: `card_viewed` → `share_opened` → `share_clicked`.
- **Llegada por enlace**: `card_viewed` con `entry = direct` → `oracle_mode_chosen` (¿quien llega por un enlace compartido entra al oráculo?).

## Añadir un evento
`import { track } from '../analytics.js'` y `track('nombre', { ... })`. Dentro de una escena, un hito de su dinámica va con `sceneMilestone('accion')`, que lo ata a la visita de la carta.

## Primeros datos (26 al 28 de octubre de 2026)
Una foto sacada de PostHog el 29 de octubre. Son pocas visitas y muchas deben ser pruebas del equipo: sirven para ver que todo llega, no para sacar conclusiones.
- 45 visitas (31 desde iPhone, 8 desde Android, 7 desde Mac); 58 cartas abiertas (47 sacadas, 11 por enlace); 44 cartas sacadas (28 del anillo de `/deck`, 10 del mazo completo, 6 de The Nine); 9 veces se bajó hasta la lectura; 7 veces se abrió compartir y 5 se compartió.
- En las cartas planas casi nadie toca la escena (1 de 19 visitas) y se quedan unos 5 segundos; en Vipassana y Pañña tocan casi todos y se quedan casi un minuto. Pañña es la que más se juega: la figura se vio 8 veces y se deshizo 9.
- El detalle por escena y por hito está en la pestaña Analítica del artefacto "Anima por dentro".
