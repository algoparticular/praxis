# Verbos y personajes

Decisión: los juegos de las cartas se organizan en **7 verbos**, uno por personaje / chakra / nota. Cada verbo es la dinámica básica de una familia de juegos; cada carta toma el verbo que le calza por su significado y lo viste con su propia ilustración. Fuente de los personajes: Notion, Algo Particular / BIOs.

Qué dinámica propone cada verbo: `dinamicas-de-juego.md`.

## Reglas
- **El verbo lo decide el significado de la carta.** El personaje dibujado puede ser otro (la asignación de personajes a cartas a veces es libre). Por eso serían dos campos distintos en `cards.json`: `verb` y `character`. Todavía no se agregaron.
- **Sin perder, sin puntaje.** El gesto se completa o se vuelve a intentar.
- **El premio es siempre el rulito** (la espiral de conexión con el Todo, ya presente en la landing, Vipassana y Pañña): al completar el gesto de una carta, aparece o se enciende.
- **No bloquea la lectura.** La descripción, la afirmación y la invitación están siempre disponibles.
- Cada verbo trabaja contra el "demonio" de su chakra (ver tabla). Idea a validar con Belén.

## Los 7
| # | Personaje | Chakra | Nota | Propósito | Demonio | Verbo | Qué hace la persona |
|---|-----------|--------|------|-----------|---------|-------|---------------------|
| 1 | Sporá | Raíz, rojo | Do | Asentamiento | Miedo | **Arraigar** | Sostener, plantar, quedarse quieto hasta que algo crece o se enciende |
| 2 | Samas | Sacro, naranja | Re | Movimiento y conexión | Culpa | **Fluir** | Moverse con otros, dejarse llevar, seguir una corriente |
| 3 | Kätus | Plexo solar, amarillo | Mi | Transformación | Vergüenza | **Encender** | Cargar y soltar, atravesar el fuego, encender cosas |
| 4 | Vulpes | Corazón, verde | Fa | Amor, equilibrio | Pena | **Dar y recibir** | Extender y recoger, pasar algo de uno a otro, equilibrar |
| 5 | Aura | Garganta, celeste | Sol | Comunicación, creatividad | Mentiras | **Resonar** | Escuchar y responder, ritmo, secuencia |
| 6 | Huit | Tercer ojo, lavanda | La | Reconocer el patrón | Ilusión | **Ver** | Descubrir lo oculto, unir puntos, revelar |
| 7 | Particular (¿Sid?) | Corona, violeta | Si | Comprensión | Apego | **Soltar** | Dejar pasar, vaciar |

Las notas siguen la correspondencia tradicional Do–Si; la decisión de música se toma aparte.

## Dos corrientes: de Arraigar a Soltar
Lectura de trabajo, a validar con Belén. Sale del libro *Cuerpo de Oriente, mente de Occidente* (corrientes energéticas y el viaje completo de los chakras) y de las notas de Belén en Notion. Los "7 movimientos" de esas notas son estos siete verbos.

La energía de los chakras corre en dos sentidos:
- **Corriente de manifestación** (baja): impulso del alma y del cuerpo. Se mueve hacia la forma, la densidad, los límites, la contracción y la individualidad.
- **Corriente de liberación** (sube): impulso de la mente y el espíritu. Se mueve hacia la libertad, la expansión, la abstracción y la universalidad.

Los siete verbos, uno por chakra, quedan ordenados entre dos polos:
- **Arraigar** (raíz) es el polo de la manifestación: de la materia a la manifestación. Está probado en Paciencia.
- **Soltar** (corona) es el polo de la liberación: del entendimiento a la existencia. Está probado en Vipassana.
- **Dar y recibir** (corazón) es donde las dos corrientes se encuentran. Las notas de Belén lo dicen así: "dos triángulos entrelazados, el movimiento descendente del espíritu en la materia y la liberación ascendente de la materia en el espíritu: equilibrio perfecto en el corazón". Se está probando en Dana: compartir la luz de la llamita con todos los de la isla, y que vuelva multiplicada (ver `dinamicas-de-juego.md`).
- **Fluir, Encender, Resonar y Ver** serían los pasos entre un polo y el otro.

