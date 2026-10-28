# Los acordes de las cartas

Cada carta de Anima suena en su propio acorde. Este documento explica de dónde sale cada uno. El código vive en `src/data/cardChords.js` y el sonido en `src/audio/synth.js`.

## La teoría

**Cada nota es un chakra, y cada chakra es un personaje de Algo Particular.** La relación nota-chakra viene de una conversación de teoría musical. La relación chakra-personaje viene de las BIOs del universo (Notion, *Algo Particular / BIOs*).

| Nota | Chakra | Personaje | Lema del personaje |
|---|---|---|---|
| Do | 1º raíz | Sporá (plantas, hongos, esporas, corales) | "Recuperar el templo del cuerpo" |
| Re | 2º sacro | Samas | "Nadar en las aguas de la diferencia" |
| Mi | 3º plexo solar | Kätus | "Abrirnos paso mediante el fuego para llegar al poder" |
| Fa | 4º corazón | Vulpes | "Encontrar el equilibrio en el amor" |
| Sol | 5º garganta | Aura | "Vibrar en la expresión" |
| La | 6º tercer ojo | Huit | "Visualizarnos interiormente" |
| Si | 7º corona | Particular | "La apertura del misterio del cielo" |

Una nota con sostenido o bemol conserva el chakra de su nota natural: Fa# sigue siendo corazón y Sib sigue siendo corona.

La BIO de Samas no dice su chakra. Lo tomamos como sacro porque sus temas son los de ese centro: placer, emociones, deseo y movimiento.

**El tipo de acorde da la energía:**
- **Mayor:** expansiva. Da confianza, claridad y conexión.
- **Menor:** introspectiva. Sirve para liberar emociones retenidas y sanar.
- **Séptima:** transformación. Agrega una cuarta nota que desbloquea y mueve.

**La nota de abajo (la fundamental) es el chakra que manda.** Las otras notas lo acompañan. Por ejemplo, en Re menor el sacro (Re) aporta la emoción, el corazón (Fa) la suaviza con compasión y el tercer ojo (La) le da dirección y claridad.

## Qué significa cada acorde

Esta sección resume la conversación de teoría musical de la que sale todo el sistema, con su contenido tal como vino. Cada acorde trae sus notas con sus chakras, los colores de esos chakras, dos aromas y su uso.

### Acordes mayores

Tienen una energía expansiva y positiva. Promueven confianza, claridad y conexión.

| Acorde | Notas → chakras | Color | Aroma | Uso |
|---|---|---|---|---|
| Do mayor (C) | Do (raíz), Mi (plexo solar), Sol (garganta) | rojo, amarillo, azul claro | sándalo (estabilidad), bergamota (confianza) | Refuerza seguridad, expresión auténtica y poder personal. |
| Re mayor (D) | Re (sacro), Fa# (corazón), La (tercer ojo) | naranja, verde, índigo | ylang-ylang (creatividad), lavanda (intuición) | Fomenta creatividad, apertura emocional y visión clara. |
| Mi mayor (E) | Mi (plexo solar), Sol# (garganta), Si (corona) | amarillo, azul claro, violeta | limón (energía), incienso (trascendencia) | Empodera, favorece comunicación y conexión espiritual. |
| Fa mayor (F) | Fa (corazón), La (tercer ojo), Do (raíz) | verde, índigo, rojo | rosa (amor), pachuli (conexión terrenal) | Abre el corazón mientras se cultiva estabilidad e intuición. |
| Sol mayor (G) | Sol (garganta), Si (corona), Re (sacro) | azul claro, violeta, naranja | menta (claridad), jazmín (creatividad) | Potencia expresión, creatividad y conexión espiritual. |
| La mayor (A) | La (tercer ojo), Do# (raíz), Mi (plexo solar) | índigo, rojo, amarillo | romero (foco), cítricos (vitalidad) | Equilibra la intuición con energía y confianza. |
| Si mayor (B) | Si (corona), Re# (sacro), Fa# (corazón) | violeta, naranja, verde | mirra (espiritualidad), neroli (apertura emocional) | Facilita conexión trascendental y creatividad emocional. |

### Acordes menores

Tienen una energía introspectiva, ideal para liberar emociones retenidas y sanar bloqueos.

