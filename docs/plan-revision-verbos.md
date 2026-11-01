# Plan: revisión de los verbos jugables (pistas y rulitos)

Revisión del 1 de noviembre de 2026, sobre `main` con los PR 79, 80 y 81 (las 32 cartas con verbo, jugables). Lo de abajo sale de **leer el código y mirar las ilustraciones**; no se probó en pantalla, así que cada arreglo se confirma en un teléfono antes de mergear (ver `CLAUDE.md`, Checks).

El problema de fondo: casi todas las escenas, dejadas solas, hacen brillar algo. Eso dice **dónde** tocar pero no **cómo** (mantener, frotar, tirar y soltar, arrastrar, deslizar, tocar a tiempo, repetir en orden). Y el rulito nace con criterios distintos en cada escena, algunos en lugares arbitrarios.

## Reglas decididas

1. **Las pistas no tienen texto.** Muestran el gesto, con la **mano fantasma**: un dedo de luz hecho de puntos (opción C), que hace el gesto sobre el lugar real.
2. **El rulito nace donde lo dibuja la carta original. Si la carta no dibuja uno, nace sobre un personaje.** Nunca sobre un lugar fijo de la pantalla. Las excepciones ya decididas, carta por carta, están en "Dónde nace el rulito: decidido" y mandan sobre esta regla.
3. Lo de siempre (`docs/verbos-y-dinamicas.md`): la lectura no se bloquea, se juega con teclado y con movimiento reducido.
4. **En Soltar y Arraigar, dejado solo, se vuelve atrás** (decidido por Juan Manuel): lo logrado se va deshaciendo de a poco si nadie toca, como ya hace Nekkhamma (le vuelve a crecer un hilo) y como hace el rulito de Arraigar al soltar (la cola alcanza a la cabeza). Es una excepción a "nada se pierde" para esos dos verbos.

## Paquete 0: la mano fantasma (`src/composables/useGhostHand.js`)

**Hecha y en uso** en Paciencia (mantener), Viriya (frotar y, encendido, tirar y soltar) y Pañña (arrastrar), en la rama `claude/music-chakra-cards-jft7f9`. Una prueba en Ciclos se deshizo: el ejemplo de Soltar es Vipassana (ver Etapa 1).

**Cómo se usa en una escena** (modelo: `ScenePaciencia.vue`, `SceneViriya.vue`, `ScenePanna.vue`):

```js
import { createGhostHand, gesture } from '../../composables/useGhostHand.js';
hand = createGhostHand(stage);              // después de crear el stage; hand?.destroy() al desmontar
// en el loop, cuando el juego necesita mostrarse:
if (!held && !won && hand?.due(6)) hand.play(gesture.hold(someHit.value, 2.4));
```

- **Puntos:** pueden ser `[x, y]` en px del canvas, una función que devuelve uno (así sigue lo que se mueve) o un elemento DOM. Si es un elemento, usa su centro; los `hit` de las escenas ya están sobre lo que se toca.
- **Gestos disponibles:**
  - `tap(P)`, con `TAP_LEAD` = segundos hasta que apoya, para caer en un pulso;
  - `taps([P…])`, toques en orden;
  - `hold(P, s)`;
  - `rub(P, span)`;
  - `sling(P, haciaDónde)`;
  - `drag(A, B)`;
  - `slide(path)`, con `path(u)` para u de 0 a 1.
  - También se pueden armar guiones a mano: `go`, `path`, `down`, `up`, `ring`, `wait`.
- **Tiempo quieto: siempre 7 segundos** (`HINT_AFTER`), decidido por Juan Manuel, que probó la mano. La mano lleva su propia cuenta, con reloj real: `hand.due(HINT_AFTER, wanted)`. `wanted` dice si el juego quiere mostrarse ahora (no mientras se juega, ni mientras vive un rulito). Mientras es falso la cuenta vuelve a cero, así que **después de ganar también espera 7 segundos enteros**, en lugar de aparecer enseguida. Si la escena tiene su propio temporizador de pista, ese también tiene que volver a cero mientras se juega o se gana (así quedó Pañña).
- Cualquier toque o tecla la hace irse al instante. Con movimiento reducido no aparece. `play(…, { loops })` dice cuántas veces repite el gesto (2 por defecto).

**Aspecto: cerrado** (Juan Manuel, 1 de noviembre: tamaño, brillo, velocidad y 2 repeticiones).
- **Contraste:** la mano es crema por defecto. En las cartas claras, o donde hace el gesto sobre algo crema, va navy con un halo crema: `createGhostHand(stage, { color: 0x143246, shade: 0xf7f8f1 })`. Hoy así en Paciencia, Khanti y Viriya. Cada paquete, al conectar la mano en una carta, mira el contraste y le pone ese color si hace falta (decidido: se ajusta el color carta por carta).
- **Este archivo se toca solo desde un chat a la vez**, para no pisarse. Los demás paquetes solo lo usan.

