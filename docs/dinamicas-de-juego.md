# Dinámicas de juego: qué propone cada verbo

Cada carta tiene un verbo (`verb` en `src/data/cards.json`, lista en `src/data/verbs.js`). El verbo define la **dinámica**: qué hace la persona con la escena. La ilustración, el sonido y el significado los pone cada carta. Los siete verbos son uno por personaje y chakra (ver `verbos-y-personajes.md`).

Tres verbos se probaron en una escena: **Arraigar en Paciencia**, **Soltar en Vipassana** y **Ver en Pañña**. Lo implementado no es fijo: son ideas probadas y pueden cambiar. El resto son propuestas, tomando como punto de partida lo que ya hacen las escenas.

## Reglas comunes
- **Nada se pierde ni se falla.** No hay puntaje, tiempo límite ni "game over". Si el gesto no se completa, la escena sigue viva y se puede intentar de nuevo.
- **El premio es el rulito.** Completar el gesto es "uy, me conecté con el Todo": el rulito aparece, se dibuja o se enciende. Cada conexión es distinta: el rulito nunca sale con la misma forma dos veces. No se ve hasta que se empieza a jugar.
- **La lectura no se bloquea.** La descripción, la afirmación y la invitación están siempre disponibles. El juego no es una puerta.
- **Se puede jugar sin tocar la pantalla:** con teclado (Enter o espacio) y con `prefers-reduced-motion` (sin chispas ni animaciones largas, pero el gesto funciona).
- **Suena en el acorde de la carta** (`src/data/cardChords.js`): los toques son notas de ese acorde, el cierre del gesto es un `star`.
- **Dura poco.** Un gesto completo se resuelve en pocos segundos y se puede repetir.

## Los siete

Orden de los verbos: Arraigar (raíz) y Soltar (corona) son los dos polos, la corriente de manifestación y la de liberación, y Dar y recibir (corazón) es donde se encuentran. Los dos polos están probados; el centro, no. Ver `verbos-y-personajes.md`, sección "Dos corrientes".

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
**Cómo funciona hoy en Pañña:** las ocho luces de la escena (el sol, el tercer ojo de Sid, las cuatro luciérnagas y los dos hongos azules) se unen arrastrando de una a otra.
- *La espiral ya es el primer hilo.* La espiral de puntos del sol al tercer ojo es el hilo con el que empieza el juego: el sol y el ojo vienen unidos. No se toca ni se esconde.
- *Unir.* Se apoya el dedo en una luz y se arrastra: un hilo de puntos dorados, una espiral doble como la del sol, sigue al dedo, y al llegar cerca de otra luz se engancha a ella (la luz se enciende). Al soltar, el hilo queda tendido y fluye de la primera luz a la segunda; suena un `tap` en el acorde. No hay orden correcto ni se falla: unir dos luces que ya estaban unidas no hace nada, y soltar en el aire deshace el hilo. Un toque corto, sin arrastrar, hace lo de siempre: las luciérnagas y los hongos echan chispas, tocar el sol hace que todo responda y tocar el ojo despierta a Sid.
- *El patrón.* Cuando todas las luces forman una sola red (con el sol y el ojo ya unidos bastan seis hilos), cada luz responde con chispas, de la más cercana al ojo a la más lejana. La espiral del sol cede su lugar: el rulito dorado se dibuja sobre la cabeza de Sid (`Rulito.vue`), el nombre de la carta se ilumina y suena un `star`. Después el rulito se va a medida que su cola alcanza a su cabeza, los hilos se desvanecen y la espiral vuelve. Se puede volver a jugar. Hito de analítica: `pattern_seen`.
- *La pista, sin palabras.* Si pasa un rato sin tocar nada (8 s), una de las luces que todavía no está unida a la red brilla de a ratos.
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

## Para decidir
- Que Vipassana se pueda jugar con teclado y con movimiento reducido (hoy la escena queda estática). Y el color del rulito de Vipassana: es el rosa de la espiral porque el fondo de la escena ya es el violeta de la carta.
- Tiempos de Arraigar (hoy 2,6 s para dibujarse y 3,4 s para irse): ajustarlos con un teléfono en la mano.
- Si el rulito de la página Collaborate también pasa a dibujarse en código (hoy sigue dibujado en la imagen del bote).
