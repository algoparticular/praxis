# Verbos y personajes

Decisión: los juegos de las cartas se organizan en **7 verbos**, uno por personaje / chakra / nota. Cada verbo es la dinámica básica de una familia de juegos; cada carta toma el verbo que le calza por su significado y lo viste con su propia ilustración. Fuente de los personajes: Notion, Algo Particular / BIOs.

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

## Reparto de las 33 (guardado)
Está en el campo `verb` de `src/data/cards.json` y los verbos en `src/data/verbs.js`. Salió del texto de cada carta; se puede corregir editando el JSON. `?` marca las que tenían duda al armarlo.

| Verbo | Cartas |
|-------|--------|
| Arraigar (6) | Addhitthana 7, Compromiso 16, Confianza 18, Fe 23, Hogar 25, Paciencia 27 |
| Fluir (5) | Khanti 5, Belleza 13?, Celebración 14, Esperanza 30?, Transformación 32? |
| Encender (4) | Viriya 4, Coraje 19, Desafío 21, Evolución Espiritual 22 |
| Dar y recibir (4) | Dana 2, Metta 8, Aceptación 11, Gratitud 24 |
| Resonar (6) | Sila 1, Sacca 6, Armonía 12?, Comunicación 17, Creatividad 20, Honestidad 26 |
| Ver (3) | Pañña 3, Ciclos 15, Sincronicidad 29 |
| Soltar (4) | Nekkhamma 0, Upekkha 9, Perdón 28, Vipassana 31 |
| Sin verbo (1) | Carta 10 (el silencio) |

Total: 6 + 5 + 4 + 4 + 6 + 3 + 4 + 1 = 33. Belleza podría ir también en Ver.

## Decidido
- Carta 10 (`" ... "`): es el silencio. No hay nada que leer ni decir, la invitación es sentir el corazón. Verbo y forma por definir.
- Nombre del personaje: **Sid** (Seed, semilla).
- El bichito con pelos y antenas es un Sama. El ser dentro de la célula de Evolución es Sid.
- Khanti es **Fluir** (Samas), no Soltar: los corchos que vacían los frascos quedan como la parte de soltar dentro de ese juego.
- Creatividad y Hogar intercambian la ilustración entera (corona, personaje, imagen de la carta y colores). Creatividad: corales y medusa (Aura). Hogar: hongos y larva (Sama).
- Vipassana es **Soltar** (el "ver las cosas tal cual son" lleva al desapego).
- Hogar se queda con la larva (Sama). Sid va dentro de Evolución Espiritual, que es donde mejor calza.

## Abierto
- Fichas de Huit y Sid no tienen texto de historia, solo la tabla.
- Carta 10 (el silencio): verbo y forma de juego por definir.