## Etapa 1: un ejemplo por verbo, en las primeras cartas de cada verbo

Antes de llevar la mano a todas las cartas, se conecta en la primera carta que se hizo de cada verbo. Juan Manuel las prueba en un teléfono y se cierra el aspecto de la mano (paquete 0). Solo después se pasa a las demás (etapa 2).

| Verbo | Carta de ejemplo | Gesto de la mano | Estado |
|---|---|---|---|
| Arraigar | 27 Paciencia | `hold` sobre la piña | ✅ hecho |
| Soltar | 31 Vipassana | `tap` sobre la célula que hoy brilla (`cellField.hint()`, `startHints`); a veces `hold` sobre Sid (la respiración atrapa un tercio de las células) | ✅ hecho (falta probar en un teléfono) |
| Fluir | 5 Khanti | `slide` por el tramo de ruta delante de la cabeza (`flow.point(i)` da los puntos; ver el paquete C, que propone llevarlo a `useFlow.js`) | ✅ hecho (falta probar en un teléfono) |
| Encender | 22 Evolución | en frío `rub` dentro de la célula; encendido `sling` del ser hacia lo próximo apagado (modelo: Viriya, que también está hecha) | ✅ hecho (falta probar en un teléfono) |
| Dar y recibir | 2 Dana | `tap` sobre el receptor que hoy titila (`flash` de `useGiving.js`) | ✅ hecho (falta probar en un teléfono) |
| Resonar | 29 Sincronicidad | `tap` a tiempo sobre la burbuja que brilla en su pulso, lanzado `TAP_LEAD` antes del pulso (hoy no tiene ninguna pista por inactividad) | ✅ hecho (falta probar en un teléfono) |
| Ver | 3 Pañña | `drag` entre las dos luces del primer hilo que falta | ✅ hecho |

Viriya (Encender) también está hecha y sirve de modelo para el `sling`.

## Etapa 2: el resto de las cartas, en paralelo (paquetes A a G)

Cada paquete toca sus escenas y, como mucho, el motor de su verbo. En cada carta:

1. Reemplazar o completar la pista con el gesto de la mano.
2. Mover el rulito según la regla 2.
3. Arreglar lo marcado.
4. Poner al día `docs/escenas.md` y `CLAUDE.md` en lo que cambie, solo en los párrafos de sus cartas.

Al terminar, `npm run check` y probar en un teléfono.

## Paquete S: soles y lunas vivos como el de Pañña

Pedido de Juan Manuel: los soles y las lunas de este estilo vivo tienen que ser como el de Pañña, donde **no se nota el borde del círculo**.

- **Cómo está hecho el de Pañña** (`ScenePanna.vue`, grupo 2 de `back`): el sol entero es un punteado denso de partículas, muestreado de la imagen del sol (`sample('sun', …)`), sin un disco sólido debajo. Por eso se funde con el cielo.
- **Cómo están hechos los otros:** un disco sólido en código (`disc()`) y el punteado solo en el borde. El borde del disco se ve.
- **Honestidad:** completar el sol tal como lo tiene Pañña.

**Soles, lunas y luces redondas hechos con `disc()`, para revisar uno por uno:**

| Escena | Qué es |
|---|---|
| 26 Honestidad | la luz de la superficie |
| 4 Viriya | el sol |
| 8 Metta | la gran luz amarilla y la luz turquesa |
| 27 Paciencia | el sol |
| 11 Aceptación | el sol rosa |
| 15 Ciclos | el sol rojo |
| 24 Gratitud | los soles durazno y rosa |
| 32 Transformación | el solcito de la copa |
| 6 Sacca | la luna |
| 19 Coraje | la luna |
| 18 Confianza | la luz de la chakana |
| 28 Perdón | el planeta |

Falta ver cómo están hechas las lunas de Sila, Addhitthana y Esperanza.

**Para decidir con Juan Manuel en cada una:** ¿queda todo de puntos, como Pañña, o el disco con el borde disuelto en el punteado? Perdón (un planeta de mármol con contorno) y Confianza (una luz) quizá no entren. Las 18 cartas del 31/10 que tienen sol o luna lo revisan dentro de su revisión.

## Revisión juego por juego de las 18 cartas del 31 de octubre

Las 18 cartas que se hicieron jugables el 31 de octubre tienen muchos detalles para revisar. Se revisan **una por una, con Juan Manuel**, como se hizo con las 15 anteriores: él la prueba en el teléfono, cuenta lo que ve y el chat lo arregla. No se reparten a ciegas.

