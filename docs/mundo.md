# Mundo

Pestaña de "Anima GDD", la segunda: el mundo de Sid (`/sid`). Probablemente sea el juego de Anima: el oráculo queda como oráculo (sacar una carta y leerla) y los juegos viven acá. Todavía no está decidido (`abierto.md`, la pregunta grande). El detalle de cómo se fue armando está en `mundo-semiabierto.md`; qué pedirle a la ilustradora, en `sid-en-piezas.md`; el código, en `src/lab/` (y el punto "Sid's world" de `CLAUDE.md`).

## Qué es

Sid camina un mundo dibujado en tinta que toma color a su paso. Encuentra semillas y los fragmentos de su historia, se sienta a meditar, planta un jardín que canta y, en el lugar de cada zona, abre su carta y la juega. Sin puntaje, sin tiempo, sin perder: lo que se gana es el rulito, una semilla, una planta nueva, un pedazo de la historia.

Todavía no está decidido qué es en el fondo: un mapa de las cartas, un camino de aprendizaje o un jardín para estar. Se va viendo jugando con él, de a una pieza por vez, probando cada una en el teléfono.

Está en `/sid` y en la app se llama "Sid" (hasta el 20 de noviembre de 2026 fue "el laboratorio de Sid", `/lab/sid`, que sigue llevando ahí). Hoy se llega desde el laberinto del footer de Inicio y desde el mismo ícono en el menú.

## El bucle

1. **Caminar.** Sid recorre el mundo y lo que pisa, y lo que lo rodea cuando medita, toma los colores de la carta de esa zona.
2. **Encontrar.** Semillas en el suelo, esporas de luz que pasan con el viento, los laberintitos de luz de la Bitácora, y el lugar de cada zona.
3. **Sentarse.** Lejos de los lugares, planta la semilla que lleva; junto a una de sus plantas, la cuida; en un lugar, se abre su carta.
4. **Jugar la carta.** Completar su juego hace nacer el rulito: Sid vuelve al mundo con él sobre la cabeza, la afirmación de la carta y una semilla de esa carta.
5. **Crecer.** Cada planta crece cuando Sid vuelve a ella y canta su nota; la libreta se llena: la Bitácora con la historia, el Herbario con las plantas.
6. **Volver.** Todo queda guardado en el teléfono: la próxima visita sigue donde estaba el jardín.

## Cómo se juega

- **Caminar.** Un toque en el suelo lo manda ahí; con el dedo apoyado se lo guía, y lejos un rato, trota. En la computadora, flechas o WASD. Camina pose por pose, como dibuja un caminar *The Animator's Survival Kit*, y gira en el espacio.
- **Un solo botón**, la semilla de Algo Particular: lo sienta en loto y lo levanta. Mientras está sentado la pantalla no se apaga. Tocar a Sid lo hace saludar.
- **Meditar de verdad.** Un toque largo en la semilla (o M) abre un menú, como el toque largo del iPhone: 1, 3 o 5 minutos. Suena un cuenco, Sid respira lento (4 s al entrar, 6 s al salir), el tiempo que queda es una línea de luz alrededor de la semilla, y al final suena el cuenco otra vez. Levantarse lo termina. Mientras dura es silencio: la música se apaga, solo se oye una respiración suave, y no se planta, no crece ni canta nada, no se abre ninguna carta y la noche guarda sus secretos. A quien se sienta un rato sin usarlo, el menú le asoma una vez, sin palabras.
- **Pistas sin palabras.** La semilla llama (se infla, brilla y sale de ella un anillo de luz): si nadie la toca, hasta que Sid se sienta (4 s en la primera visita, 7 s después); cuando entra la primera semilla, hasta que se planta una; y parado en un lugar, donde además hay un anillo de luz a sus pies, hasta que medita en uno. La libreta llama igual cada 9 s mientras tenga algo nuevo y nunca se haya abierto. Cada pista deja de aparecer para siempre una vez hecho lo que pide.
- **La primera visita enseña una sola cosa**, en orden: "Todo partió de una partícula."; una semilla a unos pasos que llama con anillos de luz en el suelo; al recogerla, "Lo que se siembra en calma, florece." y el botón llama: sentado, la planta. Hasta plantarla no aparecen las frases de los lugares ni los laberintitos de la Bitácora.

## Los sistemas

### Zonas y lugares
Siete zonas, una por carta. Cada una cambia todo: la tinta, el cielo de día y de noche, el suelo, el sol, las plantas y la música, que toma el acorde de su carta. Son una grilla a lo ancho y hacia el fondo, cada carta una vez por fila y por columna; siete zonas después, para cualquier lado, se vuelve al mismo lugar. El orden se sortea en cada visita, pero cada mundo tiene siempre el mismo paisaje.