| Acorde | Notas → chakras | Color | Aroma | Uso |
|---|---|---|---|---|
| Do menor (Cm) | Do (raíz), Mib (plexo solar), Sol (garganta) | rojo, amarillo apagado, azul claro | cedro (estabilidad), lavanda (calma) | Ayuda a sanar inseguridades y a fortalecer la comunicación. |
| Re menor (Dm) | Re (sacro), Fa (corazón), La (tercer ojo) | naranja, verde, índigo | canela (pasión), rosa (amor) | Facilita el flujo emocional y la introspección creativa. |
| Mi menor (Em) | Mi (plexo solar), Sol (garganta), Si (corona) | amarillo, azul claro, violeta | eucalipto (limpieza), sándalo (centrado) | Empodera desde la introspección y el equilibrio espiritual. |
| Fa menor (Fm) | Fa (corazón), Lab (tercer ojo), Do (raíz) | verde oscuro, índigo apagado, rojo | geranio (armonía), pachuli (estabilidad) | Ayuda a liberar heridas emocionales profundas. |
| Sol menor (Gm) | Sol (garganta), Sib (corona), Re (sacro) | azul claro, violeta oscuro, naranja | albahaca (claridad), incienso (intuición) | Promueve comunicación introspectiva y creatividad emocional. |
| La menor (Am) | La (tercer ojo), Do (raíz), Mi (plexo solar) | índigo, rojo, amarillo apagado | salvia (purificación), limón (vitalidad) | Facilita claridad mental y confianza desde un lugar introspectivo. |
| Si menor (Bm) | Si (corona), Re (sacro), Fa# (corazón) | violeta oscuro, naranja apagado, verde oscuro | jazmín (apertura), mirra (trascendencia) | Potencia la conexión espiritual con raíces emocionales. |

### Acordes de séptima

Aportan riqueza y complejidad, ideales para desbloquear energía y trabajar la transformación personal. Se arman agregando a un acorde una cuarta nota, la séptima. Hay cuatro tipos, y en los siete acordes naturales dan 28.

La conversación detalla solo **Do7** y da el uso de **Mi7**. Todo lo demás de esta sección está **inferido** con el mismo método que usa la conversación en los acordes que sí describe:
- **Colores:** los de los chakras de sus notas. Las notas rebajadas de un acorde menor o disminuido van con el color "apagado" u "oscuro", como en los menores del chat.
- **Aroma:** uno del chakra de la fundamental y otro del chakra de la nota que caracteriza al acorde, que en las séptimas es la propia séptima. Es el patrón de los mayores del chat (Do mayor: sándalo de la raíz y bergamota del plexo).
- **Uso:** el del acorde base, más lo que aporta el chakra de la séptima y el tipo de séptima.

**Aromas por chakra**, tal como los usa la conversación:

| Chakra | Aromas |
|---|---|
| raíz | sándalo, pachuli, cedro |
| sacro | ylang-ylang, jazmín, canela |
| plexo solar | limón, bergamota, cítricos |
| corazón | rosa, neroli, geranio |
| garganta | menta, eucalipto, albahaca |
| tercer ojo | lavanda, romero, salvia |
| corona | incienso, mirra |

**Qué aporta cada posición dentro del acorde:**
- **Fundamental:** el chakra que manda, la base energética.
- **Tercera:** el carácter. La mayor ilumina y la menor mira hacia adentro.
- **Quinta:** estabilidad, sostiene la estructura.
- **Séptima:** el chakra que se suma para mover y transformar. Es una tensión que pide ir hacia algún lado.

Una nota con alteración conserva el chakra de su letra. Por eso, en los siete acordes naturales, las cuatro séptimas que se arman sobre una misma fundamental tocan los mismos cuatro chakras. Lo que cambia es cómo se relacionan entre sí.

#### Séptima dominante (7): mayor con séptima menor

Es una tensión que pide resolverse: transformación en movimiento, empuja hacia lo próximo. Las cartas usan seis acordes de este tipo; también usan la séptima mayor y la menor.