| PR del 31/10 | Cartas |
|---|---|
| #74 Dar y recibir | 8 Metta, 24 Gratitud |
| #77 Resonar | 12 Armonía, 17 Comunicación, 26 Honestidad |
| #76 Fluir | 5 Khanti (rehecha ese día con el motor común), 11 Aceptación, 32 Transformación, 14 Celebración |
| #78 Soltar y Arraigar | 15 Ciclos, 28 Perdón, 16 Compromiso, 18 Confianza, 23 Fe |
| #79 Ver y Encender | 30 Esperanza, 13 Belleza, 19 Coraje, 21 Desafío |

**Para no tocar dos veces la misma escena:** en estas 18 cartas, lo que el plan pide en los paquetes A a G (la pista con la mano, el rulito decidido y lo marcado) se hace **dentro de su revisión**, junto con lo que Juan Manuel encuentre. Los paquetes A a G se reparten en paralelo solo para las otras 14 cartas con juego: Paciencia, Vipassana, Nekkhamma, Sila, Dana, Pañña, Viriya, Sacca, Addhitthana, Upekkha, Evolución, Hogar, Sincronicidad y Creatividad.

Khanti es a la vez un ejemplo de la etapa 1 y una de las 18. Su mano se conecta en la etapa 1, y el resto de Khanti va en su revisión.

**Cómo es cada revisión (un chat por carta, de a una):**
1. El chat lee esta carta en el plan (su paquete) y en `docs/escenas.md`.
2. Juan Manuel la prueba en el teléfono y lista lo que ve.
3. El chat arregla lo que listó, más la pista, el rulito y lo marcado en el plan. Antes de inventar algo, pregunta.
4. Muestra el resultado (video o capturas), corre `npm run check`, actualiza `docs/escenas.md` y `CLAUDE.md` en lo de esa carta, y marca la carta como revisada en esta tabla.

**Estado:**

| Carta | Revisada |
|---|---|
| 8 Metta | no |
| 24 Gratitud | no |
| 12 Armonía | no |
| 17 Comunicación | no |
| 26 Honestidad | no |
| 5 Khanti | no |
| 11 Aceptación | no |
| 32 Transformación | no |
| 14 Celebración | no |
| 15 Ciclos | no |
| 28 Perdón | no |
| 16 Compromiso | no |
| 18 Confianza | no |
| 23 Fe | no |
| 30 Esperanza (con las formas de las constelaciones) | no |
| 13 Belleza | no |
| 19 Coraje | no |
| 21 Desafío | no |

## Paquete H: documentar en el GDD

El GDD es el artefacto "Anima GDD". Sus pestañas salen de los documentos de `docs/` (ver `docs/README.md`).

1. **`verbos-y-dinamicas.md`**, en "Reglas comunes de las dinámicas":
   - la pista es la mano fantasma, sin texto, y muestra el gesto;
   - la regla del rulito (regla 2).
   - En la sección de cada verbo, qué gesto hace la mano.
2. **`abierto.md`:** las decisiones que siguen abiertas (al final de este plan).
3. **`escenas.md`:** un apartado técnico de `useGhostHand.js` (lo de "Cómo se usa" de arriba).
4. **`CLAUDE.md`:** una línea sobre `useGhostHand.js` junto a los otros motores comunes.
5. **El artefacto "Anima GDD":** volver a publicarlo con esas pestañas al día. Se busca con la herramienta Artifact (`list`), se lee (`read`) y se actualiza sobre esa misma URL, sin crear uno nuevo. Lo hace un solo chat, al final, cuando los documentos ya estén en `main`.

Los puntos 1 a 4 se pueden hacer ya con lo decidido. Cada paquete agrega después lo suyo.

## Cómo trabajar en paralelo (varios chats o sub-sesiones)

- **Rama base:** la mano fantasma y este plan están solo en `claude/music-chakra-cards-jft7f9`. Lo más simple es mergearla a `main` antes de repartir, y que cada chat arranque desde `main`. Si no, cada chat arranca desde esa rama.
- **Un chat por paquete, cada uno en su propia rama.** Ningún chat toca escenas de otro paquete, ni `useGhostHand.js` (salvo el del paquete 0).
- **Conflictos esperables:** en `CLAUDE.md` y `docs/escenas.md`, porque todos los paquetes editan esos archivos (cada uno sus párrafos). Se resuelven al mergear; por eso conviene mergear los paquetes de a uno.
- **Si se orquesta desde un chat con sub-sesiones:** el chat principal reparte los paquetes, revisa cada resultado (lint, `npm run check`, capturas de pantalla o video de la escena) y mergea de a uno. Las decisiones de la lista de abajo no las toma ninguna sub-sesión: se le preguntan a Juan Manuel.
- **Indicación para cada chat** (copiar y completar):
  > Leé `docs/plan-revision-verbos.md` en `main`. Hacé el paquete X, solo para las cartas que no son del 31/10 (esas se revisan de a una, con Juan Manuel): para cada carta, la pista con la mano fantasma, el rulito según la regla 2 y lo marcado. No toques `useGhostHand.js` ni escenas de otros paquetes. Lo que figure "a decidir", preguntámelo antes. Al terminar, `npm run check`, un video o capturas de cada escena, y actualizá en el plan el estado de tus cartas.

