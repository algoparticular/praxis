# Plan: revisión de los verbos jugables (pistas y rulitos)

Revisión del 1 de noviembre de 2026, sobre `main` con los PR 79, 80 y 81 (las 32 cartas con verbo, jugables). Lo de abajo sale de **leer el código y mirar las ilustraciones**; no se probó en pantalla, así que cada arreglo se confirma en un teléfono antes de mergear (ver `CLAUDE.md`, Checks).

El problema de fondo: casi todas las escenas, dejadas solas, hacen brillar algo. Eso dice **dónde** tocar pero no **cómo** (mantener, frotar, tirar y soltar, arrastrar, deslizar, tocar a tiempo, repetir en orden). Y el rulito nace con criterios distintos en cada escena, algunos en lugares arbitrarios.

## Reglas decididas

1. **Las pistas no tienen texto.** Muestran el gesto, con la **mano fantasma**: un dedo de luz hecho de puntos (opción C), que hace el gesto sobre el lugar real.
2. **El rulito nace donde lo dibuja la carta original. Si la carta no dibuja uno, nace sobre un personaje.** Nunca sobre un lugar fijo de la pantalla ni sobre un objeto que no es un personaje.
3. Lo de siempre (`docs/verbos-y-dinamicas.md`): nada se pierde, la lectura no se bloquea, se juega con teclado y con movimiento reducido.

## Paquete 0: la mano fantasma (`src/composables/useGhostHand.js`)

**Hecha y en uso** en Paciencia (mantener), Viriya (frotar y, encendido, tirar y soltar) y Pañña (arrastrar). Commit `Ghost hand: …` en `claude/music-chakra-cards-jft7f9`.

**Cómo se usa en una escena:**

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
- **Tiempo quieto:** la mano lleva su propia cuenta, con reloj real; `due(segundos)` dice si ya pasó. Cualquier toque o tecla la hace irse al instante. Con movimiento reducido no aparece.

**Pendiente, esperando la opinión de Juan Manuel sobre los videos:**
- Tamaño, brillo, velocidad y repeticiones (hoy repite 2 veces).
- Contraste sobre personajes o cielos claros: en el caminante crema de Viriya se pierde un poco. Opciones: un halo oscuro más fuerte (hoy 0.13), o un color por carta (`createGhostHand(stage, { color })`).
- **Este archivo se toca solo desde un chat a la vez**, para no pisarse. Los demás paquetes solo lo usan.

## Cómo repartir

Cada paquete toca sus escenas y, como mucho, el motor de su verbo. Se pueden hacer en paralelo. En cada carta:

1. Reemplazar o completar la pista con el gesto de la mano.
2. Mover el rulito según la regla 2.
3. Arreglar lo marcado.
4. Poner al día `docs/escenas.md` y `CLAUDE.md` en lo que cambie.

Al terminar, `npm run check` y probar en un teléfono.

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

**Cajas guardadas que no son rulitos (hay que corregirlas):**
- **Compromiso**, `compromisoScene.json` `rulito`: es la "z" amarilla del cielo.
- **Esperanza**, `esperanzaScene.json` `rulito`: también es una "z" del cielo.
- **Transformación**, `transformacionScene.json`: marca la espiral de la semilla.

**Sistemas de coordenadas de los JSON:**
- La mayoría usa el cuadrado de 2160.
- Compromiso usa un retrato de 2160×2700: y de la carta = y del json − 270.
- Perdón usa un retrato de 2160×2700: carta = 0.8·json + (216, 0).
- Paciencia guarda fracciones de la caja del bote.

**A decidir con Juan Manuel:**
- **Creatividad, Evolución y Hogar:** ¿se respeta el rulito tenue de la carta, al costado del personaje, o va sobre su cabeza?
- **El personaje elegido** en las cartas sin rulito donde hoy cae sobre algo que no es un personaje. Propuestas:
  - Compromiso: el ser grande del bote.
  - Esperanza: el ser del aura rosa.
  - Desafío: Vulpes.
  - Khanti: por definir; hoy está sobre el cartel.
  - Celebración: por definir; hoy está sobre la llama.
  - Confianza: por definir; hoy está sobre la chakana.
  - Armonía: por definir; hoy está entre las medusas.
  - Sincronicidad: por definir; hoy está sobre la burbuja de la pareja.
  - Comunicación: por definir; hoy está en la luz.
  - Belleza: por definir; hoy está sobre la pareja, corrido.

