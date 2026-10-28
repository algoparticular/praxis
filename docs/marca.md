# Marca

Quinta pestaña de "Anima por dentro": siete colores del arcoíris que conviven con la marca. Cada chakra tiene su color, y esos siete colores van a aparecer en cartas, juegos y piezas de Algo Particular. Tienen que sentirse de la misma familia que el crema, el coral y el azul-negro, en lugar de un arcoíris genérico pegado encima.

## Lo que ya es marca

Sacado del código de la app y de los logos (`src/assets/Logo*.svg`). Algo Particular usa siempre el coral como color de acento. El naranja que aparece en el logo queda solo para Samas (el chakra sacro) y, quizás, para el logo de Sama Sama: nada de Algo Particular va en naranja.

| Color | Valor | Uso |
|---|---|---|
| Crema | `#F7F8F1` | fondo de toda la app |
| Crema 2 | `#E9EDD8` | logo, superficies |
| Coral | `#FF6F61` | acento, logo |
| Azul-negro | `#143246` | texto, logo |

El coral tiene una luz y una saturación medidas (OKLCH: luz 0,72, croma 0,18). Ese es el "nivel" de la marca: los colores de chakra se afinaron a él para verse como una familia, salvo Sporá, que es un carmín más oscuro para no confundirse con el coral.

## La paleta de los chakras

Seis colores tienen la luz y la saturación del coral, así ninguno pesa más que otro y se ven como una familia. Sporá es la excepción: un carmín más oscuro e intenso, cercano al coral pero sin confundirse con él ni con el naranja de Samas (al lado del naranja, el coral parecía otra versión del mismo color). La raíz queda como el color más pesado, y el coral sigue siendo solo el acento de la marca. Samas es el naranja del logo, que deja de ser color de Algo Particular y queda para él. Kätus va un poco más claro que el resto, para que su amarillo se lea dorado y no mostaza.

Cada color tiene dos versiones: **luz**, para rellenos, ilustración y fondos azul-negro, y **tinta**, más oscura, para texto y líneas sobre crema. En la app viven en `src/data/chakraColors.js`: las cartas del oráculo se iluminan con ellos.

| Personaje | Nota y chakra | Luz | Luz sobre crema | Luz sobre azul-negro | Tinta | Tinta sobre crema |
|---|---|---|---|---|---|---|
| Sporá | Do, raíz | `#D7314B` | 4,4 | 2,8 | `#AF0532` | 6,8 |
| Samas | Re, sacro | `#F4844C` | 2,4 | 5,2 | `#AD4906` | 5,3 |
| Kätus | Mi, plexo | `#F2B036` | 1,8 | 7,0 | `#916102` | 5,0 |
| Vulpes | Fa, corazón | `#62C37A` | 2,0 | 6,1 | `#1D803F` | 4,7 |
| Aura | Sol, garganta | `#26C0CF` | 2,1 | 6,0 | `#067A84` | 4,8 |
| Huit | La, tercer ojo | `#7DAAFD` | 2,2 | 5,7 | `#4369B3` | 5,0 |
| Particular | Si, corona | `#C690EC` | 2,3 | 5,5 | `#8353A4` | 5,3 |

Los números son el contraste (WCAG) contra el fondo, en la forma "N : 1".

## Cómo medimos

El contraste contra el fondo se mide con WCAG. 3 alcanza para formas y gráficos; 4,5 hace falta para texto chico. Ningún color llega a las dos cosas en los dos fondos: por eso la paleta tiene dos versiones del mismo color, una "luz" para rellenos y fondos oscuros y una "tinta" para texto y líneas sobre crema.
