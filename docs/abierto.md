# Abierto

Séptima pestaña de "Anima GDD": lo que falta decidir, agrupado por tema.

## Verbos y cartas
- Los siete verbos se probaron en una escena: Arraigar (Paciencia, Hogar y Addhitthana), Fluir (Khanti), Encender (Evolución Espiritual y Viriya), Dar y recibir (Dana), Resonar (Sincronicidad y Sila, en su forma "a tiempo"; Creatividad, como composición libre, y Sacca, como eco), Ver (Pañña) y Soltar (Vipassana, Nekkhamma y Upekkha). Todos pueden cambiar.
- Resonar: validar con Belén sus dos formas (a tiempo para Sincronicidad, Armonía y Sila; eco para Comunicación, Honestidad y Sacca). A tiempo está probado en Sincronicidad y Sila, y el eco en Sacca.
- Encender en Viriya: cuánto hay que frotar (`RUB`, 1,6 anchos de la escena) y a qué ritmo deja de contar (`STEADY`), la fuerza de la honda y la caída de la llama, y si los cactus y flores chicos se alcanzan bien en un teléfono: probarlos con un teléfono en la mano. En el teléfono el valle queda abajo y arriba hay mucho cielo azul.
- Resonar en Sila (a tiempo, con el latido): el pulso del corazón (`BEAT`, 1,15 s), cuánto margen tiene un toque a tiempo (`IN_TIME`, 0,24 s), cuántos hongos hacen falta (los seis de la carta), si los destellos del cielo distraen lo justo y si el brillo encendido de los hongos se distingue del tenue: probarlos con un teléfono en la mano.
- Resonar en Sacca (eco): qué nota lleva cada color de nube (hoy, por el chakra de su color: celeste Sol, salmón Re, verde azulado Fa; el rosa pálido, que no tiene chakra de su color, Si, la corona, por ser el más claro), el largo de la frase (cuatro notas, cada color una vez), el pulso al cantarla (`GAP`, 0,85 s, y más lento tras un error) y si en un teléfono las nubes chicas se tocan bien: probarlos con un teléfono en la mano.
- Resonar en Creatividad (caja de música): cuántas piezas hacen la melodía (`TUNE`, 7), la velocidad de la corona mientras suena (`PLAY_TURN`, una vuelta cada 12 s) y si las piezas encendidas y el peine se distinguen bien: probarlos con un teléfono en la mano.
- Resonar en Sincronicidad: el pulso (`BEAT`, 1,3 s) y la ventana para acertar (`IN_TIME`, 0,28 s): probarlos con un teléfono en la mano.
- Encender: cuánto hay que frotar (`RUB`), cuántos golpes dura el fuego (`FUEL`) y cuánto abarca cada golpe (`REACH`): ajustarlos con un teléfono en la mano. Hoy se encienden los doce en unos cinco a siete lanzamientos.
- Verbo de la carta 10: Fa (Dar y recibir), Sol (Resonar) o La (Ver); falta elegirlo y definir su forma de juego.
- Las fichas de Huit y Sid no tienen texto de historia, solo la tabla.

## Escenas de juego
- Más adelante, por accesibilidad: que Pañña, Vipassana, Dana, Evolución, Sincronicidad, Creatividad, Sila, Viriya y Upekkha se puedan jugar con movimiento reducido (hoy quedan estáticas y no se pueden jugar), y Vipassana también con teclado. El ajuste de movimiento reducido lo activan personas a las que las animaciones les dan mareo o malestar, y el teclado lo usa quien no puede tocar la pantalla. El gesto seguiría funcionando, con menos chispas y menos movimiento.
- Tiempos de Arraigar (2,6 s dibujándose, 3,4 s yéndose): ajustarlos con un teléfono en la mano.
- Que las raíces se recuerden entre visitas (hoy se pierden al salir de la carta).
- El color del rulito de Vipassana: es el rosa de la espiral porque el fondo de la escena ya es el violeta de la carta.

## Del plan inmersivo
Lo que queda de `plan-inmersivo.md`. Los pasos 1 a 6 y The Nine en 3D ya están hechos; esto es lo que se anotó como pendiente o como primera versión.
- Pulir el estilo visual del ritual de sacar carta en `/oracle` y `/oracleTheNine`: el barajado, la elección y el volteo son una primera versión.
- Medir batería y fluidez en un teléfono real de la mesa 3D (`/oracle` y `/oracleTheNine`) y de las escenas con three.js. Con `?fps` en la dirección (por ejemplo `/card/31?fps`) aparece un contador abajo a la izquierda: cuadros por segundo, cuadros lentos, tirones, el peor cuadro y el tiempo que lleva midiendo. Tocarlo lo reinicia y `?fps=0` lo apaga. Los teléfonos de quienes usan la app mandan lo mismo a PostHog al dejar una carta o una mesa (`card_left`, `table_left`; ver `analitica.md`).
- Medir la batería a mano, porque una página web no puede leerla: con el brillo fijo y el teléfono sin cargar, dejar 15 minutos una escena con three.js tocándola de vez en cuando, y 15 minutos una carta de ilustración plana; anotar el % al empezar y al terminar y si el teléfono se calentó. La diferencia es lo que cuesta la escena. Repetir con las mesas de `/oracle` y `/oracleTheNine`. Con el iPhone conectado a la Mac, Safari > Desarrollo > (el iPhone) > la página, pestaña Timelines, muestra además el uso del procesador y una estimación del gasto de batería.

## Ideas para seguir
Hipótesis, no decisiones: ninguna está implementada ni validada con Belén. Están en `plan-inmersivo.md`.
- Qué se puede llevar la persona. De menor a mayor compromiso: la afirmación como imagen para guardar o compartir (ya hay una imagen social por carta), la carta del día guardada en el dispositivo, la invitación como recordatorio o nota propia, y el rulito que le salió a cada persona.
- Antes de construirlo, mirar en la analítica cuánta gente completa un juego y cuánta llega a la lectura (`pattern_seen`, `all_released`).
- Las 33 cartas ya tienen escena viva, pero 18 todavía no tienen juego: llevar un verbo por vez a las cartas de su familia.
- Dos presupuestos de tamaño están justos (otras imágenes y ilustraciones de cartas): cada escena nueva con capas WebP los va a pedir.

## Música y secuencias
- Cómo se juegan los choques de mi–fa y si–do en una secuencia que suba por los chakras.
- Qué secuencias de acordes se usan en el juego. Los siete acordes disminuidos y otros nueve quedan sin carta; podrían servir para esas secuencias o para momentos del juego.
