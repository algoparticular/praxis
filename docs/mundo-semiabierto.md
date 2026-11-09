# El mundo semiabierto de Sid: plan

Dónde estamos y cómo seguir con el mundo del laboratorio (`/lab/sid`). Para retomar en una sesión nueva: leer esto, `docs/sid-en-piezas.md` (qué hay hoy y qué pedirle a la ilustradora) y el punto "The puppet lab" de `CLAUDE.md`.

## La idea

Un mundo para recorrer con Sid, con zonas conectadas, donde aparecen **personajes, lugares/escenas, objetos/semillas y enseñanzas** (frases de las cartas). Todavía no está decidido qué es en el fondo (un mapa de las cartas, un camino de aprendizaje, un jardín para estar): **la idea es explorar con piezas chicas y ver qué se siente bien** antes de construir mucho.

Decidido con Juan Manuel:
- **Zonas conectadas**: un mundo continuo con regiones (cada una con la paleta y el cielo de una carta), unidas por caminos; se puede volver.
- **Memoria en el teléfono**: lo que pasa (lo plantado, lo encontrado, lo coloreado) se guarda en el dispositivo, sin cuentas (`localStorage`), y el mundo crece con cada visita.
- **Todo dentro de la PWA**, en `src/lab/` (no hay más artifact aparte).

## Qué hay hoy (el punto de partida)

- `src/lab/LabSid.vue`: Sid títere en Canvas 2D (camina pose por pose como en *The Animator's Survival Kit*, gira en el espacio, salta, saluda, se estira, medita en loto como un Buda; controles en la computadora y en el celular).
- `src/lab/sidWorld.js`: el mundo infinito por tramos en la paleta de Ciclos (`CICLOS`), tinta que se colorea, día y noche, sol vivo, luna, estrellas (`useStarField.js`), nubes, y el árbol de la ilustradora (`src/lab/arbol`, por `scripts/convert-lab-arbol.mjs`) con su tronco sólido y sus raíces que se saltan (`obstacles()`); sentado bajo su copa nace el rulito; meditando, el tiempo del mundo casi se detiene.
- Se entra desde el ícono del laberinto del footer del inicio.

## Primer prototipo (propuesto): una pieza de cada cosa

1. **Dos zonas.** La de Ciclos (la de hoy) y, caminando hacia un lado, una segunda zona con la paleta y el cielo de otra carta, con una transición suave en el borde (los colores se mezclan). Técnicamente: `sidWorld.js` pasa de una paleta fija a una paleta por zona según `x` (zonas como tramos grandes del mundo, `ZONES = [{ from, to, card, palette, sky }]`), mezclando en el borde.
2. **Un lugar especial por zona.** El árbol (ya está) en Ciclos; en la segunda, otro (por ejemplo un estanque), donde meditar hace algo propio.
3. **Un personaje.** Un ser que aparece, mira a Sid, se acerca si él medita cerca y luego lo acompaña un rato (lo sigue con su propio paso).
4. **Un objeto.** Semillas en el suelo: Sid las junta al pasar (un contador chico) y, sentado en loto, planta una; crece y queda ahí (guardado) para la próxima visita.
5. **Una enseñanza.** Al meditar en un lugar especial aparece, escrita a mano (Caveat), la afirmación de la carta de esa zona (`src/data/cards.json`), en el idioma elegido.
6. **Memoria.** Un módulo chico (`src/lab/worldMemory.js`): lo plantado, las semillas, lo coloreado y los personajes conocidos, en `localStorage` con try/catch (si no hay, el mundo funciona igual, sin recordar).

Ir de a una, probando cada pieza en el teléfono antes de la siguiente.

## Preguntas abiertas (a decidir con Juan Manuel antes de empezar)

1. **¿Qué carta es la segunda zona?** Opciones pensadas: **Upekkha** (pasado y futuro, el estanque; ya hay capas en `public/assets/upekkha`), **Fe** (el río y los hongos; `public/assets/fe`) o **Paciencia** (arraigar, la piña; `public/assets/paciencia`). Propuesta: Upekkha.
2. **¿Qué personaje primero, y cómo se dibuja?** Propuesta: un **Sama**, dibujado en código como Sid (su silueta leída una vez de una carta donde aparece, por un script como `scripts/make-sid-lab.mjs`), o pedirle a la ilustradora el personaje en piezas (ver `docs/sid-en-piezas.md`).
3. **¿Qué es, en el fondo?** Se decide jugando con el prototipo: si las zonas se vuelven las cartas (cada una con su verbo como juego), un camino con etapas, o un jardín sin metas.

## Cuidados

- Es un laboratorio: no toca las cartas ni sus escenas; todo vive en `src/lab/` y su ruta.
- Los dibujos de la ilustradora se pasan a WebP por un converter (los originales no quedan en el repo; `originales/` solo tiene `.gitkeep`). Cielos y partículas en código, nunca como imágenes (ver `CLAUDE.md`).
- Cada cambio: `npm run check`, probar en el teléfono (el preview de Netlify del PR), y un PR por paso.
