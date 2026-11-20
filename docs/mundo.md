# Mundo

Pestaña de "Anima GDD", después de Cartas: el mundo de Sid (`/sid`), qué es hoy, cómo se juega y lo que falta decidir, entre eso su lugar en Inicio. El detalle de cómo se fue armando está en `mundo-semiabierto.md`; qué pedirle a la ilustradora, en `sid-en-piezas.md`; el código, en `src/lab/` (y el punto "Sid's world" de `CLAUDE.md`).

## Qué es

Sid camina un mundo propio, dibujado en código, donde viven las cartas. El oráculo lleva a una carta al azar; el mundo lleva a las cartas caminando. Es una segunda manera de entrar a Anima, no un reemplazo: las cartas, sus escenas y sus lecturas son las mismas.

Todavía no está decidido qué es en el fondo (un mapa de las cartas, un camino de aprendizaje, un jardín para estar). Se va decidiendo jugando con él, de a una pieza por vez, probando cada una en el teléfono.

Se llamaba "el laboratorio de Sid" (`/lab/sid`). Desde el 20 de noviembre de 2026 está en `/sid` y en la app se llama "Sid"; la dirección vieja sigue llevando ahí.

## Cómo se juega

- **Caminar.** Un toque en el suelo lo manda ahí; con el dedo apoyado se lo guía, y lejos un rato, trota. En la computadora, flechas o WASD. Camina pose por pose, como dibuja un caminar *The Animator's Survival Kit*, y gira en el espacio.
- **Un solo botón**, la semilla de Algo Particular: lo sienta en loto y lo levanta. Hasta que se lo toca una vez, llama cada 7 s. Tocar a Sid lo hace saludar.
- **Colorear.** El mundo está en tinta; donde camina, y alrededor suyo cuando medita, las cosas toman los colores de la carta de esa zona.
- **Meditar.** Sentado en loto el tiempo del mundo casi se detiene.

## Lo que tiene

- **Siete zonas, una por carta**: Ciclos (con el árbol de la ilustradora), Metta, Upekkha, Paciencia, Gratitud, Transformación y Celebración (siempre de noche). Cada una cambia todo: tinta, cielo de día y de noche, suelo, sol, plantas y la música, que toma el acorde de su carta. Son una grilla a lo ancho y hacia el fondo, cada carta una vez por fila y por columna; siete zonas después, para cualquier lado, se vuelve al mismo lugar. El orden se sortea en cada visita.
- **Un lugar por zona**, armado con las capas de su carta: el árbol, el nido de hongos de Metta, el estanque de Upekkha, la barca de Paciencia sobre su micelio, la casa y el lago de Gratitud, el árbol que nace de la semilla de Transformación y la fogata de Celebración.
- **Los personajes de cada carta**, alrededor de su lugar donde la carta los dibuja. Quietos en tinta; cuando Sid llega se colorean y se animan, cada uno a su manera (se mecen, asienten, dormitan, bailan alrededor del fuego), lo miran y saltan.
- **Entrar a la carta.** Sentado en loto en un lugar, la cámara se acerca a él y se abre la carta de esa zona, con su escena y su lectura, como en su página. El laberinto (o Escape) vuelve al mundo. Si se completó el juego de la carta, Sid vuelve con el rulito sobre la cabeza y su afirmación. Sin WebGL, meditar ahí hace nacer el rulito y aparece la afirmación escrita a mano.
- **Semillas.** De vez en cuando hay una en el suelo, de la carta de su zona. Sid la junta al pasar y, sentado lejos de los lugares, planta la primera que encontró: brota una planta de su carta, con sus colores, y crece un poco en cada visita.
- **Memoria en el teléfono**, sin cuentas: las visitas, las semillas y lo plantado (por zona, así se encuentra aunque las zonas cambien de lugar).
- **Día y noche** cada 90 s: sol y luna que salen y se ponen, mariposas y abejas de luz de día, luciérnagas, esporas y estrellas fugaces de noche.

## Su lugar en Inicio (sin decidir)

Hoy se llega solo desde el ícono del laberinto, en el footer de Inicio: casi nadie lo encuentra. Inicio tiene tres bloques: el hero (el personaje y su espiral, que lleva al oráculo), el oráculo (mazo completo o Los Nueve) y la frase final; después el footer.

Opciones pensadas, ninguna elegida:

| Opción | Cómo sería | A favor | En contra |
|---|---|---|---|
| **Bloque propio** | Un bloque nuevo después del oráculo, hermano de él: Sid vivo caminando su mundo como vista previa, y un toque para entrar | Se presenta como otra puerta, al mismo nivel que el oráculo; la vista previa lo muestra sin explicarlo | Inicio crece; dibujar a Sid vivo en Inicio suma peso y batería (habría que cargarlo solo al llegar al bloque) |
| **Tercer modo del oráculo** | Junto a "mazo completo" y "Los Nueve", con su constelación | Ya existe el lugar y el gesto (mantener hasta que se forme la constelación); dice que el mundo es otra forma de encontrar las cartas | Lo pone bajo "Deja que tu intuición te guíe", y el mundo no es sacar una carta al azar |
| **En el hero** | La primera pantalla ya es Sid en su mundo; el oráculo viene después | Lo más visible; el mundo es lo más propio de Anima | Cambia qué es Anima para quien llega (hoy, un oráculo); es la decisión más grande y la más cara de deshacer |
| **Seguir en el footer, por ahora** | Como hoy, midiendo primero | No compromete nada mientras el mundo todavía no sabe qué es | Sigue escondido |

Antes de elegir sirve medir: hoy la analítica no cuenta las visitas al mundo, solo las cartas abiertas desde él (`card_viewed` con `entry: 'lab'`). Faltaría un evento al entrar y al salir (tiempo, zonas recorridas, lugares meditados, semillas plantadas) para saber si quien lo encuentra se queda.

## Abierto

- Su lugar en Inicio (arriba).
- Qué es en el fondo: un mapa de las cartas, un camino o un jardín.
- Para cuando estén todas las cartas: un mapa fijo donde cada una aparezca una sola vez (por ejemplo una grilla de 6x6 que se cierra sobre sí misma), así cada carta tiene su lugar y se aprende el camino. Hoy son siete.
- Qué medir del mundo (arriba).
- Si Sid pasa del Canvas 2D a la escena WebGL común (`useLayerStage.js`), como el resto de las escenas.
- Qué pedirle a la ilustradora: `sid-en-piezas.md`.
