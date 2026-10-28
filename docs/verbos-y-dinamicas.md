# Verbos y dinámicas

Decisión: los juegos de las cartas se organizan en **7 verbos**, uno por personaje / chakra / nota. Cada verbo es la dinámica básica de una familia de juegos; cada carta toma el verbo que le calza por su significado y lo viste con su propia ilustración. Fuente de los personajes: Notion, Algo Particular / BIOs.

Qué dinámica propone cada verbo: más abajo, en "Dinámicas: qué propone cada verbo".

## Reglas de los verbos
- **El verbo lo decide el significado de la carta.** El personaje dibujado puede ser otro (la asignación de personajes a cartas a veces es libre). Por eso serían dos campos distintos en `cards.json`: `verb` y `character`. Todavía no se agregaron.
- **Sin perder, sin puntaje.** El gesto se completa o se vuelve a intentar.
- **El premio es siempre el rulito** (la espiral de conexión con el Todo, ya presente en la landing, Vipassana y Pañña): al completar el gesto de una carta, aparece o se enciende.
- **No bloquea la lectura.** La descripción, la afirmación y la invitación están siempre disponibles.
- Cada verbo trabaja contra el "demonio" de su chakra (ver tabla). Idea a validar con Belén.

## Los 7
| # | Personaje | Chakra | Nota | Propósito | Demonio | Verbo | Qué hace la persona |
|---|-----------|--------|------|-----------|---------|-------|---------------------|
| 1 | Sporá | Raíz, rojo | Do | Asentamiento | Miedo | **Arraigar** | Sostener, plantar, quedarse quieto hasta que algo crece o se enciende |
| 2 | Samas | Sacro, naranja | Re | Movimiento y conexión | Culpa | **Fluir** | Moverse con otros, dejarse llevar, seguir una corriente |
| 3 | Kätus | Plexo solar, amarillo | Mi | Transformación | Vergüenza | **Encender** | Cargar y soltar, atravesar el fuego, encender cosas |
| 4 | Vulpes | Corazón, verde | Fa | Amor, equilibrio | Pena | **Dar y recibir** | Extender y recoger, pasar algo de uno a otro, equilibrar |
| 5 | Aura | Garganta, celeste | Sol | Comunicación, creatividad | Mentiras | **Resonar** | Escuchar y responder, ritmo, secuencia |
| 6 | Huit | Tercer ojo, lavanda | La | Reconocer el patrón | Ilusión | **Ver** | Descubrir lo oculto, unir puntos, revelar |
| 7 | Particular (¿Sid?) | Corona, violeta | Si | Comprensión | Apego | **Soltar** | Dejar pasar, vaciar |

Las notas siguen la correspondencia tradicional Do–Si; la decisión de música se toma aparte.

## Dos corrientes: de Arraigar a Soltar
Lectura de trabajo, a validar con Belén. Sale del libro *Cuerpo de Oriente, mente de Occidente* (corrientes energéticas y el viaje completo de los chakras) y de las notas de Belén en Notion. Los "7 movimientos" de esas notas son estos siete verbos.

La energía de los chakras corre en dos sentidos:
- **Corriente de manifestación** (baja): impulso del alma y del cuerpo. Se mueve hacia la forma, la densidad, los límites, la contracción y la individualidad.
- **Corriente de liberación** (sube): impulso de la mente y el espíritu. Se mueve hacia la libertad, la expansión, la abstracción y la universalidad.

Los siete verbos, uno por chakra, quedan ordenados entre dos polos:
- **Arraigar** (raíz) es el polo de la manifestación: de la materia a la manifestación. Está probado en Paciencia.
- **Soltar** (corona) es el polo de la liberación: del entendimiento a la existencia. Está probado en Vipassana.
- **Dar y recibir** (corazón) es donde las dos corrientes se encuentran. Las notas de Belén lo dicen así: "dos triángulos entrelazados, el movimiento descendente del espíritu en la materia y la liberación ascendente de la materia en el espíritu: equilibrio perfecto en el corazón". Todavía no se probó en ninguna escena.
- **Fluir, Encender, Resonar y Ver** serían los pasos entre un polo y el otro.

Esto se parece a lo que el rulito premia: en las notas del tercer chakra, "siento las dos corrientes, ascendente de liberación y descendente de manifestación, que se unen en mí para manifestar mi propósito de ser quien soy".

Las palabras del libro para cada chakra, subiendo y bajando:

| Verbo | Chakra | Sube | Baja |
|-------|--------|------|------|
| Arraigar | Raíz | Materia | Manifestación |
| Fluir | Sacro | Movimiento | Conexión |
| Encender | Plexo solar | Energía | Transformación |
| Dar y recibir | Corazón | Amor | Compasión |
| Resonar | Garganta | Creatividad | Inspiración |
| Ver | Tercer ojo | Perspicacia | Iluminación |
| Soltar | Corona | Entendimiento | Existencia |

## Decidido
- Carta 10 (`" ... "`): es el silencio. No hay nada que leer ni decir, la invitación es sentir el corazón. Su verbo va entre Fa, Sol o La (por decidir); la forma, por definir.
- Nombre del personaje: **Sid** (Seed, semilla).
- El bichito con pelos y antenas es un Sama. El ser dentro de la célula de Evolución es Sid.
- Khanti es **Fluir** (Samas), no Soltar: los corchos que vacían los frascos quedan como la parte de soltar dentro de ese juego.
- Creatividad y Hogar intercambian la ilustración entera (corona, personaje, imagen de la carta y colores). Creatividad: corales y medusa (Aura). Hogar: hongos y larva (Sama).
- Vipassana es **Soltar** (el "ver las cosas tal cual son" lleva al desapego).
- Hogar se queda con la larva (Sama). Sid va dentro de Evolución Espiritual, que es donde mejor calza.

## Reglas comunes de las dinámicas
- **Nada se pierde ni se falla.** No hay puntaje, tiempo límite ni "game over". Si el gesto no se completa, la escena sigue viva y se puede intentar de nuevo.
- **El premio es el rulito.** Completar el gesto es "uy, me conecté con el Todo": el rulito aparece, se dibuja o se enciende. Cada conexión es distinta: el rulito nunca sale con la misma forma dos veces. No se ve hasta que se empieza a jugar.
- **La lectura no se bloquea.** La descripción, la afirmación y la invitación están siempre disponibles. El juego no es una puerta.
- **Se puede jugar sin tocar la pantalla:** con teclado (Enter o espacio) y con `prefers-reduced-motion` (sin chispas ni animaciones largas, pero el gesto funciona).
- **Suena en el acorde de la carta** (`src/data/cardChords.js`): los toques son notas de ese acorde, el cierre del gesto es un `star`.
- **Dura poco.** Un gesto completo se resuelve en pocos segundos y se puede repetir.

## Dinámicas: qué propone cada verbo

Cada carta tiene un verbo (`verb` en `src/data/cards.json`, lista en `src/data/verbs.js`). El verbo define la **dinámica**: qué hace la persona con la escena. La ilustración, el sonido y el significado los pone cada carta. Los siete verbos son uno por personaje y chakra (ver arriba).

Tres verbos se probaron en una escena: **Arraigar en Paciencia**, **Soltar en Vipassana** y **Ver en Pañña**. Lo implementado no es fijo: son ideas probadas y pueden cambiar. El resto son propuestas, tomando como punto de partida lo que ya hacen las escenas.

Orden de los verbos: Arraigar (raíz) y Soltar (corona) son los dos polos, la corriente de manifestación y la de liberación, y Dar y recibir (corazón) es donde se encuentran. Los dos polos están probados; el centro, no. Ver arriba, sección "Dos corrientes".

