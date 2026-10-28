# Música

Tercera pestaña de "Anima por dentro". Cada carta suena en su propio acorde; este documento explica de dónde sale cada uno, cómo suena y qué se puede hacer con los acordes más allá de las cartas. La teoría (cómo se arma un acorde y los 42 posibles) está en `teoria.md`. El código vive en `src/data/cardChords.js` y el sonido en `src/audio/synth.js`.

## El acorde de cada carta

1. **El texto de la carta manda.** La descripción, la afirmación y la invitación dicen qué chakra se trabaja y con qué energía (abrir, mirar hacia adentro, transformar). De ahí sale el acorde.
2. **Los personajes de la ilustración no deciden el acorde.** Particular, Sporá, Samas, Kätus, Vulpes, Aura y Huit son expresiones de lo mismo, partículas que evolucionaron en el universo, y Particular es el protagonista de todo el viaje. Que su nota esté o no en el acorde es solo una pista, nunca una condición.
3. **Las cartas que resuenan pueden compartir acorde.** Es mejor respetar esa afinidad que forzar un acorde distinto para cada una. Hoy 33 cartas usan 27 acordes: se repiten Si menor (Nekkhamma, Aceptación), Sol7 (Sila, Sacca), Si mayor (Dana, Fe), Mi mayor (Viriya, Addhitthana), Sol mayor (carta 10, Belleza) y Re mayor (Paciencia, Sincronicidad).

### El acorde de base: Sol mayor

Fuera de las cartas, toda la app suena en **Sol mayor**: Sol (garganta, Aura), Si (corona, Particular) y Re (sacro, Samas). Según la teoría, ese acorde potencia la expresión, la creatividad y la conexión espiritual. Hay dos razones más:
- **Aura:** su elemento es el **sonido**, y con ella nació la idea de organizar el universo por chakras.
- **Particular:** es el protagonista y representa la conexión con el Todo (el rulito).

También es la base que mejor se lleva con las cartas. Comparte al menos una nota con el acorde de 28 de las 33, así que entrar a una carta casi siempre es una entrada suave. Las cinco que no comparten ninguna son Metta (Famaj7), Ciclos (Fa7), Compromiso (La mayor), Confianza (La menor) y Perdón (Fa menor): el texto manda antes que la suavidad de la entrada.

### La tabla

