# Abierto

Última pestaña de "Anima por dentro": lo que falta decidir, agrupado por tema.

## Verbos y cartas
- Arraigar (Paciencia), Ver (Pañña) y Soltar (Vipassana) se probaron en una escena, y Dar y recibir se está probando en Dana. Todos pueden cambiar. Fluir, Encender y Resonar todavía son solo idea.
- Verbo de la carta 10: Fa (Dar y recibir), Sol (Resonar) o La (Ver); falta elegirlo y definir su forma de juego.
- Las fichas de Huit y Sid no tienen texto de historia, solo la tabla.

## Escenas de juego
- Más adelante, por accesibilidad: que Pañña y Vipassana se puedan jugar con movimiento reducido (hoy las dos escenas quedan estáticas y no se pueden jugar), y Vipassana también con teclado. El ajuste de movimiento reducido lo activan personas a las que las animaciones les dan mareo o malestar, y el teclado lo usa quien no puede tocar la pantalla. El gesto seguiría funcionando, con menos chispas y menos movimiento.
- Tiempos de Arraigar (2,6 s dibujándose, 3,4 s yéndose): ajustarlos con un teléfono en la mano.
- Que las raíces se recuerden entre visitas (hoy se pierden al salir de la carta).
- El color del rulito de Vipassana: es el rosa de la espiral porque el fondo de la escena ya es el violeta de la carta.
- Si el rulito de la página Collaborate también pasa a dibujarse en código (hoy sigue dibujado en la imagen del bote).

## Del plan inmersivo
Lo que queda de `plan-inmersivo.md`. Los pasos 1 a 6 y The Nine en 3D ya están hechos; esto es lo que se anotó como pendiente o como primera versión.
- Pulir el estilo visual del ritual de sacar carta en `/oracle` y `/oracleTheNine`: el barajado, la elección y el volteo son una primera versión.
- Medir batería y fluidez en un teléfono real de la mesa 3D (`/oracle` y `/oracleTheNine`) y de las escenas con three.js. Con `?fps` en la dirección (por ejemplo `/card/31?fps`) aparece un contador abajo a la izquierda: cuadros por segundo, cuadros lentos, tirones, el peor cuadro y el tiempo que lleva midiendo. Tocarlo lo reinicia y `?fps=0` lo apaga. Los teléfonos de quienes usan la app mandan lo mismo a PostHog al dejar una carta o una mesa (`card_left`, `table_left`). La batería sigue siendo a mano.

## Ideas para seguir
Hipótesis, no decisiones: ninguna está implementada ni validada con Belén. Están en `plan-inmersivo.md`.
- Qué se puede llevar la persona. De menor a mayor compromiso: la afirmación como imagen para guardar o compartir (ya hay una imagen social por carta), la carta del día guardada en el dispositivo, la invitación como recordatorio o nota propia, y el rulito que le salió a cada persona.
- Antes de construirlo, mirar en la analítica cuánta gente completa un juego y cuánta llega a la lectura (`pattern_seen`, `all_released`).
- 24 de las 33 cartas siguen con ilustración plana: llevar un verbo por vez a las cartas de su familia.
- Dos presupuestos de tamaño están justos (otras imágenes y ilustraciones de cartas): cada escena nueva con capas WebP los va a pedir.

## Música y secuencias
- Cómo se juegan los choques de mi–fa y si–do en una secuencia que suba por los chakras.
- Qué secuencias de acordes se usan en el juego. Los siete acordes disminuidos y otros nueve quedan sin carta; podrían servir para esas secuencias o para momentos del juego.
