# Cartas

Tercera pestaña de "Anima GDD": lo que tenemos hoy de cada una de las 33 cartas, junto. El texto de cada carta (descripción, afirmación e invitación, en español e inglés), sus colores y su ilustración viven en `src/data/cards.json`, que es la fuente de verdad (cómo editarla: `editar-cartas.md`). Acá está el resto: su verbo, su acorde y qué hace en la app.

## Dónde está cada cosa de una carta

| Qué | Dónde |
|---|---|
| Textos, colores, ilustración, categoría | `src/data/cards.json` |
| Verbo | campo `verb` de `cards.json` y lista en `src/data/verbs.js`; por qué ese verbo y cómo se juega: `verbos-y-dinamicas.md` |
| Acorde | `src/data/cardChords.js`; por qué ese acorde: más arriba, en esta página |
| Escena | `src/data/cardScenes.js` y `src/components/scenes/` |
| Ilustración y miniatura | `public/cards/N.webp` y `public/cards/thumb/N.webp` |

## El acorde de cada carta

Cada carta suena en su propio acorde, elegido por su texto (las reglas, en `musica.md`, segunda parte). El código vive en `src/data/cardChords.js` y el sonido en `src/audio/synth.js`.

| # | Carta | Acorde | Notas → chakras | Por qué este acorde | Personajes en la ilustración |
|---|---|---|---|---|---|
| 0 | Nekkhamma | Si menor | Si, Re, Fa# → corona, sacro, corazón | Renuncia, soltar, "un ser sagrado haciendo una experiencia humana". La corona manda (lo sagrado) y el modo menor mira hacia adentro (soltar). | Particular (tres, deshaciéndose) |
| 1 | Sila | Sol7 | Sol, Si, Re, Fa → garganta, corona, sacro, corazón | "Encuentro paz al hacer el bien en resonancia con la voz de mi alma". La voz del alma es la garganta, acompañada por la corona. Para hacer el bien hay que escuchar al corazón, así que el Fa del corazón de Sid entra como séptima. | el corazón del atril y el de Sid (Fa) |
| 2 | Dana | Si mayor | Si, Re#, Fa# → corona, sacro, corazón | "Escucho al niño que llevo dentro y soy feliz al dar". El niño interior es el sacro y dar es el corazón. La teoría dice que este acorde facilita la conexión trascendental y la creatividad emocional. | Particular (dos) |
| 3 | Pañña | Lam7 | La, Do, Mi, Sol → tercer ojo, raíz, plexo, garganta | Sabiduría que se pregunta y se escucha en silencio: "Escucha en silencio", "mi centro calmo". El tercer ojo manda, y el acorde es claridad mental que, desde adentro, encuentra sus respuestas. | Sid (Particular), hongos y bosque (Sporá) |
| 4 | Viriya | Mi mayor | Mi, Sol#, Si → plexo, garganta, corona | Energía y determinación: "sigo su verdad con determinación". La voluntad es el plexo solar. | Particular (caminante con báculo) |
| 5 | Khanti | Remaj7 | Re, Fa#, La, Do# → sacro, corazón, tercer ojo, raíz | Tolerancia y paciencia con el propio proceso: "respeta tus tiempos sin exigencias", soltar culpas, mirar con perspectiva más amplia. El sacro manda (culpa) y la séptima mayor le da calma, sin apuro. | Varios personajes dentro de los frascos |
| 6 | Sacca | Sol7 | Sol, Si, Re, Fa → garganta, corona, sacro, corazón | Comprometerse con la propia verdad y abrirle la puerta al propósito. La verdad se dice con la garganta y la corona la acompaña; es la verdad que se escucha en el corazón, por eso el corazón de Sid (Fa) entra como séptima. | Particular en la barca y el corazón de Sid (Fa) |
| 7 | Addhitthana | Mi mayor | Mi, Sol#, Si → plexo, garganta, corona | Determinación para nutrir hábitos. Es la voluntad, el plexo solar en modo mayor. | Particular en el bote, bajo la tormenta |
| 8 | Metta | Famaj7 | Fa, La, Do, Mi → corazón, tercer ojo, raíz, plexo | Amar primero a uno mismo para después dar: "soy Amor infinito". El corazón manda, y el acorde es amor sereno que confía en sí mismo. | Particular y otros, con un zorrito (Vulpes) |
| 9 | Upekkha | Mi menor | Mi, Sol, Si → plexo, garganta, corona | Ecuanimidad e impermanencia: soltar el exceso de control. Es el equilibrio espiritual desde la introspección. | Particular, hongos (Sporá) |
| 10 | Tu verdad | Sol mayor (base) | — | La carta en blanco no tiene texto que elija un acorde, así que se queda en el sonido de base. | — |
| 11 | Aceptación | Si menor | Si, Re, Fa# → corona, sacro, corazón | "Acepto y honro quién soy", soltar el control. La teoría lo describe como conexión espiritual con raíces emocionales, mirando hacia adentro. | Particular (dos) |
| 12 | Armonía | Domaj7 | Do, Mi, Sol, Si → raíz, plexo, garganta, corona | "Vibro en armonía en mi aquí y ahora": equilibrio entre sonido y pausa, pausa de silencio interior. La raíz y la garganta se abren con calma, sin tensión. | Aura (dos medusas) |
| 13 | Belleza | Lamaj7 | La, Do#, Mi, Sol# → tercer ojo, raíz, plexo, garganta | "Poder ver lo bello aún en la apariencia más desafiante", "reconozco mi belleza". Manda el tercer ojo (ver), el plexo es reconocerse a uno mismo y la séptima, la garganta, irradia lo bello hacia afuera; la séptima mayor lo hace con calma, "como la brisa suave". | Particular (dos, abrazados), árboles |
| 14 | Celebración | Mimaj7 | Mi, Sol#, Si, Re# → plexo, garganta, corona, sacro | "Celebro la vida… celebrarTE": placer, disfrute y pequeños rituales. Es el poder personal del plexo, suave, que se disfruta en vez de imponerse. | Particular, gatitos (Kätus), zorritos (Vulpes), fuego |
| 15 | Ciclos | Fa7 | Fa, La, Do, Mib → corazón, tercer ojo, raíz, plexo | "Agradezco quien fui, honro quien soy y proyecto quien quiero ser": cerrar un ciclo dejando que el corazón guíe. El amor se vuelve voluntad: la séptima empuja hacia el próximo ciclo. | Particular, paisaje |
| 16 | Compromiso | La mayor | La, Do#, Mi → tercer ojo, raíz, plexo | "Estoy comprometida con mi búsqueda y visión". La visión es el tercer ojo, que manda, y el compromiso se apoya en la raíz y la voluntad. | Un hongo gigante (Sporá; Do# cuenta como raíz) y, en el cielo, dos Samas en su bote |
| 17 | Comunicación | Sol menor | Sol, Sib, Re → garganta, corona, sacro | El primer paso para comunicarte es escucharte a vos mismo, en silencio, antes de hablar con claridad y honestidad. Es comunicación introspectiva, la garganta mirando hacia adentro. | Aura (tres) en el bosque rosa |
| 18 | Confianza | La menor | La, Do, Mi → tercer ojo, raíz, plexo solar | Confiar en la propia intuición y en las señales del cuerpo, dejar que la sabiduría guíe los pasos. Es confianza desde un lugar introspectivo, con el tercer ojo al mando. | Particular (Si), Aura (Sol), Vulpes (Fa) |
| 19 | Coraje | Mi7 | Mi, Sol#, Si, Re → plexo, garganta, corona, sacro | "Mi fuerza interior guía mis pasos": valentía para seguir el camino del corazón. Es el plexo de Kätus, el fuego que se abre paso, integrado con la expresión y lo espiritual. | Kätus en el borde del acantilado |
| 20 | Creatividad | Do7 | Do, Mi, Sol, Sib → raíz, plexo, garganta, corona | "Pongo en práctica mi creatividad y creo la vida que sueño". La teoría describe este acorde como expansión creativa con estabilidad y confianza. | Corona de corales y algas, con una medusa (Aura) |
| 21 | Desafío | Re7 | Re, Fa#, La, Do → sacro, corazón, tercer ojo, raíz | Transformar el desafío en una oportunidad para conocerse. Corazón y transformación. | Vulpes frente al laberinto |
| 22 | Evolución Espiritual | Si7 | Si, Re#, Fa#, La → corona, sacro, corazón, tercer ojo | "Mi alma evoluciona cada día". Es la corona transformándose. | Corona de helechos y hongos (Sporá), ser acurrucado dentro |
| 23 | Fe | Si mayor | Si, Re#, Fa# → corona, sacro, corazón | "Tengo fe en la fuerza inconmovible de mi alma y el apoyo del universo". La corona en modo mayor. | Particular brillando, hongos gigantes (Sporá) |
| 24 | Gratitud | Solmaj7 | Sol, Si, Re, Fa# → garganta, corona, sacro, corazón | Gratitud que se expresa: agradecer quién soy y a un ser querido. Es expresión que nace del corazón agradecido, con calma y apertura. | Particular en su isla |
| 25 | Hogar | Do mayor | Do, Mi, Sol → raíz, plexo, garganta | "Cada día regreso a mi hogar". El hogar es la raíz. El acorde incluye a Sporá (Do) y a Aura (Sol). | Corona de hongos (Sporá), con una larva (un Sama) |
| 26 | Honestidad | Solm7 | Sol, Sib, Re, Fa → garganta, corona, sacro, corazón | "¿Qué siento?": acallar voces externas y escuchar al cuerpo para conocer la verdad. Es comunicación introspectiva que escucha al corazón. | Aura bajo el sol, corales |
| 27 | Paciencia | Re mayor | Re, Fa#, La → sacro, corazón, tercer ojo | "Descubro milagros a cada instante", aprendiendo de los ciclos de la naturaleza. La teoría habla de creatividad, apertura emocional y visión clara. | Los Samas en su bote |
| 28 | Perdón | Fa menor | Fa, Lab, Do → corazón, tercer ojo, raíz | "Me perdono a mí mismo y a los otros": sanar vínculos y dejar culpas y rencores. El corazón mirando hacia adentro, para liberar heridas emocionales profundas. | Particular y un gatito en una hoja, un planeta con anillo, un Sama que sube en globo llevando a otro |
| 29 | Sincronicidad | Sol mayor (base) | Sol, Si, Re → garganta, corona, sacro | "Las sincronicidades suceden cuando somos capaces de estar en armonía con todo lo que nos rodea". Suena en el mismo acorde que toda la app: al entrar no cambia nada, está en armonía con lo que la rodea. Tiene la garganta (Resonar) y el Re de los Samas del dibujo. | Samas en pareja dentro de burbujas, fuego |
| 30 | Esperanza | Sim7 | Si, Re, Fa#, La → corona, sacro, corazón, tercer ojo | No estás solo, te acompañan guías y ancestros. La corona y las raíces emocionales (el sacro y el corazón de Vulpes), guiadas por la intuición del tercer ojo. | Vulpes en las dunas, la luna |
| 31 | Vipassana | Simaj7 | Si, Re#, Fa#, La# → corona, sacro, corazón, tercer ojo | "Observar con el corazón": contemplación de uno mismo, desapego, ver las cosas tal cual son. Es contemplación trascendental, la visión interior; la corona manda. | Particular con su rulito, células |
| 32 | Transformación | Rem7 | Re, Fa, La, Do → sacro, corazón, tercer ojo, raíz | "Mi corazón fluye con alegría en el transcurso del cambio": encontrar equilibrio en medio del movimiento. Un flujo emocional que se asienta y encuentra suelo. | Samas, palmera (Sporá) |