| # | Carta | Acorde | Notas → chakras | Por qué este acorde | Personajes en la ilustración |
|---|---|---|---|---|---|
| 0 | Nekkhamma | Si menor | Si, Re, Fa# → corona, sacro, corazón | Renuncia, soltar, "un ser sagrado haciendo una experiencia humana". La corona manda (lo sagrado) y el modo menor mira hacia adentro (soltar). | Particular (tres, deshaciéndose) |
| 1 | Sila | Sol7 | Sol, Si, Re, Fa → garganta, corona, sacro, corazón | "Encuentro paz al hacer el bien en resonancia con la voz de mi alma". La voz del alma es la garganta, acompañada por la corona. Para hacer el bien hay que escuchar al corazón, así que el Fa del corazón de Sid entra como séptima. | Particular y el corazón de Sid (Fa) |
| 2 | Dana | Si mayor | Si, Re#, Fa# → corona, sacro, corazón | "Escucho al niño que llevo dentro y soy feliz al dar". El niño interior es el sacro y dar es el corazón. La teoría dice que este acorde facilita la conexión trascendental y la creatividad emocional. | Particular (dos) |
| 3 | Pañña | Lam7 | La, Do, Mi, Sol → tercer ojo, raíz, plexo, garganta | Sabiduría que se pregunta y se escucha en silencio: "Escucha en silencio", "mi centro calmo". El tercer ojo manda, y el acorde es claridad mental que, desde adentro, encuentra sus respuestas. | Sid (Particular), hongos y bosque (Sporá) |
| 4 | Viriya | Mi mayor | Mi, Sol#, Si → plexo, garganta, corona | Energía y determinación: "sigo su verdad con determinación". La voluntad es el plexo solar. | Particular (caminante con báculo) |
| 5 | Khanti | Remaj7 | Re, Fa#, La, Do# → sacro, corazón, tercer ojo, raíz | Tolerancia y paciencia con el propio proceso: "respeta tus tiempos sin exigencias", soltar culpas, mirar con perspectiva más amplia. El sacro manda (culpa) y la séptima mayor le da calma, sin apuro. | Varios personajes dentro de los frascos |
| 6 | Sacca | Sol7 | Sol, Si, Re, Fa → garganta, corona, sacro, corazón | Comprometerse con la propia verdad y abrirle la puerta al propósito. La verdad se dice con la garganta y la corona la acompaña; es la verdad que se escucha en el corazón, por eso el corazón de Sid (Fa) entra como séptima. | Particular en la barca y el corazón de Sid (Fa) |
| 7 | Addhitthana | Mi mayor | Mi, Sol#, Si → plexo, garganta, corona | Determinación para nutrir hábitos. Es la voluntad, el plexo solar en modo mayor. | Particular en el bote, bajo la tormenta |
| 8 | Metta | Famaj7 | Fa, La, Do, Mi → corazón, tercer ojo, raíz, plexo | Amar primero a uno mismo para después dar: "soy Amor infinito". El corazón manda, y el acorde es amor sereno que confía en sí mismo. | Particular y otros, con un zorrito (Vulpes) |
| 9 | Upekkha | Mi menor | Mi, Sol, Si → plexo, garganta, corona | Ecuanimidad e impermanencia: soltar el exceso de control. Es el equilibrio espiritual desde la introspección. | Particular, hongos (Sporá) |
| 10 | " ... " | Sol mayor (base) | — | La carta en blanco no tiene texto que elija un acorde, así que se queda en el sonido de base. | — |
| 11 | Aceptación | Si menor | Si, Re, Fa# → corona, sacro, corazón | "Acepto y honro quién soy", soltar el control. La teoría lo describe como conexión espiritual con raíces emocionales, mirando hacia adentro. | Particular (dos) |
| 12 | Armonía | Domaj7 | Do, Mi, Sol, Si → raíz, plexo, garganta, corona | "Vibro en armonía en mi aquí y ahora": equilibrio entre sonido y pausa, pausa de silencio interior. La raíz y la garganta se abren con calma, sin tensión. | Aura (dos medusas) |
| 13 | Belleza | Sol mayor | Sol, Si, Re → garganta, corona, sacro | Reconocer la belleza propia y la de los demás. Expresión y conexión espiritual, con el sacro (lo sensible). | Particular (dos, abrazados), árboles |
| 14 | Celebración | Mimaj7 | Mi, Sol#, Si, Re# → plexo, garganta, corona, sacro | "Celebro la vida… celebrarTE": placer, disfrute y pequeños rituales. Es el poder personal del plexo, suave, que se disfruta en vez de imponerse. | Particular, gatitos (Kätus), zorritos (Vulpes), fuego |
| 15 | Ciclos | Fa7 | Fa, La, Do, Mib → corazón, tercer ojo, raíz, plexo | "Agradezco quien fui, honro quien soy y proyecto quien quiero ser": cerrar un ciclo dejando que el corazón guíe. El amor se vuelve voluntad: la séptima empuja hacia el próximo ciclo. | Particular, paisaje |
| 16 | Compromiso | La mayor | La, Do#, Mi → tercer ojo, raíz, plexo | "Estoy comprometida con mi búsqueda y visión". La visión es el tercer ojo, que manda, y el compromiso se apoya en la raíz y la voluntad. | Paisaje con plantas (Sporá; Do# cuenta como raíz) |
| 17 | Comunicación | Sol menor | Sol, Sib, Re → garganta, corona, sacro | El primer paso para comunicarte es escucharte a vos mismo, en silencio, antes de hablar con claridad y honestidad. Es comunicación introspectiva, la garganta mirando hacia adentro. | Aura (tres) en el bosque rosa |
| 18 | Confianza | La menor | La, Do, Mi → tercer ojo, raíz, plexo solar | Confiar en la propia intuición y en las señales del cuerpo, dejar que la sabiduría guíe los pasos. Es confianza desde un lugar introspectivo, con el tercer ojo al mando. | Particular (Si), Aura (Sol), Vulpes (Fa) |
| 19 | Coraje | Mi7 | Mi, Sol#, Si, Re → plexo, garganta, corona, sacro | "Mi fuerza interior guía mis pasos": valentía para seguir el camino del corazón. Es el plexo de Kätus, el fuego que se abre paso, integrado con la expresión y lo espiritual. | Kätus en el borde del acantilado |
| 20 | Creatividad | Do7 | Do, Mi, Sol, Sib → raíz, plexo, garganta, corona | "Pongo en práctica mi creatividad y creo la vida que sueño". La teoría describe este acorde como expansión creativa con estabilidad y confianza. | Corona de hongos (Sporá) |
| 21 | Desafío | Re7 | Re, Fa#, La, Do → sacro, corazón, tercer ojo, raíz | Transformar el desafío en una oportunidad para conocerse. Corazón y transformación. | Vulpes frente al laberinto |
| 22 | Evolución Espiritual | Si7 | Si, Re#, Fa#, La → corona, sacro, corazón, tercer ojo | "Mi alma evoluciona cada día". Es la corona transformándose. | Corona de helechos y hongos (Sporá), ser acurrucado dentro |
| 23 | Fe | Si mayor | Si, Re#, Fa# → corona, sacro, corazón | "Tengo fe en la fuerza inconmovible de mi alma y el apoyo del universo". La corona en modo mayor. | Particular brillando, hongos gigantes (Sporá) |
| 24 | Gratitud | Solmaj7 | Sol, Si, Re, Fa# → garganta, corona, sacro, corazón | Gratitud que se expresa: agradecer quién soy y a un ser querido. Es expresión que nace del corazón agradecido, con calma y apertura. | Particular en su isla |
| 25 | Hogar | Do mayor | Do, Mi, Sol → raíz, plexo, garganta | "Cada día regreso a mi hogar". El hogar es la raíz. El acorde incluye a Sporá (Do) y a Aura (Sol). | Célula de corales (Sporá) con una medusa (Aura) |
| 26 | Honestidad | Solm7 | Sol, Sib, Re, Fa → garganta, corona, sacro, corazón | "¿Qué siento?": acallar voces externas y escuchar al cuerpo para conocer la verdad. Es comunicación introspectiva que escucha al corazón. | Aura bajo el sol, corales |
| 27 | Paciencia | Re mayor | Re, Fa#, La → sacro, corazón, tercer ojo | "Descubro milagros a cada instante", aprendiendo de los ciclos de la naturaleza. La teoría habla de creatividad, apertura emocional y visión clara. | Los Samas en su bote |
| 28 | Perdón | Fa menor | Fa, Lab, Do → corazón, tercer ojo, raíz | "Me perdono a mí mismo y a los otros": sanar vínculos y dejar culpas y rencores. El corazón mirando hacia adentro, para liberar heridas emocionales profundas. | Particular en el borde, junto a la luna |
| 29 | Sincronicidad | Re mayor | Re, Fa#, La → sacro, corazón, tercer ojo | "Estoy en el momento y lugar indicado". Es el fluir: el sacro, con intuición y corazón. | Samas en pareja dentro de burbujas, fuego |
| 30 | Esperanza | Sim7 | Si, Re, Fa#, La → corona, sacro, corazón, tercer ojo | No estás solo, te acompañan guías y ancestros. La corona y las raíces emocionales (el sacro y el corazón de Vulpes), guiadas por la intuición del tercer ojo. | Vulpes en las dunas, la luna |
| 31 | Vipassana | Simaj7 | Si, Re#, Fa#, La# → corona, sacro, corazón, tercer ojo | "Observar con el corazón": contemplación de uno mismo, desapego, ver las cosas tal cual son. Es contemplación trascendental, la visión interior; la corona manda. | Particular con su rulito, células |
| 32 | Transformación | Rem7 | Re, Fa, La, Do → sacro, corazón, tercer ojo, raíz | "Mi corazón fluye con alegría en el transcurso del cambio": encontrar equilibrio en medio del movimiento. Un flujo emocional que se asienta y encuentra suelo. | Samas, palmera (Sporá) |