**Para que el rulito acompañe:** cuando cuelga de un grupo pero el personaje se estira o gira dentro de ese grupo (`sy`, `rotate`), el rulito no lo sigue. Lo mejor es colgarlo del mismo nodo que el personaje, o copiarle también la escala y el giro.

---

## Paquete A: Arraigar (mantener)

Gesto de la mano: `hold` sobre lo que se sostiene. Motor común: `useRooting.js`, para Compromiso, Confianza y Fe.

- **27 Paciencia:** ✅ pista hecha. El rulito está bien (fracciones del bote, coincide con la carta).
- **25 Hogar:**
  - Hoy solo hay pista antes del primer toque (el núcleo late). Hace falta `hold` sobre el núcleo, también después.
  - Rulito: ver la decisión sobre los rulitos tenues. Hoy no sigue el `sy` ni el giro de la larva (`SceneHogar.vue` ≈491-494 y 594-597).
- **7 Addhitthana:**
  - Pista: `hold` sobre Particular.
  - Rulito bien (`art.rulito`, en `L.boat`).
  - Doc desactualizada en `docs/escenas.md`: dice `HOLD` 4.2, pero el código tiene `CHARGE` 1.6 + `HOLD` 3.4; dice `LINGER` 9, pero es 4; dice un `kindle` "en cada cuarto", pero es en tercios.
- **16 Compromiso:**
  - Pista: `hold` sobre los seres (hoy echa chispas al pie del camino).
  - **El rulito es el peor caso:** usa la "z" del cielo y, en el teléfono, queda pegado al borde derecho bajo el título (`SceneCompromiso.vue` ≈319-325). La carta no dibuja rulito, así que va sobre un personaje (a decidir).
- **18 Confianza:**
  - La pista actual (destello y un anillo) es igual al anillo que el fondo manda cada 7 s (`RING`), así que no se distingue. Hace falta `hold` sobre el centro.
  - Rulito sobre la chakana: a decidir si va sobre un ser.
- **23 Fe:**
  - Pista: `hold` sobre Sid.
  - Rulito sobre Sid, bien (x = 1090; la cabeza está en ≈1123, se puede afinar).

## Paquete B: Soltar (tocar lo que se va; mantener al personaje es respirar)

Gestos de la mano: `tap` sobre lo que se suelta. Cada tanto, `hold` sobre el personaje, porque hoy nada enseña que se puede respirar.

- **0 Nekkhamma:**
  - Pista: `tap` sobre el brote que hoy pulsa (el primero atado, `HINT` 7), y a veces `hold` sobre Sid.
  - Rulito: usa la caja de la carta escrita a mano (`RULITO`, línea 78). Coincide; se puede pasar al JSON.
  - Ojo: dejado solo 15 s le vuelve a crecer un hilo, así que se pierde avance. Revisar si choca con "nada se pierde".
- **31 Vipassana:**
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
- **5 Khanti:**
  - Rulito: hoy en porcentajes fijos a mano sobre el cartel (`SceneKhanti.vue` ≈683-685). La carta no dibuja rulito, así que va sobre un personaje (a decidir).
- **11 Aceptación:**
  - Rulitos: las cajas de la carta, bien.
  - Al ganar, los seres se estiran (`hop`) y la cabeza entra en el rulito: o se cuelgan de cada ser, o se acota el estirón.
- **14 Celebración:**
  - Rulito sobre la llama: al crecer (`grown`), la llama atraviesa la mitad de abajo del rulito (`SceneCelebracion.vue` ≈649). Va sobre un personaje (a decidir) o, como mínimo, más arriba.
- **32 Transformación:**
  - Rulito: hoy está fijo sobre la semilla, y la semilla al hincharse lo toca.
  - **El de la carta** está en [1178,391,62,179], a la derecha de la copa: hay que moverlo ahí y corregir la caja del JSON y el comentario (línea 21).

## Paquete D: Encender (frotar, después tirar y soltar)

