# Analítica de uso (PostHog)

Anónima y sin cookies. Todo el código está en `src/analytics.js`; sin `VITE_POSTHOG_KEY` no se carga ni se envía nada (desarrollo, CI y smoke test no llaman a ningún lado).

## Activarla
1. En PostHog crear un proyecto y copiar la *Project API key* (empieza con `phc_`; es pública por diseño).
2. En Cloudflare, en el Worker `algoparticular`, *Settings → Build → Build variables and secrets*: `VITE_POSTHOG_KEY` y, si el proyecto es europeo, `VITE_POSTHOG_HOST=https://eu.i.posthog.com` (por defecto `https://us.i.posthog.com`). Volver a desplegar: las variables `VITE_` se fijan al construir.

## Qué garantiza
- Sin cookies ni `localStorage`: el id vive en memoria y muere con la visita. Se cuentan **visitas**, no personas (no hay retención entre días, a propósito). El mundo de Sid guarda en el teléfono sus visitas, semillas, plantas, fragmentos y lo que ya se vio en la libreta (`worldMemory.js`), y de eso solo se mandan cantidades: qué número de visita es, cuántos fragmentos de la historia tiene y cuántos tipos de planta sembró (nada que identifique a la persona; sirve para ver si el mundo invita a volver y cuánto se avanza).
- Sin autocapture, replay, encuestas ni perfiles de persona (`$process_person_profile: false`): solo los eventos de abajo.
- Respeta Do Not Track y Global Privacy Control.
- `$current_url` y `$pathname` van sin barra final (`/card/27`, no `/card/27/`): una carta abierta directamente puede llegar con barra (Netlify la servía así; Cloudflare la redirige) y el router la quita, y así no cuentan como dos páginas.
- El SDK se baja cuando la app está en reposo (chunk aparte, tope en `scripts/check-budget.mjs`).
- PostHog descarta por su cuenta los user-agents que parecen bots (incluido Chromium automatizado), así que en pruebas locales con Playwright no llega nada salvo que se oculte `navigator.webdriver` y `userAgentData`.

## Eventos
Todos llevan `lang` (`es`/`en`) e `installed` (la app corre como PWA instalada).