### 1. Arraigar (Sporá, demonio: miedo) — implementado en Paciencia
**Dinámica:** sostener. Mantener apretado un punto de la escena hasta que algo crece.
**Cómo funciona hoy en Paciencia:** al mantener apretada la piña (dedo, clic o tecla) primero crece una red de raíces doradas bajo el campo de hongos, saliendo de la piña (unos 2,4 segundos para extenderse del todo). Cuando las raíces han agarrado (a un tercio), el rulito sobre la cabeza del Sama del centro nace como un punto, se estira en una línea, se dobla en un gancho, cierra el lazo y estira el tallo; tarda unos 2,6 segundos más (nace rápido, el lazo es un trazo veloz y se asienta al llegar). Mientras tanto la piña brilla y su resplandor crece. Al completarse florece con un pequeño "pop" y se ilumina el nombre de la carta (queda encendido mientras el rulito está casi entero y se apaga con él): salen chispas, suena un `star` y las esporas azules se multiplican (una oleada desde los hongos y una nube varias veces más densa por unos segundos, que se va asentando). Si se suelta, la cola del rulito va alcanzando a la cabeza (unos 3,4 segundos para recorrerlo entero), el lazo se abre, queda el tallo, se encoge hasta un punto y desaparece; así ningún intento se desperdicia, y si se vuelve a sostener, la cola retrocede y el rulito sigue creciendo. Cada rulito nace con otra forma. Esa secuencia (nacer como punto, estirarse, hacer el lazo y la cola que alcanza a la cabeza) está tomada de la animación de referencia "Breathe" de Algo Particular, y se dibuja en código (ver `Rulito.vue`).
**Las raíces se quedan.** Esa secuencia (primero raíces, después rulito) viene de la misma animación de referencia "Breathe". Al completarse, un pulso de luz recorre las raíces y cada hongo suelta sus esporas cuando le llega la luz (escalonadas por distancia). Las raíces no se van: quedan tenues y respirando mientras la persona sigue en la carta, y brillan más cada vez que completa (hasta tres veces). Como ya agarraron, la próxima vez el rulito nace enseguida.
**Podría seguir:** que las raíces se recuerden entre visitas (hoy se pierden al salir de la carta), o que al completar se ilumine también la afirmación de la carta.
**Variantes posibles:** sostener dos puntos a la vez, o quedarse quieto sin mover el dedo (más exigente); una semilla (Sid) que crece mientras se sostiene.
**Cartas:** Paciencia (hecha), Hogar, Compromiso, Confianza, Fe, Addhitthana.

### 2. Fluir (Samas, demonio: culpa)
**Dinámica:** seguir y acompañar. Dejarse llevar por una corriente o por una criatura sin cortarla.
**Punto de partida:** en Khanti las pinceladas lavanda ya siguen el dedo, y las criaturas destellan cuando una pincelada pasa cerca. Los Samas se mueven en pares.
**Idea:** arrastrar el dedo acompañando un movimiento; cuando se acompasa, la escena "entra en ritmo" y aparece el rulito. Los corchos de Khanti que vacían los frascos quedan como la parte de soltar dentro del mismo juego.
**Cartas:** Khanti, Belleza, Celebración, Esperanza, Transformación.

### 3. Encender (Kätus, demonio: vergüenza)
**Dinámica:** cargar y soltar. Juntar energía y lanzarla, o encender cosas hasta que todas estén encendidas.
**Punto de partida:** en Evolución Espiritual los ocho bulbos y los cuatro hongos ya se encienden al tocarlos.
**Idea:** que los bulbos se enciendan en cualquier orden y el rulito aparece cuando están todos encendidos; o mantener para cargar y soltar para lanzar un salto hacia el sol (Kätus salta buscando el sol).
**Cartas:** Viriya, Coraje, Desafío, Evolución Espiritual.

### 4. Dar y recibir (Vulpes, demonio: pena)
**Dinámica:** pasar algo de un lado al otro y que vuelva. Extender y recoger, equilibrar.
**Punto de partida:** en Dana la llamita salta al tocarla y el par de figuras la comparte.
**Idea:** llevar la llama de una figura a la otra con el dedo, y que vuelva más grande. Cuando el vaivén se equilibra, aparece el rulito.
**Cartas:** Dana, Metta, Aceptación, Gratitud.

### 5. Resonar (Aura, demonio: mentiras)
**Dinámica:** escuchar y responder. Ritmo, eco, secuencia.
**Punto de partida:** Sincronicidad ya tiene una secuencia de cuatro burbujas que se iluminan en orden; y cada carta tiene su acorde.
**Idea:** la escena toca una frase corta con las notas del acorde de la carta y la persona la responde tocando; si no coincide, la escena la vuelve a tocar con paciencia. En Creatividad no hay respuesta correcta: cada toque agrega una nota y se compone libremente.
**Cartas:** Sila, Sacca, Armonía, Comunicación, Creatividad, Honestidad.