Gesto de la mano: en frío, `rub` sobre la fuente; encendido, `sling` desde la fuente hacia lo próximo sin encender. Motor común: `useKindle.js`.

- **Común:** la pista vive repetida en cada escena (`kindler.idle > 7`). Conviene un helper en `useKindle.js` que, dados la mano, el hit y el próximo objetivo, elija `rub` o `sling` según `mode`. Viriya ya tiene la lógica inline: sirve de modelo.
- **4 Viriya:**
  - ✅ pista hecha.
  - Rulito bien (caja de la carta, en `L.walker`).
  - Doc: `docs/escenas.md` cita `RUB`, `STEADY`, `COOL` y `FUEL` como constantes, pero ahora son los valores por defecto de `useKindle`.
- **22 Evolución:**
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
  - Rulito: sobre la luz del laberinto; puede tocar el nombre (sube por encima de `TOP` = 330) y las motas lo atraviesan. Va sobre Vulpes (propuesta).
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
- **29 Sincronicidad:**
  - **No tiene pista por inactividad:** hace falta `tap` a tiempo sobre la burbuja que brilla.
  - Rulito:
    - Ancho = 0.065 del marco.
    - Solo copia la `y` del grupo de la burbuja, no su escala ni su giro, así que puede hundirse en la burbuja al nacer.
    - Va sobre un personaje (a decidir).
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
  - Rulito: entre las medusas, coherente, pero a decidir si va sobre una. Con el marco abajo en pantallas altas puede acercarse al nombre.
- **17 Comunicación:**
  - Pista: `taps` sobre los seres en el orden cantado.
  - Rulito: en la luz, a la profundidad de los seres, así que se desliza con la paralaje (`DEPTH.beings` contra `DEPTH.light`). A decidir si va sobre un ser.
- **26 Honestidad:**
  - Pista: primero `tap` sobre una burbuja despierta; con todas calladas, `tap` a tiempo sobre la medusa, en el ritmo de la frase.
  - Rulito sobre la medusa, bien.

## Paquete F: Dar y recibir (tocar a quien todavía no recibió)

Gesto de la mano: `tap` sobre el que hoy titila. Motor común: `useGiving.js`, que hoy pone el `flash` al azar: ahí puede vivir la llamada a la mano.

- **2 Dana:**
  - **Rulito:** la carta dibuja **uno solo**, blanco, sobre el ser de la derecha, en [1416,472,76,233]. La escena pone dos rulitos en porcentajes del marco, colgados de `L.isle`, que no siguen el giro de los amigos (`SceneDana.vue` 123, 145-149, 532-533 y 604). Hay que usar el de la carta, colgado de ese ser.
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
  - **Pedido nuevo: que las constelaciones (los ancestros: sentado, caminando, descansando) tengan formas más reconocibles.** Falta definir con Juan Manuel cuáles formas.
  - **Rulito:**
    - Hoy está en `HEAD_AT`, a mano, sobre el ancestro sentado: casi pegado a él, y los hilos de bajada lo cruzan (sin `threads.hole`).
    - La caja del JSON es la "z" del cielo.
    - Va sobre el ser del aura rosa (propuesta), con `hole` para que los hilos lo esquiven.
- **13 Belleza:**
  - Pista: hoy destella el escondido (solo *dónde*). Hace falta `hold` quieto sobre él, que es el gesto, con el anillo llenándose.
  - Rulito: `RULITO_AT` a mano, corrido hacia el borde derecho del ser de atrás, colgado de `L.pair`, que no se mueve. Va centrado sobre un personaje (a decidir).
  - Doc: dice "en cualquier parte", pero sobre los dos personajes no cuenta como mirar.

---

## Orden sugerido

1. **Paquete 0:** cerrar el aspecto de la mano con Juan Manuel. Todo lo demás la usa.
2. **En paralelo, un chat por paquete (A a G).** Empezar por lo más roto:
   - el rulito de Compromiso;
   - el rulito de Upekkha en pantalla ancha;
   - el rulito de Dana;
   - el rulito de Transformación;
   - la pista de Metta;
   - las cartas sin pista: Creatividad, Sincronicidad y Hogar.
3. **Esperanza:** las formas de las constelaciones, cuando estén definidas.