| Evento | Cuándo | Propiedades |
|---|---|---|
| `$pageview` | cada página a la que llega el router (un cambio solo de `#hash` o una navegación fallida no cuentan) | `route`, `card_id`, `from_route` |
| `oracle_mode_chosen` | entra al oráculo (mazo completo o Los Nueve), desde donde sea: la portada, la barra, la intro o un enlace | `mode`: `full` / `nine` |
| `card_picked` | saca una carta (oráculo, The Nine, anillo del mazo o `/deck`) | `card_id`, `mode`: `full` / `nine` / `deck` |
| `card_viewed` | abre la página de una carta | `card_id`, `scene`, `entry`: `picked` (la sacó) / `direct` (enlace compartido) / `lab` (Sid meditó en su lugar del laboratorio); `game`: si la carta tiene su juego (desde el mundo, desde "Las cartas" o con `?jugar`; desde el 23 de noviembre las del oráculo y los enlaces no lo tienen) |
| `scene_interacted` | primer toque a una zona táctil de la escena (arrastrar la página para bajar a la lectura no cuenta) | `card_id`, `scene`, `seconds_to_first` |
| `scene_milestone` | hito de una escena con dinámica (solo si la carta tiene su juego: desde el 23 de noviembre las cartas del oráculo y por enlace no mandan hitos) | `card_id`, `scene`, `action` (`rulito_completed` con `times`, `cork_popped`, `current_accompanied` (la primera vez que se acompaña la corriente de Fluir: Khanti, Aceptación, Transformación, Celebración), `current_flowed` con `times` (la corriente llegó al final), `all_released` con `times`, `power_breath`, `pattern_seen` con `times` y `figure` (Pañña; en Esperanza, cada ancestro visto: `sitting`, `walking`, `resting`), `pattern_reset` con `figure`, `ancestors_gathered` con `times` (Esperanza: los tres ancestros detrás del pequeño ser, nace el rulito), `beauty_seen` con `times` (Belleza: las tres bellezas escondidas encontradas), `light_shared` con `times` (Dana, Metta y Gratitud), `crown_lit` con `times`, `path_lit` con `times` (Viriya), `moon_lit` con `times` (Coraje: la sombra de la luna encendida entera), `maze_lit` con `times` (Desafío: los cuatro anillos y la luz del centro), `in_time` con `times` (Sincronicidad, Sila y Armonía), `echo_sung` con `times` y `tries` (cuántas veces cantó el vigía la frase hasta que se repitió entera; en Comunicación, las veces que cantó la luz en la ronda, y en Honestidad, las veces que bajó limpia la frase), `tune_composed` con `times`, `renounced` con `times` y `breath` (si se soltó todo de una vez, manteniendo a Sid), `thought_came` (Upekkha: llegó el primer pensamiento), `thought_clung` con `held` (0..1, cuánto se aferró, al soltar un pensamiento sostenido), `breath_released` con `thoughts` (Upekkha: manteniendo a Sid, soltó de una vez los pensamientos pegados; en Ciclos con `plants`, las plantas que quedaban (antes `drops`, las gotas), y en Perdón con `knots`, los nudos que había cuando salió la onda), `equanimous` con `times` (Upekkha: los ocho soltados), `storm_calmed` con `times` (Addhitthana: el bote sostenido bajo la luz hasta que nació el rulito), `cycle_closed` con `times` y `breath` (Ciclos: todas las plantas soltadas, el sol entero; `breath` si alguna se soltó respirando), `forgiven` con `times` y `breath` (Perdón: el anillo limpio), `path_committed` con `times` (Compromiso: la luz llegó al horizonte), `home_reached` con `times` (Confianza: la luz llegó a las tres puertas) y `faith_held` con `times` (Fe: sostenido hasta que el cielo se abrió entero)) |
| `card_reading_reached` | baja hasta la lectura | `card_id`, `seconds` |
| `card_left` | una vez por visita: se va de la carta, la oculta (cambia de app o de pestaña) o cierra la página; `seconds` llega hasta ese momento | `card_id`, `scene`, `seconds`, `touches`, `milestones`, `game`, `read`, y la fluidez (abajo) |
| `table_left` | deja una mesa 3D (sale, la oculta o cierra la página), solo si la mesa 3D llegó a mostrarse | `table`: `full` (`/oracle`) / `nine` (`/oracleTheNine`) / `deck` (el anillo de `/deck`), y la fluidez (abajo) |
| `world_entered` | entra al mundo de Sid (`/sid`) | `from`: `landing` (el laberinto de Inicio), `direct` (un enlace o la dirección escrita) u otra página de la app (su dirección); `touch` (pantalla táctil), `webgl` (si las cartas se abren desde sus lugares), `standalone` (entró desde el ícono de la pantalla de inicio), `visit` (qué visita es de este teléfono, según lo que recuerda el mundo: 1 es la primera) |
| `world_moved` | la primera vez que Sid da un paso | `seconds_to_first`, `how`: `touch` / `pointer` (mouse) / `keys` |
| `world_zone_reached` | Sid llega a una zona por primera vez en la visita (la primera, donde empieza, también) | `zone` (id de la carta de esa zona), `zones` (cuántas lleva), `seconds` |
| `world_place_meditated` | medita en un lugar (una vez por lugar en la visita) | `card_id`, `seconds` |
| `world_card_opened` | se abre la carta de ese lugar (con WebGL); además llega su `card_viewed` con `entry: 'lab'` y, al cerrarla, su `card_left` | `card_id` |
| `world_card_closed` | vuelve al mundo desde esa carta | `card_id`, `won` (completó su juego), `seconds` |
| `world_rulito` | vuelve al mundo con un rulito | `card_id`, `via`: `card` (lo ganó en la carta) / `place` (nació en el lugar, sin WebGL) |
| `world_seed_planted` | planta una semilla | `seed` (la carta de la semilla, por su nombre: `metta`), `zone` (id de la carta de la zona donde la planta), `kind` (qué planta brotó, su id en `src/lab/herbarium.js`) |
| `world_first_seed` | la primera visita enseña la semilla: la recoge y después la planta | `step`: `picked` / `planted`; `seconds` (desde que entró) |
| `world_fragment` | encuentra un fragmento de la historia (cada marca da uno, al azar entre los que faltan) | `found` (cuántos de los 12 tiene ahora), `seconds` |
| `world_plant_discovered` | siembra por primera vez un tipo de planta (entra al herbario) | `kind` (su id en `src/lab/herbarium.js`), `kinds` (cuántos tipos lleva) |
| `world_secret` | descubre un secreto del mundo, una vez por visita cada uno | `what`: `constellation` (de noche, meditando, la cámara mira al cielo y las estrellas forman la figura de la zona; con `card_id`, la carta de esa figura), `star_seed` (una estrella fugaz le deja una semilla de luz), `fragment` (encuentra una marca de la historia); `seconds` |
| `world_notebook_opened` | abre la libreta de Sid | `tab` (en qué página abrió: `bitacora` / `herbarium`; hasta el 22/11/2026 la Bitácora se llamaba Pensamientos y llegaba como `thoughts`), `fresh` (había algo nuevo sin ver), `fragments` (cuántos fragmentos tiene), `plants` (cuántos tipos de planta sembró) |
| `world_sat` | cada vez que Sid se sienta en loto | `place` (id de la carta del lugar donde se sentó, o vacío lejos de los lugares), `zone` (id de la carta de la zona), `night` (de noche), `minutes` (si se sentó para una meditación de 1, 3 o 5 minutos), `sits` (cuántas veces lleva en la visita), `seconds` |
| `world_meditation_started` | elige una meditación de 1, 3 o 5 minutos (ya sentado o no) | `minutes`, `seconds` |
| `world_meditation` | termina una meditación elegida (1, 3 o 5 minutos) | `minutes`, `completed` (la terminó o se levantó antes), `seconds` (cuánto duró) |
| `world_left` | una vez por visita: se va del mundo, lo oculta o cierra la página | `seconds`, `distance` (px de su mundo: cruzar una zona son unos 8000), `zones`, `places`, `cards_opened`, `sits`, `seeds_picked`, `seeds_planted`, `rulitos`, `meditations`, `notebook_opens`, `fragments` (cuántos fragmentos de la historia encontró en esta visita), `secrets` (cuántos tipos de secreto descubrió), `seconds_to_first_move` y `seconds_to_first_sit` (vacíos si no pasó), `touch`, `webgl`, y la fluidez (abajo) |
| `share_opened` | abre la pantalla de compartir | `card_id`, `from`: `reading` (el botón del final de la lectura; hasta noviembre de 2026 también `stage`, un botón sobre la escena que se sacó) |
| `share_clicked` | elige un canal | `card_id`, `channel` (`link`, `facebook`, `twitter`, `whatsapp`) |
| `language_changed` | cambia el idioma | `to` |
| `world_reset` | empieza el mundo de Sid de nuevo (gesto escondido: mantener apretado el laberinto del menú 3 s y confirmar) | (nada) |
| `sound_toggled` | activa o apaga el sonido | `on` |
| `pwa_installed` | instala la app | |