## Dónde dibuja el rulito cada carta original

Cajas en px de la carta de 2160, como `[x, y, ancho, alto]`. Están medidas sobre `public/cards/N.webp`.

| Carta | Rulito en la carta | Caja | Sobre qué |
|---|---|---|---|
| 0 Nekkhamma | sí | [294,843,78,197] | la cabeza de Sid |
| 1 Sila | sí | [771,915,84,226] | el ser del atril (el comentario de `convert-sila.mjs` dice "Particular": está mal) |
| 2 Dana | sí, uno | [1416,472,76,233] blanco | el ser de la derecha, el que sostiene la llama |
| 4 Viriya | sí | [661,295,70,151] | Particular |
| 6 Sacca | sí | [1048,803,72,154] | el vigía |
| 7 Addhitthana | sí | [916,908,62,136] | Particular |
| 8 Metta | sí | [1067,575,52,111] | Sid |
| 9 Upekkha | sí | [1002,364,78,201] | Sid |
| 11 Aceptación | sí, dos | [574,913,48,135] y [1538,913,48,135] | un ser en cada orilla |
| 19 Coraje | sí | [1110,955,44,95] | Kätus, dibujado sobre la luna |
| 20 Creatividad | tenue | ≈[916,1079,50,90] | en la célula, abajo a la izquierda de la medusa |
| 22 Evolución | tenue | ≈[1280,1040,40,110] | en la célula, arriba a la derecha del ser |
| 25 Hogar | tenue | ≈[1005,1145,36,110] | en la célula, abajo a la derecha de la larva |
| 27 Paciencia | sí | [1074,619,51,179] | el Sama del medio |
| 28 Perdón | sí | [608,1486,39,107] | Particular |
| 32 Transformación | sí | [1178,391,62,179] amarillo | en el cielo a la derecha de la copa de la palmera |
| 3, 5, 12, 13, 14, 15, 16, 17, 18, 21, 23, 24, 26, 29, 30 | no | | va sobre un personaje |
| 31 Vipassana | probablemente no | | va sobre Sid |

**Cajas guardadas que no marcan el rulito de la carta:**
- **Compromiso**, `compromisoScene.json` `rulito`: es la "z" amarilla del cielo. Hay que dejar de usarla: el rulito va sobre el Sama grande.
- **Esperanza**, `esperanzaScene.json` `rulito`: también es una "z" del cielo. Hay que dejar de usarla: el rulito va sobre Vulpes.
- **Transformación**, `transformacionScene.json`: marca la espiral de la semilla. Está bien así, porque el rulito va sobre la semilla (decidido).

**Sistemas de coordenadas de los JSON:**
- La mayoría usa el cuadrado de 2160.
- Compromiso usa un retrato de 2160×2700: y de la carta = y del json − 270.
- Perdón usa un retrato de 2160×2700: carta = 0.8·json + (216, 0).
- Paciencia guarda fracciones de la caja del bote.

### Dónde nace el rulito: decidido

Decidido por Juan Manuel el 1 de noviembre. Manda sobre la regla 2.

| Carta | Dónde va el rulito | Qué cambia |
|---|---|---|
| 2 Dana | como está hoy | nada: se descarta el arreglo que proponía este plan |
| 32 Transformación | sobre la semilla (del mundo Sporá), como está hoy | nada; solo cuidar que la semilla, al hincharse, no se meta en el rulito. La caja del JSON que marca la espiral de la semilla es la que se usa; el rulito amarillo de la carta junto a la copa no se usa |
| 29 Sincronicidad | como está hoy | nada |
| 16 Compromiso | sobre el Sama grande del bote | deja de usar la "z" del cielo y el tope contra el borde de la pantalla |
| 30 Esperanza | sobre Vulpes | deja de estar sobre el ancestro sentado; los hilos lo esquivan con `hole` |
| 21 Desafío | sobre Vulpes | deja de estar sobre la luz del laberinto, donde podía tapar el nombre |
| 5 Khanti | arriba de todo el sistema de tubos, para que se vea | deja de estar sobre el cartel del centro |
| 14 Celebración | **un rulito sobre cada personaje** de la ronda | deja de haber uno solo sobre la llama |
| 18 Confianza | sobre todo el laberinto | deja de estar sobre la chakana |
| 12 Armonía | **un rulito sobre cada medusa** (dos) | deja de haber uno solo entre las dos |
| 17 Comunicación | sobre la medusa del medio | deja de estar en la luz |
| 13 Belleza | sobre Sid, el que está abrazando al otro | deja de estar a mano, corrido sobre el ser de atrás |
| 0 Nekkhamma | como está hoy | nada |

