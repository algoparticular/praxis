# Sid en piezas: que se mueva más que respirar

Sid (que también es Particular) hoy llega a cada escena como un dibujo entero: puede respirar, parpadear, saltar o inclinarse, pero no mover un brazo ni dar un paso. Para que haga gestos, camine, se doble como un cuerpo blando y tenga momentos especiales, tiene que llegar **en piezas**.

## El laboratorio

`/lab/sid` (solo con `npm run dev`; no existe en la versión publicada) es una página de pruebas con Sid hecho títere:

- **El cuerpo** es su dibujo (contorno, relleno y rayitas), que el código dobla, aplasta y estira como un cuerpo blando, y que respira.
- **El cuerpo** se puede ver de dos maneras (botones *Cuerpo en código* y *Cuerpo dibujo*): en código es su silueta calcada del dibujo una vez (`silhouette` en `sid.json`), rellena, con su contorno por dentro del borde y una rayita en cada una de sus marcas de sombra: limpio a cualquier tamaño y deformado punto por punto; el dibujo es la imagen recortada.
- **Los ojos** están dibujados en código: miran el dedo, parpadean, se cierran al meditar o al estirarse (el arco de Upekkha).
- **Brazos y piernas** se pueden ver de dos maneras, con los botones de abajo:
  - *Trazos en código*: una línea con su tinta y su grosor, que se dobla libre (rodillas, codos). Sirve para cualquier carta sin pedir nada más.
  - *Piezas dibujadas*: los brazos y piernas tal como están dibujados, que giran rígidos en la cadera o el hombro.
- Camina libremente por el suelo, a los lados y hacia el fondo (más lejos se ve más chico, en perspectiva): con las flechas o WASD, y en el celular con la cruz de flechas de abajo a la izquierda (mantenerla apretada). La barra espaciadora (o el botón Loto en el celular) lo sienta en loto y lo levanta. Toca el suelo y camina hasta ahí, también en profundidad (sus pies no resbalan). Toca el aire y lo alcanza con la mano. Los botones: caminar, saludar, saltar (se agacha, se estira en el aire, se aplasta al caer), estirarse, meditar (se sienta con las piernas cruzadas). "Esqueleto" muestra los huesos y "Lento" lo pasa a un cuarto de velocidad.

Las piezas de la prueba salieron del Sid de Nekkhamma, recortado por `scripts/make-sid-lab.mjs` (los ojos y el brazo tapados con su relleno). El script cierra el contorno donde se cortó (un anillo de su tinta por dentro del borde, el borde interior suavizado y los muñones de las piernas quitados), pero las piernas dibujadas siguen en pose de caminar: eso se resuelve con piezas dibujadas para esto.

## El mundo alrededor de Sid

`src/lab/sidWorld.js` dibuja en código el mundo por donde camina, con las marcas de los bocetos: rayitas de pasto, piedras (algunas con cara de dos o tres puntos: seres que lo miran, parpadean y saltan cuando llega), pilas de piedritas, brotes que se enrulan en una bolita, helechos, punteado en el suelo y marcas de viento en el cielo. Todo con una pluma de tinta en código (trazos más anchos al medio y finos en las puntas, marcas que nacen anchas y terminan en punta).

- **Infinito:** se hace por tramos según dónde está (el mismo lugar es siempre igual) y la cámara lo sigue. Los lugares especiales compuestos a mano (el árbol grande, la célula, el zorro) vienen después.
- **Tinta que se colorea:** todo empieza en tinta y toma su color (uno de los siete de los chakras) cuando Sid pasa cerca; sentado en loto, sale de él una onda que colorea todo alrededor. Lo coloreado queda así. El color va como una acuarela bajo el dibujo, y la línea se tiñe.
- **Vivo:** el pasto se aparta a su paso, los helechos y los brotes se mecen con el viento.

### Las piezas del mundo, dibujadas

Las plantas en código no alcanzan la mano del dibujo: el mundo va a usar piezas dibujadas, que el código reparte, anima y colorea. Para que eso funcione, cada pieza:

1. **Sola, en su archivo**, con fondo transparente (PNG o capas separadas), al tamaño de exportación habitual.
2. **Solo la tinta alcanza**: el color lo pone el código. Encuentra las formas cerradas del dibujo (como encuentra los pasillos del laberinto de Confianza) y las rellena con uno de los siete colores, plano o como acuarela, cuando Sid pasa. Para eso los contornos que deben llevar color tienen que estar **cerrados**. Si alguna pieza quiere un color pensado por ella, el relleno va en otra capa.
3. **Apoyada en su base**: lo que toca el suelo, abajo y al medio de la imagen, para plantarla en el suelo en perspectiva.
4. **Lo que se mueve, separado**: los tallos o las hojas que se mecen, las caras de las piedras (los ojos en su capa, para parpadear y mirar).
5. **Varias versiones** de lo que se repite (tres o cuatro rayitas de pasto, piedras, brotes, helechos), para que el suelo no se vea repetido.
6. **Las piezas únicas** (el árbol, el zorro, la célula) también por partes: copa, tronco y ramas; cabeza, cuerpo y cola.

## Qué pedirle a la ilustradora

**Proporción de Sid de pie** (la de Nekkhamma): cabeza 1, torso 0,6, piernas 0,6. La cabeza va de la coronilla al angostamiento de la cintura, el torso de ahí a la base y las piernas de la base al suelo: tan largas como el torso (en Viriya son algo más largas, 0,8). Brazos y piernas tan gruesos como su contorno.

Un Sid de pie, de perfil a tres cuartos (mirando a la derecha, como en Nekkhamma), al tamaño de exportación habitual (2160 px o más), con **cada parte en su propia capa**:

1. **Cuerpo**: contorno, relleno y rayitas de sombra, **sin ojos, sin brazos y sin piernas**. Debajo de donde nacen brazos y piernas, el contorno sigue cerrado.
2. **Ojos**: aparte (o nada, si los dibujamos en código: son dos puntos o dos arcos).
3. **Si los brazos y piernas son trazos en código** (lo más flexible), basta con decir el grosor de su línea en cada carta: no hace falta dibujarlos.
4. **Si son piezas dibujadas**, cada una en su capa y **por segmentos**: brazo y antebrazo, muslo, pierna y pie, cada uno con un poco de dibujo de más en la punta que queda escondida bajo la otra (para que al doblarse no se vea un corte). Rectos, en reposo: el código los pone en cada pose.
5. Cualquier accesorio (mochila, bastón, remo) en su propia capa.

Con eso, el mismo títere sirve en todas las cartas donde aparece (Nekkhamma, Upekkha, Metta, Gratitud, Fe, Ciclos, Viriya, Addhitthana, Perdón, Confianza): cambian sus colores y su línea, no el código.

## Lo que sigue

- Elegir entre trazos en código y piezas dibujadas (o una mezcla: piernas en código, brazos dibujados).
- Llevar el títere al escenario WebGL (`useLayerStage.js`), donde ya hay nodos con pivote para colgar unas piezas de otras, para usarlo en una escena real.
- Los momentos especiales (el rulito, ganar un juego) como coreografías de estas mismas piezas; un cuadro a cuadro dibujado solo donde el títere no alcance.