## Fluidez
`card_left`, `table_left` y `world_left` llevan cómo se dibujó la página mientras estuvo abierta (`src/composables/useFramePace.js`, cada cuadro que pinta el navegador), si se midieron al menos 2 segundos:
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
- **Mundo de Sid** (armado en el tablero "Anima: el mundo de Sid" de PostHog, con el resto de sus gráficos): `world_entered` → `world_moved` → `world_zone_reached` (con `zones` = 2: salió de la primera) → `world_place_meditated` → `world_card_opened` → `world_card_closed` con `won` (desglosar por `from` y por `touch`). Y `world_left`: cuánto se queda (`seconds`), cuánto camina y si se sienta (`seconds_to_first_sit` vacío: no encontró el botón de la semilla).
- **Llegada por enlace**: `card_viewed` con `entry = direct` → `oracle_mode_chosen` (¿quien llega por un enlace compartido entra al oráculo?).

## Añadir un evento
`import { track } from '../analytics.js'` y `track('nombre', { ... })`. Dentro de una escena, un hito de su dinámica va con `sceneMilestone('accion')`, que lo ata a la visita de la carta.

## Primeros datos (26 al 28 de octubre de 2026)
Una foto sacada de PostHog el 29 de octubre. Son pocas visitas y muchas deben ser pruebas del equipo: sirven para ver que todo llega, no para sacar conclusiones.
- 45 visitas (31 desde iPhone, 8 desde Android, 7 desde Mac); 58 cartas abiertas (47 sacadas, 11 por enlace); 44 cartas sacadas (28 del anillo de `/deck`, 10 del mazo completo, 6 de The Nine); 9 veces se bajó hasta la lectura; 7 veces se abrió compartir y 5 se compartió.
- En las cartas planas casi nadie toca la escena (1 de 19 visitas) y se quedan unos 5 segundos; en Vipassana y Pañña tocan casi todos y se quedan casi un minuto. Pañña es la que más se juega: la figura se vio 8 veces y se deshizo 9.
- El detalle por escena y por hito está en la pestaña Analítica del artefacto "Anima GDD".

## El primer mes (26 de octubre al 23 de noviembre de 2026)
Sacado de PostHog el 23 de noviembre. Solo `algoparticular.com`: se dejan afuera las vistas previas de Netlify (`deploy-preview-…`, unas 40 visitas de prueba). Las pruebas del equipo desde el sitio de verdad no se pueden separar (el filtro de cuentas internas de PostHog no aplica, porque no hay personas), así que muchas visitas de iPhone son nuestras.
- 413 visitas: 358 desde iOS, 29 Android, 23 Mac, 4 Windows y 2 Linux. Por semana: 199 (la del lanzamiento), 23, 63 y 129.
- 407 cartas abiertas en 145 visitas; 308 sacadas del oráculo. 50 veces se bajó hasta la lectura (12 % de las cartas abiertas).
- En la ilustración plana (las cartas sin escena de entonces) 1 de 62 tocó la escena; en las escenas con juego tocan entre la mitad y casi todos (Vipassana 19 de 25, Pañña 15 de 19, Sila 13 de 15, Nekkhamma 13 de 16).
- Juegos completados (veces, no personas): Hogar 29, Paciencia 28, Pañña 15, Upekkha 12, Vipassana 11, Nekkhamma 10, Dana 10, Sila 9.
- El mundo de Sid (desde el 20 de noviembre): 52 entradas en 48 visitas, 18 visitas se sentaron, 19 plantaron una semilla, 11 encontraron un fragmento y 15 abrieron la libreta; solo 4 abrieron la carta de un lugar.
- Compartir: 19 visitas lo abrieron y 8 compartieron.