**Creatividad, Evolución y Hogar:** el rulito va **sobre la cabeza del personaje** (decidido), no donde la carta dibuja el tenue al costado. Tiene que acompañarlo: colgado de él o copiando su escala y su giro.

**Para que el rulito acompañe:** cuando cuelga de un grupo pero el personaje se estira o gira dentro de ese grupo (`sy`, `rotate`), el rulito no lo sigue. Lo mejor es colgarlo del mismo nodo que el personaje, o copiarle también la escala y el giro.

---

## Paquete A: Arraigar (mantener)

Gesto de la mano: `hold` sobre lo que se sostiene. Motor común: `useRooting.js`, para Compromiso, Confianza y Fe.

**Regla 4 en todas:** al soltar, lo crecido se deshace de a poco (la cola del rulito alcanza a la cabeza). `useRooting.js`, Paciencia y Hogar ya lo hacen; revisar Addhitthana y que las seis se sientan iguales.

- **27 Paciencia:** ✅ pista hecha (con la espera de 7 s también después de ganar). El lugar del rulito está bien (fracciones del bote, coincide con la carta).
  - **Cuándo nace el rulito (pedido de Juan Manuel):** tiene que nacer **cuando las raíces están completas**, no mientras se están creando. Hoy nace con las raíces a un 30 % (`rootGrow >= 0.3` en `ScenePaciencia.vue`). Pasa a `rootGrow >= 1`, y revisar que el tiempo total sostenido siga sintiéndose bien.
- **25 Hogar:**
  - Hoy solo hay pista antes del primer toque (el núcleo late). Hace falta `hold` sobre el núcleo, también después.
  - **Cuándo nace el rulito:** como en Paciencia, tiene que nacer cuando las raíces llegaron todas, no mientras crecen. Hoy nace con las raíces a un cuarto (`BORN = 0.25`).
  - Rulito: ver la decisión sobre los rulitos tenues. Hoy no sigue el `sy` ni el giro de la larva (`SceneHogar.vue` ≈491-494 y 594-597).
- **7 Addhitthana:**
  - Pista: `hold` sobre Particular.
  - Rulito bien (`art.rulito`, en `L.boat`).
  - Doc desactualizada en `docs/escenas.md`: dice `HOLD` 4.2, pero el código tiene `CHARGE` 1.6 + `HOLD` 3.4; dice `LINGER` 9, pero es 4; dice un `kindle` "en cada cuarto", pero es en tercios.
- **16 Compromiso:**
  - Pista: `hold` sobre los seres (hoy echa chispas al pie del camino).
  - **El rulito es el peor caso:** usa la "z" del cielo y, en el teléfono, queda pegado al borde derecho bajo el título (`SceneCompromiso.vue` ≈319-325). Va **sobre el Sama grande del bote** (decidido).
- **18 Confianza:**
  - La pista actual (destello y un anillo) es igual al anillo que el fondo manda cada 7 s (`RING`), así que no se distingue. Hace falta `hold` sobre el centro.
  - Rulito: va **sobre todo el laberinto** (decidido); hoy está sobre la chakana.
- **23 Fe:**
  - Pista: `hold` sobre Sid.
  - Rulito sobre Sid, bien (x = 1090; la cabeza está en ≈1123, se puede afinar).

## Paquete B: Soltar (tocar lo que se va; mantener al personaje es respirar)

Gestos de la mano: `tap` sobre lo que se suelta. Cada tanto, `hold` sobre el personaje, porque hoy nada enseña que se puede respirar.

**Regla 4 en todas:** dejado solo, lo soltado vuelve de a poco, como en Nekkhamma. Revisar Vipassana, Upekkha, Ciclos y Perdón: si hoy no vuelven atrás, sumarlo (con un tiempo parecido al de Nekkhamma: 15 s solo, y después una cosa cada 4 s).

- **0 Nekkhamma:** el rulito está bien (decidido).
  - Pista: `tap` sobre el brote que hoy pulsa (el primero atado, `HINT` 7), y a veces `hold` sobre Sid.
  - Dejado solo 15 s le vuelve a crecer un hilo: está bien así (decidido), es la regla 4.
- **31 Vipassana** (ejemplo de la etapa 1):
  - Pista: `tap` sobre la célula que hoy brilla (`cellField.hint()`), y a veces `hold` sobre Sid.
  - Rulito sobre Sid, bien.
