# Dinámicas de juego: qué propone cada verbo

Cada carta tiene un verbo (`verb` en `src/data/cards.json`, lista en `src/data/verbs.js`). El verbo define la **dinámica**: qué hace la persona con la escena. La ilustración, el sonido y el significado los pone cada carta. Los siete verbos son uno por personaje y chakra (ver `verbos-y-personajes.md`).

Solo **Arraigar en Paciencia** está implementado. El resto son propuestas, tomando como punto de partida lo que ya hacen las escenas.

## Reglas comunes
- **Nada se pierde ni se falla.** No hay puntaje, tiempo límite ni "game over". Si el gesto no se completa, la escena sigue viva y se puede intentar de nuevo.
- **El premio es el rulito.** Completar el gesto es "uy, me conecté con el Todo": el rulito aparece, se dibuja o se enciende. Cada conexión es distinta: el rulito nunca sale con la misma forma dos veces. No se ve hasta que se empieza a jugar.
- **La lectura no se bloquea.** La descripción, la afirmación y la invitación están siempre disponibles. El juego no es una puerta.
- **Se puede jugar sin tocar la pantalla:** con teclado (Enter o espacio) y con `prefers-reduced-motion` (sin chispas ni animaciones largas, pero el gesto funciona).
- **Suena en el acorde de la carta** (`src/data/cardChords.js`): los toques son notas de ese acorde, el cierre del gesto es un `star`.
- **Dura poco.** Un gesto completo se resuelve en pocos segundos y se puede repetir.

## Los siete

### 1. Arraigar (Sporá, demonio: miedo) — implementado en Paciencia
**Dinámica:** sostener. Mantener apretado un punto de la escena hasta que algo crece.
**Cómo funciona hoy en Paciencia:** al mantener apretada la piña (dedo, clic o tecla) primero crece una red de raíces doradas bajo el campo de hongos, saliendo de la piña (unos 2,4 segundos para extenderse del todo). Cuando las raíces han agarrado (a un tercio), el rulito sobre la cabeza del Sama del centro nace como un punto, se estira en una línea, se dobla en un gancho, cierra el lazo y estira el tallo; tarda unos 2,6 segundos más (nace rápido, el lazo es un trazo veloz y se asienta al llegar). Mientras tanto la piña brilla y su resplandor crece. Al completarse florece con un pequeño "pop" y se ilumina el nombre de la carta (queda encendido mientras el rulito está casi entero y se apaga con él): salen chispas, suena un `star` y las esporas azules se multiplican (una oleada desde los hongos y una nube varias veces más densa por unos segundos, que se va asentando). Si se suelta, la cola del rulito va alcanzando a la cabeza (unos 3,4 segundos para recorrerlo entero), el lazo se abre, queda el tallo, se encoge hasta un punto y desaparece; así ningún intento se desperdicia, y si se vuelve a sostener, la cola retrocede y el rulito sigue creciendo. Cada rulito nace con otra forma. Está inspirado en la animación `docs/Breathe.gif`, y se dibuja en código (ver `Rulito.vue`).
**Las raíces se quedan.** Esa secuencia (primero raíces, después rulito) viene de `docs/Breathe.gif`. Al completarse, un pulso de luz recorre las raíces y cada hongo suelta sus esporas cuando le llega la luz (escalonadas por distancia). Las raíces no se van: quedan tenues y respirando mientras la persona sigue en la carta, y brillan más cada vez que completa (hasta tres veces). Como ya agarraron, la próxima vez el rulito nace enseguida.
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

### 6. Ver (Huit, demonio: ilusión)
**Dinámica:** descubrir lo oculto. Revelar, unir puntos, reconocer un patrón.
**Punto de partida:** en Pañña se despierta a las luciérnagas, los hongos, Sid y el sol, y la espiral llega a la frente de Sid (el tercer ojo).
**Idea:** pasar el puntero para despejar la niebla que cubre algo, o unir puntos hasta que aparece una constelación. En Sincronicidad, reconocer el patrón de las burbujas y tocarlas en el momento justo.
**Cartas:** Pañña, Ciclos, Sincronicidad.

### 7. Soltar (Sid, demonio: apego)
**Dinámica:** dejar ir. Que las cosas se vayan sin agarrarlas.
**Punto de partida:** en Khanti los corchos saltan y los frascos se vacían como si se evaporaran; en Vipassana las células pasan.
**Idea:** tocar para dejar ir y que cada cosa se disuelva; o simplemente observar sin tocar y dejar pasar. El rulito aparece cuando ya no queda nada que agarrar.
**Cartas:** Nekkhamma, Upekkha, Perdón, Vipassana.

### Sin verbo: el silencio (carta 10)
No hay nada que leer ni decir; la invitación es sentir el corazón. Si tiene un juego, sería no jugar: la escena responde solo si se deja de tocar.

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
- Tiempos de Arraigar (hoy 2,6 s para dibujarse y 3,4 s para irse): ajustarlos con un teléfono en la mano.
- Si el rulito de la página Collaborate también pasa a dibujarse en código (hoy sigue dibujado en la imagen del bote).