En el medio de cada zona hay un lugar armado con las capas de su carta y sus personajes, que están quietos en tinta y, cuando llega Sid, se colorean y se animan cada uno a su manera, lo miran y saltan. Al alejarse vuelven a la tinta.

### Las cartas en los lugares
Sentado en loto en un lugar, la cámara se acerca a Sid y se abre la carta de esa zona, con su escena y su lectura, como en su página. El laberinto (o Escape) vuelve al mundo. Si se completó el juego, Sid vuelve con el rulito y la afirmación escrita a mano, y gana una semilla de esa carta (una por lugar por visita; el rulito y la afirmación, siempre). Sin WebGL, meditar ahí hace nacer el rulito.

### El jardín y el Herbario
- **De dónde salen:** la mayoría se ganan en los lugares; unas pocas están en el suelo; de vez en cuando pasa con el viento una espora de luz que se atrapa caminando debajo; y sentado de noche, una estrella fugaz cercana deja una semilla de luz, de ninguna carta.
- **Plantar:** sentado lejos de los lugares, Sid planta la primera que encontró. La semilla vuela del botón a su corazón, lo atraviesa como pura luz, sigue bajo tierra como un brillo y nace de la tierra con una explosión de partículas. Suena como la ley de octava: el acorde de su carta sube nota a nota a lo largo de todo el camino, y al brotar suena entero una octava arriba.
- **Crecer:** brota una planta de su carta, con sus colores (la de Transformación, el helecho de luz que sale de su semilla gigante, con su lucecita). Crece un paso cuando Sid vuelve a ella después de haberse ido y otro cuando medita a su lado, una vez por visita cada uno, hasta 1,4 veces su tamaño (o 2 si su dibujo lo aguanta); después, a su lado, baila.
- **Cantar:** cada planta tiene una nota del acorde de su carta (si choca con el mundo donde crece, la más cercana que encaja; más grave o más aguda según cuánto creció). Canta cuando Sid pasa cerca y al tocarla; mientras medita entre sus plantas, cantan por turno, de izquierda a derecha.
- **El Herbario:** la primera planta de cada tipo vuela a la libreta y entra al Herbario, su página de plantas: 11 tipos, cada uno en sus colores y con su nombre (los que faltan, siluetas). Una semilla crece primero en un tipo que todavía no está; la de estrella da cualquiera que falte, así meditar de noche es el comodín. Completarlo lleva al menos tres visitas.

### La historia y la Bitácora
La historia de Sid, en 18 fragmentos de las notas de Algo Particular (y entre ellos el principio de correspondencia de *El Kybalion*, "Como es arriba, es abajo"). Cada uno está en un laberintito de luz blanco y crema, el ícono que abre el mundo, que flota lejos de los lugares con una columna de luz para verlo de lejos; nunca dos juntos. Al pasar Sid por debajo, una luz lo recorre de afuera hacia el centro, sube y se va, y se escribe a mano un fragmento de los que faltan, al azar. Sus letras vuelan a la libreta y entra a la Bitácora, su página de la historia: los 18 en siete párrafos por tema (los que faltan, una línea de estrellitas), que se completa salteada. Si sobre un lugar estaba escrita su frase, se va primero, para que no se pisen.

**La libreta** es el botón chico al lado del de la semilla: aparece cuando hay algo adentro, brilla mientras haya algo nuevo y, al abrirla, sus dos páginas (Bitácora y Herbario) se escriben en el cielo; deslizar el dedo pasa de una a otra.

### Lo que piensa cada lugar
Al acercarse a un lugar, sobre él se escribe a mano una frase de su carta, y se va al alejarse. En cada visita, la siguiente. Son 28, cuatro por lugar, frases de Belén enteras.

### Día, noche y secretos
Un ciclo cada 90 s: sol y luna que salen y se ponen; de día mariposas y abejas de luz, de noche luciérnagas, esporas y estrellas fugaces. Mientras Sid medita, el tiempo del mundo casi se detiene. Sentado de noche un rato, a veces (como mucho una vez por visita) la cámara mira al cielo y las estrellas forman la constelación de la carta de la zona.

## Las siete zonas