Se cambia una línea en `src/data/cardChords.js`, por ejemplo `28: 'Em'`. Se escriben como `C`, `Dm`, `G7` o `F#m`. Si cambia el motivo, también hay que actualizar esta tabla.

---

## Las 33 de un vistazo

<!-- tabla:inicio -->
| # | Carta | Categoría | Verbo | Acorde | En la app |
|---|---|---|---|---|---|
| 0 | Nekkhamma | Paramis | Soltar | Si menor | Escena propia, verbo jugable |
| 1 | Sila | Paramis | Resonar | Sol7 | Escena propia, verbo jugable |
| 2 | Dana | Paramis | Dar y recibir | Si mayor | Escena propia, verbo jugable |
| 3 | Pañña | Paramis | Ver | Lam7 | Escena propia, verbo jugable |
| 4 | Viriya | Paramis | Encender | Mi mayor | Escena propia, verbo jugable |
| 5 | Khanti | Paramis | Fluir | Remaj7 | Escena propia, verbo jugable |
| 6 | Sacca | Paramis | Resonar | Sol7 | Escena propia, verbo jugable |
| 7 | Addhitthana | Paramis | Arraigar | Mi mayor | Escena propia, verbo jugable |
| 8 | Metta | Paramis | Dar y recibir | Famaj7 | Escena propia, verbo jugable |
| 9 | Upekkha | Paramis | Soltar | Mi menor | Escena propia, verbo jugable |
| 10 | Tu verdad | Special | sin verbo | Sol mayor | Escena propia, sin juego todavía |
| 11 | Aceptación | Regular | Fluir | Si menor | Escena propia, verbo jugable |
| 12 | Armonía | Regular | Resonar | Domaj7 | Escena propia, verbo jugable |
| 13 | Belleza | Regular | Ver | Lamaj7 | Escena propia, verbo jugable |
| 14 | Celebración | Regular | Fluir | Mimaj7 | Escena propia, verbo jugable |
| 15 | Ciclos | Regular | Soltar | Fa7 | Escena propia, sin juego todavía |
| 16 | Compromiso | Regular | Arraigar | La mayor | Escena propia, sin juego todavía |
| 17 | Comunicación | Regular | Resonar | Sol menor | Escena propia, verbo jugable |
| 18 | Confianza | Regular | Arraigar | La menor | Escena propia, sin juego todavía |
| 19 | Coraje | Regular | Encender | Mi7 | Escena propia, verbo jugable |
| 20 | Creatividad | Regular | Resonar | Do7 | Escena propia, verbo jugable |
| 21 | Desafío | Regular | Encender | Re7 | Escena propia, verbo jugable |
| 22 | Evolución Espiritual | Regular | Encender | Si7 | Escena propia, verbo jugable |
| 23 | Fe | Regular | Arraigar | Si mayor | Escena propia, sin juego todavía |
| 24 | Gratitud | Regular | Dar y recibir | Solmaj7 | Escena propia, verbo jugable |
| 25 | Hogar | Regular | Arraigar | Do mayor | Escena propia, verbo jugable |
| 26 | Honestidad | Regular | Resonar | Solm7 | Escena propia, verbo jugable |
| 27 | Paciencia | Regular | Arraigar | Re mayor | Escena propia, verbo jugable |
| 28 | Perdón | Regular | Soltar | Fa menor | Escena propia, sin juego todavía |
| 29 | Sincronicidad | Regular | Resonar | Sol mayor | Escena propia, verbo jugable |
| 30 | Esperanza | Regular | Ver | Sim7 | Escena propia, verbo jugable |
| 31 | Vipassana | Special | Soltar | Simaj7 | Escena propia, verbo jugable |
| 32 | Transformación | Regular | Fluir | Rem7 | Escena propia, verbo jugable |
<!-- tabla:fin -->