| Acorde | Notas → chakras | Color | Aroma | Uso | Cartas |
|---|---|---|---|---|---|
| Do7 (C7) | Do (raíz), Mi (plexo), Sol (garganta), Sib (corona) | rojo, amarillo, azul claro, violeta | bergamota, sándalo | Expansión creativa con estabilidad y confianza. *(chat)* | Creatividad |
| Re7 (D7) | Re (sacro), Fa# (corazón), La (tercer ojo), Do (raíz) | naranja, verde, índigo, rojo | ylang-ylang, sándalo | *Inferido:* la creatividad y la apertura emocional de Re mayor, con la raíz como séptima que pide bajarlas a tierra. Transformar lo que se siente en un paso concreto. | Desafío |
| Mi7 (E7) | Mi (plexo), Sol# (garganta), Si (corona), Re (sacro) | amarillo, azul claro, violeta, naranja *(inferido)* | limón, jazmín *(inferido)* | Integra la fuerza interior con la expresión espiritual. *(chat)* | Coraje |
| Fa7 (F7) | Fa (corazón), La (tercer ojo), Do (raíz), Mib (plexo) | verde, índigo, rojo, amarillo | rosa, bergamota | *Inferido:* el amor anclado de Fa mayor, con el plexo como séptima que lo pone en acción. Amor que se vuelve voluntad. | Ciclos |
| Sol7 (G7) | Sol (garganta), Si (corona), Re (sacro), Fa (corazón) | azul claro, violeta, naranja, verde | menta, rosa | *Inferido:* la expresión y la conexión espiritual de Sol mayor, con el corazón como séptima. Hablar y actuar escuchando al corazón; la voz se transforma cuando nace de lo que se siente. | Sila, Sacca |
| La7 (A7) | La (tercer ojo), Do# (raíz), Mi (plexo), Sol (garganta) | índigo, rojo, amarillo, azul claro | romero, menta | *Inferido:* la intuición con confianza de La mayor, con la garganta como séptima. La visión que busca su voz y se dice. | — |
| Si7 (B7) | Si (corona), Re# (sacro), Fa# (corazón), La (tercer ojo) | violeta, naranja, verde, índigo | mirra, salvia | *Inferido:* la conexión trascendental de Si mayor, con el tercer ojo como séptima. Evolución espiritual guiada por la intuición. | Evolución Espiritual |

#### Séptima mayor (maj7): mayor con séptima mayor (inferido)

La séptima queda medio tono debajo de la octava. Suena luminosa y contemplativa, con una nostalgia serena: es expansión en calma, como un sueño despierto. La usan Khanti (Remaj7), Metta (Famaj7), Armonía (Domaj7), Celebración (Mimaj7), Gratitud (Solmaj7) y Vipassana (Simaj7).

| Acorde | Notas → chakras | Color | Aroma | Uso |
|---|---|---|---|---|
| Domaj7 (Cmaj7) | Do (raíz), Mi (plexo), Sol (garganta), Si (corona) | rojo, amarillo, azul claro, violeta | sándalo, incienso | Seguridad y expresión que se abren con calma a lo espiritual. |
| Remaj7 (Dmaj7) | Re (sacro), Fa# (corazón), La (tercer ojo), Do# (raíz) | naranja, verde, índigo, rojo | ylang-ylang, cedro | Creatividad y visión que echan raíz sin apuro. |
| Mimaj7 (Emaj7) | Mi (plexo), Sol# (garganta), Si (corona), Re# (sacro) | amarillo, azul claro, violeta, naranja | limón, ylang-ylang | Poder personal suave, que se disfruta en vez de imponerse. |
| Famaj7 (Fmaj7) | Fa (corazón), La (tercer ojo), Do (raíz), Mi (plexo) | verde, índigo, rojo, amarillo | rosa, bergamota | Amor sereno que confía en sí mismo. |
| Solmaj7 (Gmaj7) | Sol (garganta), Si (corona), Re (sacro), Fa# (corazón) | azul claro, violeta, naranja, verde | menta, neroli | Expresión que nace del corazón con calma y apertura. |
| Lamaj7 (Amaj7) | La (tercer ojo), Do# (raíz), Mi (plexo), Sol# (garganta) | índigo, rojo, amarillo, azul claro | romero, eucalipto | Intuición que se dice con claridad y sin urgencia. |
| Simaj7 (Bmaj7) | Si (corona), Re# (sacro), Fa# (corazón), La# (tercer ojo) | violeta, naranja, verde, índigo | mirra, lavanda | Contemplación trascendental, la ensoñación de la visión interior. |

#### Séptima menor (m7): menor con séptima menor (inferido)