Esto se parece a lo que el rulito premia: en las notas del tercer chakra, "siento las dos corrientes, ascendente de liberación y descendente de manifestación, que se unen en mí para manifestar mi propósito de ser quien soy".

Las palabras del libro para cada chakra, subiendo y bajando:

| Verbo | Chakra | Sube | Baja |
|-------|--------|------|------|
| Arraigar | Raíz | Materia | Manifestación |
| Fluir | Sacro | Movimiento | Conexión |
| Encender | Plexo solar | Energía | Transformación |
| Dar y recibir | Corazón | Amor | Compasión |
| Resonar | Garganta | Creatividad | Inspiración |
| Ver | Tercer ojo | Perspicacia | Iluminación |
| Soltar | Corona | Entendimiento | Existencia |

## Reparto de las 33 (guardado)
Está en el campo `verb` de `src/data/cards.json` y los verbos en `src/data/verbs.js`. Salió del texto de cada carta; se puede corregir editando el JSON. `?` marca las que tenían duda al armarlo.

| Verbo | Cartas |
|-------|--------|
| Arraigar (6) | Addhitthana 7, Compromiso 16, Confianza 18, Fe 23, Hogar 25, Paciencia 27 |
| Fluir (4) | Khanti 5, Aceptación 11, Celebración 14, Transformación 32? |
| Encender (4) | Viriya 4, Coraje 19, Desafío 21, Evolución Espiritual 22 |
| Dar y recibir (3) | Dana 2, Metta 8, Gratitud 24 |
| Resonar (7) | Sila 1, Sacca 6, Armonía 12?, Comunicación 17, Creatividad 20, Honestidad 26, Sincronicidad 29 |
| Ver (4) | Pañña 3, Belleza 13, Ciclos 15, Esperanza 30 |
| Soltar (4) | Nekkhamma 0, Upekkha 9, Perdón 28, Vipassana 31 |
| Sin verbo (1) | Carta 10 (el silencio) |

Total: 6 + 4 + 4 + 3 + 7 + 4 + 4 + 1 = 33. Ciclos podría ir en Soltar (*"¿Qué es tiempo de dejar ir?"*).

## Decidido
- Carta 10 (`" ... "`): es el silencio. No hay nada que leer ni decir, la invitación es sentir el corazón. Su verbo va entre Fa, Sol o La (por decidir); la forma, por definir.
- Nombre del personaje: **Sid** (Seed, semilla).
- El bichito con pelos y antenas es un Sama. El ser dentro de la célula de Evolución es Sid.
- Belleza y Esperanza son **Ver**: *"poder ver lo bello"*; *"hilos invisibles de luz"* bajo un cielo de estrellas.
- Upekkha se queda en **Soltar** (la impermanencia, soltar el ancla), aunque su invitación diga "fluí".
- Sila se queda en **Resonar**: es la conducta ética (en el Noble Óctuple Sendero, *sīla* reúne recta palabra, recta acción y recto modo de vida) y la carta la plantea "en resonancia con la voz de tu sabiduría interior".
- Sincronicidad es **Resonar**, no Ver: estar en armonía y en el momento justo.
- Aceptación es **Fluir**, no Dar y recibir: su ilustración es un río entre dos seres iguales y su texto pide no luchar contra lo que no se controla.
- Khanti es **Fluir** (Samas), no Soltar: los corchos que vacían los frascos quedan como la parte de soltar dentro de ese juego.
- Creatividad y Hogar intercambian la ilustración entera (corona, personaje, imagen de la carta y colores). Creatividad: corales y medusa (Aura). Hogar: hongos y larva (Sama).
- Vipassana es **Soltar** (el "ver las cosas tal cual son" lleva al desapego).
- Hogar se queda con la larva (Sama). Sid va dentro de Evolución Espiritual, que es donde mejor calza.

## Abierto
- Fichas de Huit y Sid no tienen texto de historia, solo la tabla.
- Carta 10 (el silencio): el verbo va entre Fa (Dar y recibir), Sol (Resonar) o La (Ver); falta elegirlo y definir su forma de juego.