## Cómo suena

- **Fuera de las cartas** suena Sol mayor: un colchón de fondo, campanitas en pentatónica y gotas de agua.
- **Al tomar una carta en el oráculo**, el fondo empieza a moverse hacia el acorde de esa carta. Las notas de `pick` suben por la fundamental, la quinta y la octava. `flip` cae en la tercera, la nota que define si el acorde es mayor o menor, así la carta "muestra su color" al darse vuelta.
- **Dentro de la carta**:
  - El fondo y las campanitas quedan en el acorde de la carta.
  - Cada toque (`tap`) cae en una nota del acorde, así que tocar varias veces arma una melodía.
  - Cada estrella (`star`) rasguea el acorde. El mayor brilla, el menor es más lento y suave, y la séptima "late".
- **Al salir de la carta**, el sonido vuelve a Sol mayor.

## Para cambiar un acorde

Se cambia una línea en `src/data/cardChords.js`, por ejemplo `28: 'Em'`. Se escriben como `C`, `Dm`, `G7` o `F#m`. Si cambia el motivo, también hay que actualizar esta tabla.

## Secuencias para trabajar en uno mismo

De las 42 escenas posibles, intercambiables, algunas cuentan una historia o guían una secuencia de pasos, acciones y reflexiones para liberar una mejor versión. La app todavía no las usa.