Es la introspección del acorde menor, más tibia y menos melancólica: una reflexión serena que deja una puerta abierta. La usan Pañña (Lam7), Honestidad (Solm7), Esperanza (Sim7) y Transformación (Rem7).

| Acorde | Notas → chakras | Color | Aroma | Uso |
|---|---|---|---|---|
| Dom7 (Cm7) | Do (raíz), Mib (plexo), Sol (garganta), Sib (corona) | rojo, amarillo apagado, azul claro, violeta oscuro | cedro, incienso | Sanar inseguridades abriéndose a algo más grande. |
| Rem7 (Dm7) | Re (sacro), Fa (corazón), La (tercer ojo), Do (raíz) | naranja, verde, índigo, rojo | canela, pachuli | Un flujo emocional que se asienta y encuentra suelo. |
| Mim7 (Em7) | Mi (plexo), Sol (garganta), Si (corona), Re (sacro) | amarillo, azul claro, violeta, naranja | eucalipto, jazmín | Fuerza interior desde la introspección, con lugar para el disfrute. |
| Fam7 (Fm7) | Fa (corazón), Lab (tercer ojo), Do (raíz), Mib (plexo) | verde oscuro, índigo apagado, rojo, amarillo apagado | geranio, bergamota | Liberar heridas profundas mientras se recupera la fuerza propia. |
| Solm7 (Gm7) | Sol (garganta), Sib (corona), Re (sacro), Fa (corazón) | azul claro, violeta oscuro, naranja, verde | albahaca, rosa | Una comunicación introspectiva que escucha al corazón. |
| Lam7 (Am7) | La (tercer ojo), Do (raíz), Mi (plexo), Sol (garganta) | índigo, rojo, amarillo apagado, azul claro | salvia, menta | Claridad mental que, desde adentro, encuentra palabras. |
| Sim7 (Bm7) | Si (corona), Re (sacro), Fa# (corazón), La (tercer ojo) | violeta oscuro, naranja apagado, verde oscuro, índigo | jazmín, lavanda | Conexión espiritual con raíces emocionales, guiada por la intuición. |

#### Séptima disminuida (dim7): cuatro notas a igual distancia (inferido)

Es la tensión más suspendida: no tiene un centro claro y puede ir hacia cualquier lado. Es un umbral, el momento de incertidumbre justo antes de una transformación. Todos sus colores van apagados. La app no la usa.

| Acorde | Notas → chakras | Color | Aroma | Uso |
|---|---|---|---|---|
| Dodim7 (Cdim7) | Do (raíz), Mib (plexo), Solb (garganta), Sibb (corona) | rojo oscuro, amarillo apagado, azul apagado, violeta apagado | cedro, incienso | Atravesar el miedo cuando falta el suelo. |
| Redim7 (Ddim7) | Re (sacro), Fa (corazón), Lab (tercer ojo), Dob (raíz) | naranja apagado, verde oscuro, índigo apagado, rojo oscuro | canela, cedro | Emociones intensas que todavía no encuentran cauce. |
| Midim7 (Edim7) | Mi (plexo), Sol (garganta), Sib (corona), Reb (sacro) | amarillo apagado, azul apagado, violeta oscuro, naranja apagado | limón, canela | La voluntad en crisis, buscando una nueva dirección. |
| Fadim7 (Fdim7) | Fa (corazón), Lab (tercer ojo), Dob (raíz), Mibb (plexo) | verde oscuro, índigo apagado, rojo oscuro, amarillo apagado | geranio, limón | El duelo, el corazón en el umbral antes de sanar. |
| Soldim7 (Gdim7) | Sol (garganta), Sib (corona), Reb (sacro), Fab (corazón) | azul apagado, violeta oscuro, naranja apagado, verde oscuro | albahaca, geranio | Lo que todavía no se puede decir. |
| Ladim7 (Adim7) | La (tercer ojo), Do (raíz), Mib (plexo), Solb (garganta) | índigo apagado, rojo oscuro, amarillo apagado, azul apagado | salvia, albahaca | La confusión antes de la claridad: no ver todavía. |
| Sidim7 (Bdim7) | Si (corona), Re (sacro), Fa (corazón), Lab (tercer ojo) | violeta oscuro, naranja apagado, verde oscuro, índigo apagado | mirra, salvia | La noche oscura del alma, la desconexión antes de la reconexión. |