### 6. Ver (Huit, demonio: ilusión): implementado en Pañña
**Dinámica:** descubrir lo oculto, unir puntos, reconocer un patrón.
**Cómo funciona hoy en Pañña:** las nueve luces de la escena (el sol, el tercer ojo de Sid, el hongo rosado grande del medio, las cuatro luciérnagas y los dos hongos azules) se unen arrastrando de una a otra, y hay una **figura** que ver.
- *Nada viene unido.* La escena arranca limpia, sin la espiral del sol a la frente.
- *Unir.* Se apoya el dedo en una luz y se arrastra: un hilo sigue al dedo y, al llegar cerca de otra luz, se engancha a ella. Al soltar, el hilo queda tendido y fluye de la primera luz a la segunda; suena una nota de cada luz en el acorde de la carta (`link`: el sol arriba, los hongos de abajo en lo más grave). No se falla: unir dos luces que ya estaban unidas no hace nada y soltar en el aire deshace el hilo. Un toque corto, sin arrastrar, hace lo de siempre: las luciérnagas y los hongos echan chispas, tocar el sol hace que todo responda y tocar el ojo despierta a Sid.
- *Cómo es un hilo.* Una doble hélice de puntos que nace como un punto en la luz de la que sale, se ensancha y se cierra en otro punto en la que alcanza (`helix()`), con un resplandor suave por debajo (`glow`). Sus puntos toman los colores de las dos luces que une: oro del sol y las luciérnagas, celeste del ojo y los hongos azules, rosa de los hongos de abajo.
- *La figura.* Cada intento sortea una de cuatro figuras (`FIGURES`), que la persona no sabe cuál es: la **cruz** (el ojo unido al sol, a los hongos de abajo y a los dos azules: 4 hilos), el **diamante** (sol, hongo azul, hongos de abajo, hongo azul: 4 hilos), el **hexágono** (sol, luciérnagas y hongos de abajo en ronda: 6 hilos) y los **dos triángulos entrelazados** (sol con las dos luciérnagas de abajo, y hongos de abajo con las dos de arriba: 6 hilos), el símbolo de las dos corrientes. No todas las luces están en todas las figuras: las demás son señuelos. Una misma figura se queda hasta que se ve, y entonces sale otra.
- *Las pistas, sin palabras.* Los hilos que son de la figura quedan firmes y brillantes, y suenan fuerte; los que no, tenues y suaves. Y si pasan unos 9 s sin tocar nada, la figura se dibuja sola, tenue, hilo por hilo, y se va (`ghost`): ver es notar lo que estaba ahí. Se repite cada 13 s si se sigue sin tocar.
- *La red crece.* Las luces unidas quedan encendidas, y el aura de Sid se ensancha hasta un 14% (`grow()` de `useStardust.js`) y él brilla más a medida que se completan hilos de la figura.
- *Se juzga al último hilo.* Cuando los hilos son tantos como los de la figura se mira: si son esos, el patrón se ve; si no, los hilos se apagan solos con una caída suave de notas (`unravel`) y se empieza de nuevo con la misma figura. Hitos: `pattern_reset` (con `figure`) y `pattern_seen` (con `figure` y `times`).
- *El patrón.* Los hilos llevan su luz al tercer ojo (cada uno fluye rápido de su extremo más lejano al más cercano al ojo; las luces responden con chispas y las notas del acorde suben como un arpa, `converge`). A los 1,7 s el ojo se abre: un destello, un anillo de chispas y un cuenco grave (`open`). Entonces el rulito dorado se dibuja sobre la cabeza de Sid (`Rulito.vue`), el nombre de la carta se ilumina y suena un `star`. Después el rulito se va a medida que su cola alcanza a su cabeza, los hilos se apagan con él y sale otra figura.
- *Teclado.* Enter en una luz la elige y Enter en otra las une; Enter otra vez en la misma la suelta.
- *Movimiento reducido.* La escena queda estática y todavía no se puede jugar (como Vipassana): los toques siguen haciendo lo de siempre.
**Dónde se tocó:** `ScenePanna.vue` (todos los hilos son un solo grupo de partículas, `helix()`; `LIGHTS`, `join()`, `seen()`). No cubre ni agrega ningún dibujo: son solo partículas.
**Variante posible:** despejar una niebla de partículas para revelar las luces (cubriría el arte de Pañña; encajaría mejor en Honestidad, que tiene burbujas) o primero descubrir y después unir.
**Cartas:** Pañña (hecha), Ciclos, Sincronicidad, Honestidad.

