# Sid en piezas: que se mueva más que respirar

Sid (que también es Particular) hoy llega a cada escena como un dibujo entero: puede respirar, parpadear, saltar o inclinarse, pero no mover un brazo ni dar un paso. Para que haga gestos, camine, se doble como un cuerpo blando y tenga momentos especiales, tiene que llegar **en piezas**.

## El laboratorio

`/lab/sid` (con `npm run dev` y en los previews de Netlify de cada PR; no existe en la versión publicada) es una página de pruebas con Sid hecho títere:

- **Todo él está en código**, con su tinta y su línea. El cuerpo es su silueta calcada una vez del Sid de Nekkhamma (`silhouette` en `sid.json`, por `scripts/make-sid-lab.mjs`): rellena, con su contorno por dentro del borde y una pincelada en cada una de sus marcas de sombra. Queda limpio a cualquier tamaño, se dobla, se aplasta y se estira como un cuerpo blando, y respira.
- **Los ojos** miran el dedo, parpadean y se cierran al meditar o al estirarse (el arco de Upekkha).
- **Brazos y piernas** son trazos que se doblan libres, con curvas en codos y rodillas. De perfil salen del medio del cuerpo; de frente, cada uno a su lado.
- **Hacia dónde mira** es un ángulo sobre el suelo que gira sin saltos, y cómo se lo ve sale de ahí: de perfil, de tres cuartos (los ojos se corren hacia el lado al que mira), de frente o de espaldas (sin ojos). Gira mientras camina, en curva, y los ojos miran primero hacia donde va; solo se frena a girar si el camino queda bien atrás. Para darse vuelta del todo gira pasando por mirarnos. Quieto un momento, o sentado, se vuelve hacia nosotros.
- **Los pies se apoyan en el suelo**, cada uno a su profundidad: el que está apoyado queda quieto mientras él sigue, también hacia el fondo o hacia adelante (el de más cerca se ve más abajo), y de perfil el pie de atrás está un poco más al fondo.
- **Con peso:** al arrancar los primeros pasos son más cortos; al frenar el cuerpo sigue un poco y se asienta. Con la flecha apretada un rato (o si tiene que ir lejos) se pone a trotar: pasos más largos, más balanceo de brazos, un rebote más elástico.
- **El mundo le hace lugar:** rodea el tronco del árbol y las piedras grandes (y con las flechas se desliza por su borde, no las atraviesa); el pasto y lo bajo le tapan los pies cuando pasa detrás, y lo alto (helechos, brotes) se aclara si le queda delante.
- **La cámara** lo sigue con un poco de inercia (llega tarde al arrancar), se adelanta un poco hacia donde va y se acerca cuando él camina hacia el fondo.
- Camina libremente por el suelo, a los lados y hacia el fondo (más lejos se ve más chico, en perspectiva): con las flechas o WASD, y en el celular con la cruz de flechas de abajo a la izquierda (mantenerla apretada). La barra espaciadora (o el botón Loto en el celular) lo sienta en loto y lo levanta. Un toque lo hace caminar hasta ahí: en el suelo, también en profundidad; en el aire, hacia ese lado. Solo un toque cerca de él, a la altura de su cabeza o más arriba, lo alcanza con la mano. Los botones, abajo (en el celular en una fila sobre la cruz y el Loto): caminar, saludar, saltar (se agacha, se estira en el aire, se aplasta al caer), estirarse, loto, y "Esqueleto", que muestra los huesos.

## El mundo alrededor de Sid

`src/lab/sidWorld.js` dibuja en código el mundo por donde camina, con las marcas de los bocetos: rayitas de pasto, piedras (algunas con cara de dos o tres puntos: seres que lo miran, parpadean y saltan cuando llega), pilas de piedritas, brotes que se enrulan en una bolita, helechos, punteado en el suelo. Todo con una pluma de tinta en código (trazos más anchos al medio y finos en las puntas, marcas que nacen anchas y terminan en punta).

**Sus piezas en el mundo.** El árbol y sus plantas (`originales/arbol`, cada pieza en su capa, línea negra sobre blanco) pasan por `scripts/convert-lab-arbol.mjs` a `src/lab/arbol`: la línea como transparencia, para teñirla en código, y aparte lo que queda dentro de la línea (el converter lo encuentra: lo blanco que no se alcanza desde afuera sin cruzar la línea; la copa, fila por fila; el tronco, abierto arriba), para pintarlo en código. Todo empieza en tinta sobre crema y toma los colores de Ciclos al colorearse (la copa verde, el tronco tostado, las piedras y el brote en sus tonos; los helechos, que no tienen nada dentro, tiñen su línea; los hongos al pie del tronco, el sombrero coral y el pie crema). El árbol (tronco, corteza y copa, que se mece apenas con el viento) está más adelante en su camino; sus helechos, brotes y piedras van sueltos por todo el mundo, cada uno apoyado en el suelo, en lugar de las plantas y piedras en código. Así se pueden sumar más piezas: dibujadas en su capa y con los contornos que llevan color cerrados.

- **Infinito:** se hace por tramos según dónde está (el mismo lugar es siempre igual) y la cámara lo sigue. Los lugares especiales compuestos a mano (el árbol grande, la célula, el zorro) vienen después.
- **La paleta y el cielo de Ciclos:** la tinta de su línea y su blanco (también para Sid), su cielo amarillo con sus nubes blancas (las de la carta, que flotan despacio), sus colinas y sus colores.
- **El día y la noche de Ciclos:** de día, su cielo amarillo con el sol vivo de la carta (el disco con su punteado leído de la carta, que se mueve, tiembla y titila, y su resplandor que respira) y el suelo verde con vetas amarillas, como sus colinas; de noche, el cielo estrellado de las cartas (`useStarField.js`, con sus estrellas fugaces) sobre su verde azulado, su luna y el suelo amarillo con vetas mostaza. El sol y la luna salen por debajo del horizonte, cruzan el cielo y se ponen. Un día entero dura 90 s. Sentado en loto, el tiempo del mundo casi se detiene (el viento, las nubes, el sol, las estrellas y el día van muy despacio); solo el color sigue saliendo de él.
- **Tinta que se colorea:** todo empieza en tinta y toma un color de Ciclos cuando Sid pasa cerca; sentado en loto, sale de él una onda que colorea todo alrededor. Lo coloreado queda así. El color va como una acuarela bajo el dibujo, y la línea se tiñe.
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