- **9 Upekkha:**
  - Pista: `tap` sobre el pensamiento que hoy brilla, y a veces `hold` sobre Sid.
  - **Rulito:** el lugar es el de la carta, pero en pantalla ancha probablemente queda cortado arriba o tapa el nombre. El `layout` pone la fila de arte 560 a 130 px del borde y el rulito empieza 200 px de arte más arriba (`SceneUpekkha.vue` 63-79 contra 944-948). Hay que bajar o achicar el encuadre en ancho.
- **15 Ciclos:**
  - Pista: `tap` sobre la gota que hoy se hincha, y a veces `hold` sobre Sid.
  - Rulito sobre Sid, bien.
- **28 Perdón:**
  - Pista: `tap` sobre el nudo que late, y a veces `hold` sobre Particular.
  - Rulito: el mejor anclado de todos (caja de la carta, cuelga de Particular).

## Paquete C: Fluir (deslizar con la corriente)

Gesto de la mano: `slide` a lo largo del tramo de ruta que está delante de la cabeza, a su ritmo. Motor común: `useFlow.js`.

- **Común a las cuatro:** la "llamada" (`call = touched ? clamp((idle-3)/2) : 1`) está copiada con números sueltos en las cuatro escenas. Conviene llevarla, junto con la pista, a `useFlow.js`: algo como un `flow.hintPath(len)` que devuelva los próximos puntos de la ruta para `gesture.slide`.
- **5 Khanti** (ejemplo de la etapa 1):
  - Rulito: hoy en porcentajes fijos a mano sobre el cartel (`SceneKhanti.vue` ≈683-685). Va **arriba de todo el sistema de tubos, para que se vea** (decidido), calculado desde la caja de los tubos y no en porcentajes a mano.
- **11 Aceptación:**
  - Rulitos: las cajas de la carta, bien.
  - Al ganar, los seres se estiran (`hop`) y la cabeza entra en el rulito: o se cuelgan de cada ser, o se acota el estirón.
- **14 Celebración:**
  - Rulito: hoy hay uno solo sobre la llama, y al crecer (`grown`) la llama lo atraviesa (`SceneCelebracion.vue` ≈649). Va **un rulito sobre cada personaje** de la ronda (decidido), cada uno colgado de su personaje.
- **32 Transformación:**
  - Rulito: va **sobre la semilla, como está hoy** (decidido). Solo cuidar que la semilla, al hincharse (escala ≈1.13), no se meta en el pie del rulito.

## Paquete D: Encender (frotar, después tirar y soltar)

Gesto de la mano: en frío, `rub` sobre la fuente; encendido, `sling` desde la fuente hacia lo próximo sin encender. Motor común: `useKindle.js`.

- **Común:** la pista vive repetida en cada escena (`kindler.idle > 7`). Conviene un helper en `useKindle.js` que, dados la mano, el hit y el próximo objetivo, elija `rub` o `sling` según `mode`. Viriya ya tiene la lógica inline: sirve de modelo.
- **4 Viriya:**
  - ✅ pista hecha.
  - Rulito bien (caja de la carta, en `L.walker`).
  - Doc: `docs/escenas.md` cita `RUB`, `STEADY`, `COOL` y `FUEL` como constantes, pero ahora son los valores por defecto de `useKindle`.
- **22 Evolución** (ejemplo de la etapa 1):
  - Pista: `rub` dentro de la célula y después `sling` del ser.
  - Rulito:
    - Ver la decisión sobre los rulitos tenues.
    - Hoy está centrado en 0.5 de la caja del ser, pero la cabeza está en ≈0.3.
    - Solo copia x e y de `L.being`, no su giro ni su `sy` (`SceneEvolucion.vue` ≈431-435 y 524-526).
- **19 Coraje:**
  - Pista: `rub` sobre Kätus y después `sling` hacia la franja de luna más cercana sin encender.
  - Rulito: caja de la carta, bien. Pero al estirarse (`up`), la cabeza llega casi a la base del rulito.
  - Doc: `docs/escenas.md`:116 todavía dice "not played yet".
- **21 Desafío:**
  - Pista: `rub` sobre Vulpes y después `sling` hacia la puerta.
  - Rulito: sobre la luz del laberinto; puede tocar el nombre (sube por encima de `TOP` = 330) y las motas lo atraviesan. Va **sobre Vulpes** (decidido).
  - Doc: dice que un toque en Vulpes toca el acorde, pero hoy frota.
- **Sonido:** en `CLAUDE.md`, sección Sound, faltan los `resolve` de Coraje (E7 → A) y de Desafío (D7 → G).

## Paquete E: Resonar (a tiempo, en eco o libre)