Esta tabla se genera sola desde `cards.json` (nombre, categoría, verbo), `src/data/cardChords.js` (acorde) y `src/data/cardScenes.js` (escena). Después de cambiar alguno de los tres, correr `npm run docs`; `npm run check:docs` falla si quedó desactualizada. Qué verbo ya se juega está en `PLAYABLE`, dentro de `scripts/check-docs.mjs`. Qué hace cada escena al tocarla: `registro-cartas-vivas.md`.

## Reparto de los verbos entre las 33
Está en el campo `verb` de `src/data/cards.json` y los verbos en `src/data/verbs.js`. Salió del texto de cada carta; se puede corregir editando el JSON. Las dudas del primer reparto ya se revisaron (ver "Decidido" en `verbos-y-dinamicas.md`).

| Verbo | Cartas |
|-------|--------|
| Arraigar (6) | Addhitthana 7, Compromiso 16, Confianza 18, Fe 23, Hogar 25, Paciencia 27 |
| Fluir (4) | Khanti 5, Aceptación 11, Celebración 14, Transformación 32 |
| Encender (4) | Viriya 4, Coraje 19, Desafío 21, Evolución Espiritual 22 |
| Dar y recibir (3) | Dana 2, Metta 8, Gratitud 24 |
| Resonar (7) | Sila 1, Sacca 6, Armonía 12, Comunicación 17, Creatividad 20, Honestidad 26, Sincronicidad 29 |
| Ver (3) | Pañña 3, Belleza 13, Esperanza 30 |
| Soltar (5) | Nekkhamma 0, Upekkha 9, Ciclos 15, Perdón 28, Vipassana 31 |
| Sin verbo (1) | Carta 10 (el silencio) |

Total: 6 + 4 + 4 + 3 + 7 + 3 + 5 + 1 = 33.