| Zona | El lugar | Quiénes están | La constelación | Sus plantas en el herbario |
|---|---|---|---|---|
| Ciclos | El árbol de la ilustradora | | La espiral | Abanico del ocaso |
| Metta | El nido de hongos | Seis seres, un zorro y un gatito | El corazón | Farolito |
| Upekkha | El estanque, con lo que crece alrededor | | El yin y el yang | Hongo del estanque, Flor de luz, Brote del estanque |
| Paciencia | La barca sobre su micelio, con la piña | La tripulación de la barca | La piña | Pasto en rulo |
| Gratitud | La casa, la palmera con su lucecita y el bote en el lago | | La palmera con su lucecita | Abanico turquesa, Palmera agradecida |
| Transformación | El árbol que nace de su semilla, sobre su pozo | El pequeño de la vara y el anciano del cuenco | El brote | Helecho de luz |
| Celebración | La fogata | Los Samas, los zorros, los gatos y los peludos, bailando | La fogata | Hongos de la fogata, Hongos gemelos |

## Progresión y memoria

- **Lo que queda en el teléfono**, sin cuentas: las visitas, las semillas que lleva, lo plantado (por zona, así se encuentra aunque las zonas cambien de lugar), qué frase toca en cada lugar, los fragmentos encontrados, lo que ya se vio en la libreta y las pistas ya aprendidas.
- **Lo que se completa:** la Bitácora (18 fragmentos) y el Herbario (11 tipos, al menos tres visitas).
- **Lo que crece de visita en visita:** las plantas, un paso al volver y otro al meditar a su lado.
- **Empezar de nuevo:** el laberinto del menú, apretado 3 s, olvida todo, como en una primera visita.
- **Volver al mundo:** si el teléfono cierra la app instalada en segundo plano, al abrirla vuelve al mundo (si se estuvo en él en las últimas 6 horas).

## Cómo va

Desde el 20 de noviembre de 2026 el mundo tiene su analítica (`world_entered`, `world_left` y los momentos de adentro; la lista en `analitica.md`). Hasta el 23 de noviembre: 48 visitas entraron; en 18 Sid se sentó, en 19 se plantó una semilla, en 11 se encontró un fragmento y en 15 se abrió la libreta; solo en 4 se abrió la carta de un lugar. Hay que sentarse justo en el lugar: es lo primero a mirar.

## Textos

Todo lo que el mundo escribe, en español e inglés, está relevado en la subpestaña "Textos" de esta pestaña del GDD. Se escribe en el código, no en `src/json`: las palabras de la historia en `STORY` (`src/lab/LabSid.vue`), los fragmentos en `src/lab/story.js` (y el título "Bitácora", "Logbook" en inglés, en `LabSid.vue`), lo que piensa cada lugar en `src/lab/thoughts.js` (frases de Belén sacadas de la descripción y la invitación de cada carta) y las afirmaciones en `src/data/cards.json`. El botón de la semilla se llama "Loto" ("Lotus" en inglés) para el lector de pantalla.

## Por decidir

Las decisiones del mundo están en `abierto.md`: la pregunta grande (si los juegos viven acá), qué es en el fondo, cuántos mundos, el mapa fijo y su lugar en Inicio. Para esta última, las opciones pensadas, ninguna elegida:

Hoy se llega solo desde el laberinto del footer de Inicio y del menú: está escondido. Inicio tiene tres bloques: el hero (el personaje y su espiral, que lleva al oráculo), el oráculo (mazo completo o Los Nueve) y la frase final.

| Opción | Cómo sería | A favor | En contra |
|---|---|---|---|
| **Bloque propio** | Un bloque nuevo después del oráculo: Sid vivo caminando su mundo como vista previa, y un toque para entrar | Al mismo nivel que el oráculo; la vista previa lo muestra sin explicarlo | Inicio crece; dibujar a Sid vivo en Inicio suma peso y batería (habría que cargarlo solo al llegar al bloque) |
| **Tercer modo del oráculo** | Junto a "mazo completo" y "Los Nueve", con su constelación | Ya existe el lugar y el gesto | Lo pone bajo "Deja que tu intuición te guíe", y el mundo no es sacar una carta al azar |
| **En el hero** | La primera pantalla ya es Sid en su mundo; el oráculo viene después | Lo más visible; si el mundo es el juego, es lo que se ve primero | Cambia qué es Anima para quien llega (hoy, un oráculo); es la decisión más grande y la más cara de deshacer |
| **Seguir en el footer, por ahora** | Como hoy, midiendo primero | No compromete nada mientras el mundo todavía no sabe qué es | Sigue escondido |

Técnico, sin apuro: si Sid pasa del Canvas 2D a la escena WebGL común (`useLayerStage.js`), como el resto de las escenas.