Gestos de la mano:
- **A tiempo:** `tap` lanzado con `TAP_LEAD` antes del pulso, para que apoye justo en el tiempo, dos o tres pulsos seguidos.
- **En eco:** `taps` en el orden de la frase.
- **Libre:** `tap` sobre una pieza apagada.

Cartas:
- **1 Sila:**
  - Pista: `tap` a tiempo sobre el corazón del atril. Hoy el corazón de Sid le manda el pulso al atril, que está bien pero no muestra el dedo.
  - Rulito: caja de la carta, bien. Cuelga de `L.figures`, no del corazón, así que no sigue su estirón al hablar (menor).
- **29 Sincronicidad** (ejemplo de la etapa 1):
  - **No tiene pista por inactividad:** hace falta `tap` a tiempo sobre la burbuja que brilla.
  - Rulito: **está bien como está** (decidido).
- **6 Sacca:**
  - Pista: `taps` sobre una nube de cada color de la frase, en orden.
  - Rulito: caja de la carta, bien.
  - El comentario de la línea 203 dice que las cuentas están "sobre el vigía"; el código las pone bajo el bote.
- **20 Creatividad:**
  - **No tiene ninguna pista:** hace falta `tap` sobre un coral apagado.
  - Rulito: ver la decisión sobre los rulitos tenues. Hoy está corrido a la derecha de la campana (0.33 contra ≈0.2 de la caja) y no sigue su `sy` ni su giro.
  - Doc: dice que con movimiento reducido "no se juega", pero `compose()` no lo revisa.
- **12 Armonía:**
  - Pista: `tap` a tiempo sobre la medusa derecha, en los pulsos (no en el silencio).
  - Rulito: hoy hay uno entre las medusas. Va **un rulito sobre cada medusa** (decidido), cada uno colgado de la suya. Cuidar que no se acerquen al nombre en pantallas altas.
- **17 Comunicación:**
  - Pista: `taps` sobre los seres en el orden cantado.
  - Rulito: en la luz, a la profundidad de los seres, así que se desliza con la paralaje (`DEPTH.beings` contra `DEPTH.light`). Va **sobre la medusa del medio** (decidido).
- **26 Honestidad:**
  - Pista: primero `tap` sobre una burbuja despierta; con todas calladas, `tap` a tiempo sobre la medusa, en el ritmo de la frase.
  - Rulito sobre la medusa, bien.

## Paquete F: Dar y recibir (tocar a quien todavía no recibió)

Gesto de la mano: `tap` sobre el que hoy titila. Motor común: `useGiving.js`, que hoy pone el `flash` al azar: ahí puede vivir la llamada a la mano.

- **2 Dana** (ejemplo de la etapa 1):
  - Pista: `tap` sobre el receptor que hoy titila.
  - Rulito: **está bien como está** (decidido). No se cambia.
- **8 Metta:**
  - **Pista contradictoria:** antes de que Sid se ame, el motor hace titilar a un receptor que todavía no se puede tocar (`useGiving.js`:138), al mismo tiempo que la luz de Sid llama. La primera pista tiene que ser solo `tap` sobre Sid.
  - Rulito bien.
- **24 Gratitud:**
  - Pista: `tap` sobre lo que falta agradecer. Hoy reaccionan el sol, la palmera y uno al azar a la vez, lo que es confuso.
  - Rulito sobre Sid, bien.

## Paquete G: Ver (unir luces, o mirar quieto)

Gestos de la mano: `drag` entre las dos luces del primer hilo que falta (Pañña, Esperanza); `hold` quieto sobre el escondido que destella (Belleza).

- **3 Pañña:**
  - ✅ pista hecha.
  - Rulito: fracciones fijas del marco, no la caja de Sid de `pannaLayers.json`. Hoy coinciden, pero si se cambia la capa, el rulito no la sigue.
  - Los comentarios de las líneas 10-13 y 418-423 hablan de una "estrella de ocho hilos" que ya no existe.