### Cómo trabajan las notas dentro de un acorde

En un acorde, la fundamental es la base energética. La tercera define su carácter: la tercera mayor lo ilumina y la tercera menor le da su tono introspectivo y melancólico. La quinta le da estabilidad. La conversación analiza dos acordes en detalle.

**Re menor (Re, Fa, La):**
- **Re, sacro, la fundamental.** Es la base emocional del acorde: deseo, flujo y capacidad de sentir.
- **Fa, corazón, la tercera menor.** Define el carácter introspectivo del acorde. Ayuda a que la energía cruda del sacro encuentre suavidad y empatía, e integra las emociones personales con un amor más universal.
- **La, tercer ojo, la quinta.** Lleva la creatividad del sacro a un nivel más consciente: transforma emociones crudas en inspiración o visión. Le agrega claridad y perspectiva a lo que el corazón procesa.
- **Juntos:** es un acorde para la introspección emocional. Sirve para liberar bloqueos creativos o transformar emociones intensas en intuición e inspiración.

**Fa mayor (Fa, La, Do):**
- **Fa, corazón, la fundamental.** Pone la energía principal: amor, apertura y equilibrio emocional.
- **La, tercer ojo, la tercera mayor.** Le da al acorde una cualidad luminosa: la intuición guiada por el amor.
- **Do, raíz, la quinta.** Ancla el amor y la intuición para que se expresen de manera estable y práctica.
- **Juntos:** es un acorde para la apertura emocional con claridad mental y estabilidad. Sirve para la compasión hacia uno mismo y hacia otros.

### Secuencias para trabajar en uno mismo

La conversación propone tres progresiones. Hoy la app no las usa, pero son parte de la misma teoría.

1. **Estabilidad y confianza:** Do → Fa → Sol → Do. Establece una base firme, abre el corazón y fomenta la expresión.
2. **Liberar emociones:** Re menor → La menor → Mi menor → Fa mayor. Invita a fluir con las emociones y a conectar con la intuición.
3. **Conexión espiritual:** Si menor → Sol mayor → Mi7 → La menor. Promueve introspección, expresión y conexión trascendental.

## Cómo se elige el acorde de una carta

1. **El texto de la carta manda.** La descripción, la afirmación y la invitación dicen qué chakra se trabaja y con qué energía (abrir, mirar hacia adentro, transformar). De ahí sale el acorde.
2. **Los personajes de la ilustración no deciden el acorde.** Particular, Sporá, Samas, Kätus, Vulpes, Aura y Huit son expresiones de lo mismo, partículas que evolucionaron en el universo, y Particular es el protagonista de todo el viaje. Que su nota esté o no en el acorde es solo una pista, nunca una condición.
3. **Las cartas que resuenan pueden compartir acorde.** Es mejor respetar esa afinidad que forzar un acorde distinto para cada una. Hoy 33 cartas usan 27 acordes: se repiten Si menor (Nekkhamma, Aceptación), Sol7 (Sila, Sacca), Si mayor (Dana, Fe), Mi mayor (Viriya, Addhitthana), Sol mayor (carta 10, Belleza) y Re mayor (Paciencia, Sincronicidad).

## El acorde de base: Sol mayor

Fuera de las cartas, toda la app suena en **Sol mayor**: Sol (garganta, Aura), Si (corona, Particular) y Re (sacro, Samas). Según la teoría, ese acorde potencia la expresión, la creatividad y la conexión espiritual. Hay dos razones más:
- **Aura:** su elemento es el **sonido**, y con ella nació la idea de organizar el universo por chakras.
- **Particular:** es el protagonista y representa la conexión con el Todo (el rulito).

También es la base que mejor se lleva con las cartas. Comparte al menos una nota con el acorde de 28 de las 33, así que entrar a una carta casi siempre es una entrada suave. Las cinco que no comparten ninguna son Metta (Famaj7), Ciclos (Fa7), Compromiso (La mayor), Confianza (La menor) y Perdón (Fa menor): el texto manda antes que la suavidad de la entrada.

## La tabla

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

## Pendiente

- **Huit (tercer ojo, La)** no aparece en ninguna ilustración actual. El autor va a cambiarlo.

Ya se escuchó en un teléfono y suena bien.