### 7. Soltar (Sid, demonio: apego): implementado en Vipassana
**Dinámica:** dejar ir. Que las cosas se vayan sin agarrarlas, y que vuelvan.
**Cómo funciona hoy en Vipassana:** tiene un objetivo, soltar todo lo que hay en la escena. Cada célula es algo a lo que se aferra (hay 21; 15 en equipos de poca potencia).
- *Soltar una célula.* Tocarla la suelta: explota en puntos y queda así (`release`). Es el gesto principal y no hay nada que perder ni tiempo límite.
- *La pista, sin palabras.* La espiral de puntos de Sid es el contador: se acorta con cada célula que se suelta. Si pasa un rato sin tocar nada (poco al empezar), una de las células que quedan se ilumina de a ratos: esa es la que hay que soltar.
- *Respirar (tocar el agua).* Una onda recorre el agua desde el dedo y empuja las células (más fuerte cuanto más se mantiene apretado). Al llegar a Sid él inhala y todo se acerca; al exhalar su espiral se enciende. Es el ritmo de la escena y no hace falta para ganar. Suenan `ripple` y `breath`.
- *Retener el aire y exhalar.* Retener es aferrarse (el demonio del séptimo chakra es el apego). Mantener apretado a Sid: su espiral se acorta hasta ser un punto en el tercer ojo (3,2 s), el campo se cierra sobre él y atrapa, una tras otra, las células más cercanas, un tercio del total (7 de 21). Un rato más y esas células y la materia orbitan a su alrededor como electrones, en seis órbitas que forman un mandala; Sid sube al centro. Suena `inhale`. Al soltarlo exhala (`exhale`): la espiral vuelve a salir brillante, sale una onda grande desde Sid (`ripple`) y suelta de golpe todas las células que había atrapado, a medida que la onda llega a cada una. Con tres respiraciones alcanza para soltar todas, pero también se puede tocar de a una.
- *Easter egg: la respiración power.* Si se retiene mucho más de lo necesario (unos 4 s con el mandala completo, `POWER_AT`), se suman a las órbitas todas las células que quedan; suena una estrella y Sid brilla. Al soltar, la onda es más fuerte y rápida y se rompen todas juntas. No se avisa al jugador: es un premio por encontrarlo (hito `power_breath`). El camino normal sigue siendo tres respiraciones.
- *Cuando no queda nada que agarrar.* La espiral de puntos se va y solo queda la animación del rulito sobre la cabeza de Sid, chico y separado de ella, en el rosa de la espiral. Se ilumina el nombre de la carta y suena una estrella (`star`). Después todo lo que se soltó vuelve (`bloom`) a medida que la cola del rulito alcanza a su cabeza, hasta que se va, y la espiral vuelve. Se puede volver a jugar. Hito de analítica: `all_released`.
Dónde está Sid se decide con una máscara precalculada (`characterMask.js`, hecha con `scripts/make-character-mask.mjs`), no leyendo píxeles de un canvas en ejecución, que Safari de escritorio puede devolver vacío.
La escena sigue estática con movimiento reducido, así que todavía no se puede jugar así, y tampoco con teclado.
**Cartas:** Nekkhamma, Upekkha, Perdón, Vipassana (hecha).

### Sin verbo todavía: el silencio (carta 10)
No hay nada que leer ni decir; la invitación es sentir el corazón. Su verbo va entre Fa (Dar y recibir), Sol (Resonar) o La (Ver), por decidir. Si tiene un juego, sería no jugar: la escena responde solo si se deja de tocar.

## Piezas de código que ya sirven
- `src/components/Rulito.vue`: el rulito dibujado en código sobre un canvas 2D, como una línea que viaja (punto, línea, lazo, y luego la cola alcanza a la cabeza). `frame({ head, tail, flare, t })` lo dibuja y `reshape()` le da una forma nueva. Es el premio común a todos los verbos.
- `useSparks.js` y `useStardust.js`: chispas y partículas. `useSpores.js`: esporas en Paciencia (`swell` las multiplica, en oleada desde un punto). `useRoots.js`: la red de raíces luminosas bajo el campo de hongos (crece, se queda, y la recorre un pulso).
- `useCellWater.js`: el agua de las células, con un nadador que choca con las cosas.
- `useParallax.js`: el reloj de cada escena (`t`, `ramp`) y las entradas por capas.
- `useSound.js` y `cardChords.js`: el sonido en el acorde de la carta.

## Cómo sumar un verbo a una escena
1. Elegir el gesto del verbo y su "carga" (0 a 1) en el bucle de la escena.
2. Que la carga mueva lo visible: la piña, el resplandor, el rulito.
3. Al llegar a 1: un solo momento de cierre (rulito completo, chispas, `star`).
4. Que se pueda repetir, que no se pierda nada y que funcione con teclado.
5. Probarlo en un teléfono real: lo que un navegador de escritorio no muestra (GPU, dedo, interruptor de silencio) solo se ve ahí.