- **30 Esperanza:**
  - Pista: `drag`, como Pañña.
  - **Pedido nuevo: que las constelaciones tengan formas más reconocibles.**
    - Hoy el juego pide **tres ancestros** antes del rulito, siempre en el mismo orden: sentado (7 hilos), caminando (6) y descansando (6). Cada uno trae 2 estrellas señuelo, así que son 19 hilos como mínimo. Las formas están en `FIGURES` (`SceneEsperanza.vue` ≈118-128) y son polígonos que no se leen como zorros.
    - **Decidido por Juan Manuel:** zorros como Vulpes, con lo que más los distingue (orejas, hocico, cola). Siguen siendo tres ancestros, en este orden:
      1. **A, cabeza de frente** (7 estrellas, 7 hilos): dos orejas en punta, las mejillas y el hocico. Reemplaza al sentado, que no se entendía.
      2. **C, caminando** (7 estrellas, 6 hilos): la cabeza con una oreja, el lomo, dos patas y la cola alta. Reemplaza al caminando de hoy.
      3. **D, durmiendo enroscado** (7 estrellas, 7 hilos): un ovillo con las dos orejas arriba. Es el más viejo y reemplaza al descansando de hoy. La eligió Claude entre tres opciones; Juan Manuel la puede cambiar.
    - **Coordenadas para `FIGURES`** (x, y de 0 a 1 en la caja de la figura; `aspect` = alto/ancho):
      - A: `aspect: 1`, `stars: [[0.05,0],[0.35,0.3],[0.65,0.3],[0.95,0],[0.85,0.55],[0.5,1],[0.15,0.55]]`, `links: loop(7)`.
      - C: `aspect: 0.6`, `stars: [[0,0.25],[0.12,0],[0.2,0.3],[0.62,0.32],[0.92,0],[0.6,1],[0.25,1]]`, `links: [[0,1],[1,2],[2,3],[3,4],[3,5],[2,6]]`.
      - D: `aspect: 1`, `stars: [[0.12,0],[0.24,0.2],[0.36,0.02],[0.95,0.35],[0.85,0.9],[0.3,1],[0,0.55]]`, `links: loop(7)`.
      - Los señuelos (2 por figura) y el `rest` (dónde se para detrás de Vulpes) se ajustan al probarlas en pantalla. Ninguna pasa de 7 hilos, así que `MAX_LINKS` queda igual.
  - **Rulito:**
    - Hoy está en `HEAD_AT`, a mano, sobre el ancestro sentado: casi pegado a él, y los hilos de bajada lo cruzan (sin `threads.hole`).
    - La caja del JSON es la "z" del cielo.
    - Va **sobre Vulpes** (decidido), con `hole` para que los hilos lo esquiven.
- **13 Belleza:**
  - Pista: hoy destella el escondido (solo *dónde*). Hace falta `hold` quieto sobre él, que es el gesto, con el anillo llenándose.
  - Rulito: `RULITO_AT` a mano, corrido hacia el borde derecho del ser de atrás, colgado de `L.pair`, que no se mueve. Va **sobre Sid, el que está abrazando al otro** (decidido), colgado de él.
  - Doc: dice "en cualquier parte", pero sobre los dos personajes no cuenta como mirar.

---

## Orden

1. **Etapa 1:** ✅ la mano está en las siete cartas de ejemplo (Vipassana, Khanti, Evolución, Dana y Sincronicidad, en la rama `claude/etapa1-mano-fantasma`). Falta que Juan Manuel las pruebe en un teléfono (paso 2).
2. **Paquete 0:** ✅ cerrado. El aspecto de la mano está aprobado; el color se ajusta por carta donde falte contraste.
3. **Paquete H, puntos 1 a 4**, en paralelo con lo anterior: documentar lo ya decidido.
4. **Después del paquete 0, dos frentes a la vez:**
   - **En paralelo, los paquetes A a G**, solo para las 14 cartas que no son del 31/10. Empezar por:
     - el rulito de Upekkha en pantalla ancha;
     - las cartas sin pista: Creatividad y Hogar.
   - **De a una, con Juan Manuel, la revisión de las 18 cartas del 31/10.** Cada una lleva adentro sus arreglos de los paquetes. Conviene empezar por lo más roto:
     - el rulito de Compromiso;
     - la pista de Metta;
     - los rulitos nuevos de Celebración y Armonía, uno por personaje.
     - Esperanza incluye las formas de las constelaciones.
5. **Paquete S, soles y lunas:** en paralelo, para las escenas que no son del 31/10. Honestidad primero, porque fue el pedido.
6. **Paquete H, punto 5:** volver a publicar el artefacto "Anima GDD" con todo al día.

## Decisiones abiertas (las toma Juan Manuel)

- **Soles y lunas (paquete S):** si Perdón (un planeta con contorno) y Confianza (una luz) entran, y en cada uno si queda todo de puntos o el disco con el borde disuelto.

**Ya decididas** (1 de noviembre):
- **La mano:** el aspecto está bien. Donde falte contraste, se le ajusta el color en esa carta (navy con halo crema).
- **Creatividad, Evolución y Hogar:** el rulito va sobre la cabeza del personaje.
- **Esperanza:** tres ancestros zorros: A (cabeza de frente), C (caminando) y D (durmiendo enroscado).
- **Nekkhamma, y todas las de Soltar y Arraigar:** dejadas solas, vuelven atrás (regla 4).
- **Dónde va cada rulito:** la tabla "Dónde nace el rulito: decidido".