La conversación propone tres progresiones, parte de la misma teoría:

1. **Estabilidad y confianza:** Do → Fa → Sol → Do. Establece una base firme, abre el corazón y fomenta la expresión.
2. **Liberar emociones:** Re menor → La menor → Mi menor → Fa mayor. Invita a fluir con las emociones y a conectar con la intuición.
3. **Conexión espiritual:** Si menor → Sol mayor → Mi7 → La menor. Promueve introspección, expresión y conexión trascendental.

### La ley de octava

Gurdjieff describe toda evolución como una octava que sube de do a do. Hay dos lugares, mi–fa y si–do, donde el proceso no puede seguir con su propia energía: necesita un choque que venga de afuera, y el de si–do tiene que ser más fuerte. En la escala de Do mayor esos son justo los dos semitonos: en el piano de la pestaña Teoría, los dos lugares donde no hay tecla negra. Lo que sigue es lectura nuestra, no algo que Gurdjieff diga de los chakras.

- **Mi–fa: de Kätus a Vulpes.** Del plexo, la voluntad propia, al corazón. El verbo de Vulpes es Dar y recibir: lo que hace falta para cruzar viene de otro.
- **Si–do: de Particular a la octava siguiente.** De la corona al do de arriba: la raíz de un nivel nuevo. Es el choque más grande, el que cierra una octava y abre otra.
- **El rulito suena en la octava siguiente.** Completar un gesto es llegar al do de arriba: cuando aparece el rulito, el acorde de la carta sube hasta su fundamental una octava más alta y ahí suena entero. Ya está en la app.

Para las secuencias (por diseñar): una secuencia que suba por los chakras necesitaría un gesto distinto en los dos pasos sin tecla negra. Mi–fa podría pedir algo de otro, como en Dar y recibir, y si–do, el choque más grande, cerrar la octava.
