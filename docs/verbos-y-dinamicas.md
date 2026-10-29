# Verbos y dinámicas

Decisión: los juegos de las cartas se organizan en **7 verbos**, uno por personaje / chakra / nota. Cada verbo es la dinámica básica de una familia de juegos; cada carta toma el verbo que le calza por su significado y lo viste con su propia ilustración. Fuente de los personajes: Notion, Algo Particular / BIOs.

Qué dinámica propone cada verbo: más abajo, en "Dinámicas: qué propone cada verbo".

## Reglas de los verbos
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
- **Arraigar** (raíz) es el polo de la manifestación: de la materia a la manifestación. Está probado en Paciencia y en Hogar.
- **Soltar** (corona) es el polo de la liberación: del entendimiento a la existencia. Está probado en Vipassana.
- **Dar y recibir** (corazón) es donde las dos corrientes se encuentran. Las notas de Belén lo dicen así: "dos triángulos entrelazados, el movimiento descendente del espíritu en la materia y la liberación ascendente de la materia en el espíritu: equilibrio perfecto en el corazón". Está implementado en Dana: compartir la luz de la llamita con todos los de la isla, y que vuelva multiplicada (ver más abajo, en "Dinámicas").
- **Fluir, Encender, Resonar y Ver** serían los pasos entre un polo y el otro. Ver está probado en Pañña, Encender en Evolución Espiritual, Fluir en Khanti y Resonar en Sincronicidad (a tiempo) y en Creatividad (composición libre).

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

## Decidido
- Carta 10 (`" ... "`): es el silencio. No hay nada que leer ni decir, la invitación es sentir el corazón. Su verbo va entre Fa, Sol o La (por decidir); la forma, por definir.
- Nombre del personaje: **Sid** (Seed, semilla).
- El bichito con pelos y antenas es un Sama. El ser dentro de la célula de Evolución es Sid.
- Ciclos es **Soltar**, no Ver: *"¿Qué es tiempo de dejar ir?"*, *"sólo puedes avanzar si sos capaz de soltar lo viejo"*. Fluir se queda con Transformación, que habla de atravesar el cambio; Ciclos habla de cerrarlo.
- Belleza y Esperanza son **Ver**: *"poder ver lo bello"*; *"hilos invisibles de luz"* bajo un cielo de estrellas.
- Upekkha se queda en **Soltar** (la impermanencia, soltar el ancla), aunque su invitación diga "fluí".
- Sila se queda en **Resonar**: es la conducta ética (en el Noble Óctuple Sendero, *sīla* reúne recta palabra, recta acción y recto modo de vida) y la carta la plantea "en resonancia con la voz de tu sabiduría interior".
- Sincronicidad es **Resonar**, no Ver: estar en armonía y en el momento justo.
- Aceptación es **Fluir**, no Dar y recibir: su ilustración es un río entre dos seres iguales y su texto pide no luchar contra lo que no se controla.
- Khanti es **Fluir** (Samas), no Soltar: los corchos que vacían los frascos quedan como la parte de soltar dentro de ese juego.
- Creatividad y Hogar intercambian la ilustración entera (corona, personaje, imagen de la carta y colores). Creatividad: corales y medusa (Aura). Hogar: hongos y larva (Sama).
- Vipassana es **Soltar** (el "ver las cosas tal cual son" lleva al desapego).
- Hogar se queda con la larva (Sama). Sid va dentro de Evolución Espiritual, que es donde mejor calza.

## Reglas comunes de las dinámicas
- **Nada se pierde ni se falla.** No hay puntaje, tiempo límite ni "game over". Si el gesto no se completa, la escena sigue viva y se puede intentar de nuevo.
- **El premio es el rulito.** Completar el gesto es "uy, me conecté con el Todo": el rulito aparece, se dibuja o se enciende. Cada conexión es distinta: el rulito nunca sale con la misma forma dos veces. No se ve hasta que se empieza a jugar.
- **La lectura no se bloquea.** La descripción, la afirmación y la invitación están siempre disponibles. El juego no es una puerta.
- **Se puede jugar sin tocar la pantalla:** con teclado (Enter o espacio) y con `prefers-reduced-motion` (sin chispas ni animaciones largas, pero el gesto funciona).
- **Suena en el acorde de la carta** (`src/data/cardChords.js`): los toques son notas de ese acorde. El cierre del gesto, cuando aparece el rulito, es ese mismo acorde **en la octava siguiente** (`rulito`): sus notas suben de la fundamental a la fundamental de arriba y ahí suena entero. Es la ley de octava de Gurdjieff: un proceso que se completa vuelve a empezar en el do de arriba (ver `musica.md`). En Encender, antes del rulito, el acorde de la carta (Si7) se resuelve en Mi mayor, la nota de Kätus (`resolve`).
- **Dura poco.** Un gesto completo se resuelve en pocos segundos y se puede repetir.

## Dinámicas: qué propone cada verbo

Cada carta tiene un verbo (`verb` en `src/data/cards.json`, lista en `src/data/verbs.js`). El verbo define la **dinámica**: qué hace la persona con la escena. La ilustración, el sonido y el significado los pone cada carta. Los siete verbos son uno por personaje y chakra (ver arriba).

Los siete verbos se probaron en una escena: **Arraigar en Paciencia** (y, hacia adentro, en **Hogar**), **Fluir en Khanti**, **Encender en Evolución Espiritual** (frotar y lanzar el fuego), **Dar y recibir en Dana** (compartir la luz), **Resonar en Sincronicidad** (y, como composición libre, en **Creatividad**), **Ver en Pañña** y **Soltar en Vipassana**. Lo implementado no es fijo: son ideas probadas y pueden cambiar. Lo que se dice de las otras cartas son propuestas, tomando como punto de partida lo que ya hacen las escenas.

Orden de los verbos: Arraigar (raíz) y Soltar (corona) son los dos polos, la corriente de manifestación y la de liberación, y Dar y recibir (corazón) es donde se encuentran. Los dos polos y el centro están probados: el centro, en Dana. Ver arriba, sección "Dos corrientes".

### 1. Arraigar (Sporá, demonio: miedo) — implementado en Paciencia
**Dinámica:** sostener. Mantener apretado un punto de la escena hasta que algo crece.
**Cómo funciona hoy en Paciencia:** al mantener apretada la piña (dedo, clic o tecla) primero crece una red de raíces doradas bajo el campo de hongos, saliendo de la piña (unos 2,4 segundos para extenderse del todo). Cuando las raíces han agarrado (a un tercio), el rulito sobre la cabeza del Sama del centro nace como un punto, se estira en una línea, se dobla en un gancho, cierra el lazo y estira el tallo; tarda unos 2,6 segundos más (nace rápido, el lazo es un trazo veloz y se asienta al llegar). Mientras tanto la piña brilla y su resplandor crece. Al completarse florece con un pequeño "pop" y se ilumina el nombre de la carta (queda encendido mientras el rulito está casi entero y se apaga con él): salen chispas, suena el acorde en la octava siguiente (`rulito`) y las esporas azules se multiplican (una oleada desde los hongos y una nube varias veces más densa por unos segundos, que se va asentando). Si se suelta, la cola del rulito va alcanzando a la cabeza (unos 3,4 segundos para recorrerlo entero), el lazo se abre, queda el tallo, se encoge hasta un punto y desaparece; así ningún intento se desperdicia, y si se vuelve a sostener, la cola retrocede y el rulito sigue creciendo. Cada rulito nace con otra forma. En el teléfono, si el dedo se corre un poco mientras sostiene, no se suelta: la piña no deja que el teléfono lo tome por un scroll (`touch-action: none`). Esa secuencia (nacer como punto, estirarse, hacer el lazo y la cola que alcanza a la cabeza) está tomada de la animación de referencia "Breathe" de Algo Particular, y se dibuja en código (ver `Rulito.vue`).
**Las raíces se quedan.** Esa secuencia (primero raíces, después rulito) viene de la misma animación de referencia "Breathe". Al completarse, un pulso de luz recorre las raíces y cada hongo suelta sus esporas cuando le llega la luz (escalonadas por distancia). Las raíces no se van: quedan tenues y respirando mientras la persona sigue en la carta, y brillan más cada vez que completa (hasta tres veces). Como ya agarraron, la próxima vez el rulito nace enseguida.
**En Hogar, hacia adentro.** El hogar está adentro: el núcleo de la célula es *"la chispa Divina que habita en mí"*. Se sostiene el núcleo (dedo, clic o tecla) y el tiempo se detiene: la corona de hongos deja de girar, el agua se calma y los organelos se quedan quietos (*"detener el tiempo"*). La larva vuelve nadando a casa y se acurruca contra el núcleo (*"viajar dentro para regresar"*). Desde el pie de cada hongo crece una raíz de luz que cruza el agua hasta el núcleo; llegan de a una, sin orden (unos 3,6 segundos para todas). Cuando una raíz llega, una gota de luz sube por ella hasta su hongo, el sombrero se enciende con la luz cálida de la chispa y suena una nota que sube por el acorde de la carta; el núcleo se va encendiendo con ellos. Mientras tanto, el rulito nace sobre la cabeza de la larva (cuando las raíces van por un cuarto) y se completa cuando se enciende el último hongo: el nombre de la carta se ilumina, suena `rulito`, la chispa suelta chispas y una onda de luz sale del núcleo por todas las raíces; cada hongo suelta sus esporas cuando le llega. Si se suelta, el tiempo vuelve a correr de a poco: la corona gira, la larva se va nadando y la cola del rulito alcanza a la cabeza. Las raíces se quedan, tenues, y los hongos encendidos guardan un brillo que crece cada vez que se completa (hasta tres veces); la próxima vez el rulito nace enseguida. Antes del primer toque, la chispa respira apenas, para que se note que está ahí. Código: `SceneHogar.vue`, `useCellRoots.js` (las raíces) y `calm` y `home` en `useCellWater.js`.
**Podría seguir:** que las raíces se recuerden entre visitas (hoy se pierden al salir de la carta), o que al completar se ilumine también la afirmación de la carta.
**Variantes posibles:** sostener dos puntos a la vez, o quedarse quieto sin mover el dedo (más exigente); una semilla (Sid) que crece mientras se sostiene.
**Cartas:** Paciencia (hecha), Hogar (hecha), Compromiso, Confianza, Fe, Addhitthana.

### 2. Fluir (Samas, demonio: culpa): implementado en Khanti
**Dinámica:** acompañar la corriente sin apurarla. Algo corre solo por un camino; la persona no lo crea ni lo empuja: lo acompaña.
**Por qué así:** las cuatro cartas de Fluir tienen algo que corre solo (el río de Aceptación, la savia que sube por la palmera de Transformación, las chispas del fuego de Celebración, el rosa por los tubos de Khanti). Seguir algo que se mueve a otro ritmo no lo usa ningún otro verbo (Ver también arrastra, pero de un punto quieto a otro). Y el demonio de Samas es la culpa: exigirse, querer controlar.
**El motor, común a las cartas del verbo:** una ruta, un ritmo propio y paradas en el camino.
- *Su ritmo no es parejo.* Se demora, casi se para y sigue (dos ondas lentas: de un tercio de su paso al paso entero).
- *Acompañar.* Con el dedo sobre su cabeza (el mouse cerca, o Enter mantenido sobre ella), la corriente se ensancha, brilla, va a su paso y suena en el acorde de la carta (`flow`: una nota redonda que se desliza a su lugar, más aguda cuando va más rápido).
- *No se puede apurar.* Sola, o con el dedo adelantado, no va más rápido: se afina y avanza muy despacio (un quinto). Nada se pierde: nunca retrocede.
- *Las paradas* son nudos que hay que soltar para que pase; al final, el rulito.
Cómo lo vestiría cada carta: Aceptación, una luz que baja por el río entre los dos seres hasta las piedras apiladas; Transformación, la savia que sube del pozo por la palmera hasta la semilla, que se abre; Celebración, una chispa del fuego que pasa por cada uno de los de alrededor y la llama crece.
**Cómo funciona hoy en Khanti:**
- *Todo empieza quieto.* El rosa de la red y de los frascos está estancado: más pálido, casi sin la luz del agua. Los nueve frascos están tapados, con su criatura adentro.
- *La corriente.* Nace en el signo central y recorre un único camino por los tubos que pasa por los nueve frascos (fuego, zorrito, agua, zorro, helecho, medusa, larva, meditador, hongos; `khantiFlow.json`, trazado del dibujo). Es rosa vivo, con luces que corren por ella más rápido que su cabeza.
- *Los corchos son nudos.* La corriente llega a un frasco tapado y espera; el corcho llama suavemente. Al destaparlo, el rosa viejo se evapora (baja el nivel, sube el vapor, la criatura se va con él) y los tubos de alrededor se vacían un tramo. Cuando el frasco quedó vacío, la corriente entra y lo llena de rosa vivo: queda **vacío de dibujo, lleno de rosa**. Un frasco destapado antes de que llegue la corriente la espera vacío, y ella pasa sin detenerse. Lo viejo se suelta para que entre lo nuevo: es la parte de soltar dentro de Fluir.
- *El final.* Con los nueve llenos de corriente, todo el rosa de la red se aviva, nace el rulito sobre el signo central, se ilumina el nombre y suena `rulito`. Después la corriente se apaga, los corchos vuelven, las criaturas vuelven y todo queda quieto otra vez, para jugarlo de nuevo.
- El hilo lavanda sigue, pero es decoración: ya no responde al dedo. El signo central solo destella (ya no rellena todo).
**Dónde se tocó:** `SceneKhanti.vue` (`stepFlow()`, `drawFlow()`, `along()`, `uncork()`, `stepFlasks()`, `finish()`, `stepWin()`, `headHit`), `khantiFlow.json` (la ruta: x, y y medio ancho del tubo cada 8 px del cuadrado de 2160, y dónde entra y sale de cada frasco), `flow` en `synth.js`.
**Por probar en un teléfono:** el paso (`PACE`, hoy unos 50 s acompañándola de punta a punta con los frascos) y cuán pálido se ve el rosa quieto (`STILL`).
**Cartas:** Khanti (hecha), Celebración, Transformación, Aceptación (su ilustración es un río entre dos seres iguales bajo cielos distintos, y su texto pide no luchar contra lo que no se controla).

### 3. Encender (Kätus, demonio: vergüenza): implementado en Evolución Espiritual
**Dinámica:** frotar y lanzar. Primero se enciende el fuego con esfuerzo (frotar, como con dos palitos) y después se lo lanza con dirección (una honda): lo que toca se enciende.
**Por qué así:** se probaron dos ideas antes. Tocar los bulbos en cualquier orden era el mismo gesto que Dana (un toque a cada uno). Mantener apretado para cargar y soltar se parecía demasiado a Arraigar (Paciencia) y a retener el aire en Vipassana. Frotar y tirar de una honda no los usa ningún otro verbo. Y la carta lo pide de adentro hacia afuera: *"una alma iluminada es capaz de transformar cada atmósfera que habita, siendo faro para otros"*. El demonio de Kätus es la vergüenza, esconder la propia luz; Sid está acurrucado y es él el que se enciende y sale disparado.
**El motor, común a las cartas del verbo:** frotar una fuente hasta que prende, apuntar, lanzarla, y lo que toca se enciende y queda encendido; hay que encender todo. Sirve para las otras tres:
- Desafío: el fuego que rebota por las paredes del laberinto hasta la luz del centro (la que mejor calza con los rebotes).
- Coraje: Kätus en el borde del acantilado frota para juntar coraje y se lanza hacia la luna.
- Viriya: frotar es la diligencia ("sin prisa pero sin pausa"); el lanzamiento enciende las flores del camino.
Las tres son hoy ilustraciones planas: cada una necesitaría su escena.
**Cómo funciona hoy en Evolución Espiritual:**
- *Al principio todo está apagado.* Los ocho bulbos, los cuatro hongos y sus bolitas azules están grises y sin brillo.
- *Frotar.* Se frota con el dedo dentro de la célula, de un lado a otro: saltan chispas donde pasa el dedo, Sid se va calentando (brilla y le suben brasas) y suena una nota más del acorde de la carta con cada sexto del calor (`kindle`). Si se deja de frotar, se enfría despacio. Con unos 11 radios de la célula frotados, prende: un estallido de chispas (`ignite` y `star`). Dentro de la célula el dedo no mueve la página (`touch-action: none`): antes el teléfono tomaba el frotar o el tirón por un scroll y los cortaba; para bajar a la lectura se arrastra desde la corona o desde abajo.
- *Apuntar y lanzar.* Con Sid encendido, se apoya el dedo y se tira hacia atrás, como una honda: una banda de puntos va de Sid al dedo y otra línea de puntos muestra hacia dónde va a salir; Sid se corre un poco con el tirón. Al soltar sale disparado en llamas (`ignite`, más fuerte cuanto más se tiró), dejando una estela de brasas. Un tirón muy corto no lanza nada.
- *Rebotar y encender.* Mientras vuela pasa por delante de los orgánulos y solo rebota en la membrana. Cada golpe en la membrana enciende hasta dos bulbos u hongos todavía apagados de ese lado (a menos de unos 29°): toman su color, una luz detrás, sus puntos y sus bolitas azules (`link`). Después de tres golpes, o si se frena, su fuego se apaga con un poco de humo y hay que volver a frotar. Lo encendido queda encendido.
- *El faro.* Con los doce encendidos, la corona entera brilla hacia afuera y Sid se estira un poco: deja de esconderse. Suena `resolve`: Si7 se resuelve en Mi mayor, la nota de Kätus (ver `musica.md`). Después nace el rulito dorado sobre la cabeza de Sid, se ilumina el nombre de la carta y suena `rulito`. Al rato el rulito se va, todo vuelve a apagarse despacio y se puede volver a jugar. Hito: `crown_lit` (con `times`).
- *Sid nunca cruza la membrana.* El agua lo mantiene a 0,075 del cuadro de la pared (su dibujo es más alto que el círculo con el que choca con los orgánulos), y a 0,14 mientras tiene el rulito sobre la cabeza.
- *Pista, sin palabras.* Si pasan 7 s sin tocar nada, saltan unas chispas de Sid.
- *Teclado.* Enter frota (cada vez lo calienta un quinto) y, encendido, lo lanza hacia lo apagado más cercano.
- *Tocar un bulbo o un hongo* hace lo de siempre: echa chispas.
- *Movimiento reducido.* La escena queda estática y todavía no se puede jugar (como Pañña, Vipassana y Dana).
**Dónde se tocó:** `SceneEvolucion.vue` (`press()`, `move()`, `letGo()`, `ignite()`, `launch()`, `hitWall()`, `catchFire()`, `crown()`, `aimGroup`, `play_()`), `kindle`, `ignite` y `resolve` en `synth.js`, `wall` y `ghost` en `useCellWater.js` y `fade()` en `useStardust.js`.
**Cartas:** Evolución Espiritual (hecha), Viriya, Coraje, Desafío.

### 4. Dar y recibir (Vulpes, demonio: pena): implementado en Dana
**Dinámica:** compartir la luz. Dar sin pensar y sin esperar nada a cambio, y descubrir que dar no vacía: lo dado vuelve multiplicado, sin pedirlo.
**Por qué así:** la primera prueba (lanzar la llamita al otro y que la devuelva, tres idas y vueltas) era un intercambio, un ping-pong: te doy y me devolvés. Las cuatro cartas del verbo dicen otra cosa: Dana *"soy feliz al dar sin esperar nada a cambio"* y *"bendiciones que vuelven a ti multiplicadas"*, Metta *"no podemos dar lo que no tenemos ni recibir lo que no damos"*, Gratitud *"al dar las gracias tu Espíritu se ilumina"*. Se descartaron también la honda (el mismo intercambio) y Tonglen (recibir la pena del otro acariciándolo): no sirve para las otras cartas y acariciar es consolar, no dar.
**El motor, común a las cartas del verbo:** hay una fuente de luz y quienes pueden recibirla. El gesto es **un toque**, rápido, como da un chico (no es arrastrar, que es Ver, ni sostener, que es Arraigar). Cada toque hace saltar una chispa de la fuente a ese otro y lo enciende; **la fuente no se achica, crece**. No hay orden. Cuando todos tienen su luz, todos devuelven una a la vez hacia la fuente, sin que se la pidan, y nace el rulito. Cada carta solo dice quién es la fuente y quiénes reciben:
- Dana: la llamita del de la derecha; el amigo, las piedritas con ojos y los hongos de la isla.
- Metta: el ser blanco sobre el huevo (*"comenzando por vos mismo"*: el primer toque sería a él); los seis que lo rodean, el zorro y el gatito.
- Gratitud: Sid sentado en la isla; el sol, la casa, la luz de la palmera, el bote, las nubes (agradecerle a cada cosa).
**Cómo funciona hoy en Dana:** los dos Particulares son dos capas aparte (`public/assets/dana/left.webp` y `right.webp`, cortadas del dibujo de la página Colaborar) y están más separados que en el dibujo. El de la derecha, el que brilla y tiene la mano extendida, tiene la llamita, que no se mueve de su mano.
- *Dar.* Se toca a alguien de la isla (`GIFTS`: el amigo, tres grupos de piedritas con ojos, el hongo grande y el hongo chico con su piedrita): sale una chispa de la llama, vuela en arco dejando chispas y suena la nota del que da subiendo (`give`). Al llegar, ese otro se enciende (el amigo con un aura de puntos rosados alrededor de su contorno, `danaAura.json`; los demás con una nube de brasas suaves) y suena la nota del que da y después la del que recibe (`link`); cada uno tiene su nota en el acorde de la carta. La llama crece un poco con cada luz que da, y el aura del que da también: sobre la que está dibujada, un aura de puntos a lo largo de su contorno (`danaGiverAura.json`) que al principio casi no se ve, brilla y se abre más con cada luz, y del todo cuando vuelven. Tocar a uno que ya tiene su luz solo lo hace brillar (`tap`).
- *Vuelve multiplicado.* Con todos encendidos, todos mandan una luz de vuelta a la llama a la vez (`converge`); la llama se agranda, nace un rulito sobre cada cabeza (en el crema del rulito que estaba dibujado; el de la derecha un instante después), se ilumina el nombre de la carta y suena `rulito`. Después los rulitos se van, las luces se apagan despacio (el amigo se queda con un poco de su brillo) y la llama vuelve a su tamaño: se puede jugar de nuevo. Hito: `light_shared` (con `times`).
- *Pista, sin palabras.* Si pasa un rato sin tocar nada, uno de los que todavía no tienen luz titila y la llama responde.
- *Teclado.* Cada uno es un botón: Enter le da su luz. Enter en la llama la hace saltar.
- *Movimiento reducido.* La escena queda estática y todavía no se puede jugar (como Vipassana y Pañña): los toques hacen saltar la llama, como antes.
- *Lo que se da se ve sobre el dibujo.* Las partículas de dar (el brillo de las piedritas y los hongos, las luces que vuelan y las chispas) se dibujan delante de las ilustraciones, no detrás: la luz llega y se ve encima de quien la recibe. El aura del amigo, en cambio, queda detrás de él, como la que está dibujada alrededor del de la derecha.
- *La isla es más grande que en el dibujo.* Siempre 1,22 veces, crecida desde la línea donde están parados los amigos: la escena queda más llena, las piedritas y los hongos son más grandes y más fáciles de tocar, y los amigos quedan del mismo tamaño y sobre el pasto. En un teléfono parado llena el ancho y se cortan apenas sus puntas.
**Cómo se ve:** al lado de Vipassana y Pañña, Dana se veía plana (un teal liso, estrellas en un solo plano, la isla quieta). Ahora el cielo es de noche y tiene profundidad: se oscurece hacia arriba y abajo llega al color de la carta, que es el de la lectura. Las estrellas están en tres planos que se separan con el puntero: lejanas, tenues y casi quietas; las de la carta; y unas pocas grandes y desenfocadas cerca del ojo; las de la carta son sobre todo amarillas y rojas. En un rincón gira despacio una pequeña galaxia espiral (un núcleo cálido, dos brazos y un disco tenue, lo de adentro más rápido que lo de afuera) y de vez en cuando cruza una estrella fugaz, sin sonido. (Se probaron una banda de polvo coral y amarillo, como una nebulosa, y dos islitas desenfocadas atrás, y se sacaron: no convencieron.) La isla está viva: del musgo y de las puntas del cristal caen gotas de agua y de luz, el cristal destella y unas luciérnagas dan vueltas alrededor, algunas detrás de los amigos y otras delante. Todo son partículas, ningún dibujo nuevo.
**Dónde se tocó:** `SceneDana.vue`, dibujada en WebGL con el escenario común (`useLayerStage.js`, como Paciencia; ver `docs/escenas.md`) (`GIFTS`, `give()`, `receive()`, `giveBack()`, `balance()`; `ISLAND` y `onIsland()` para la isla grande; `drops`, `glints`, `fireflies`, `giverAura`, `galaxy`, `shooting` y los grupos del cielo), `give` en `synth.js`. El rulito que estaba dibujado sobre el de la derecha se sacó de su capa: ahora es el premio.
**Cartas:** Dana (hecha), Metta, Gratitud.

### 5. Resonar (Aura, demonio: mentiras): implementado en Sincronicidad
**Dinámica:** escuchar primero y responder en sintonía. Ritmo, eco, secuencia. Tiene dos formas, según lo que pida cada carta:
- **A tiempo** (responder *cuándo*): la escena lleva un pulso y la persona toca cada cosa cuando el pulso llega a ella. Para las cartas que hablan de armonía, de ritmo y de estar en el momento justo: Sincronicidad (hecha), Armonía ("variedad y proporción de sonidos y pausas") y Sila ("en resonancia con la voz de tu sabiduría interior").
- **Eco** (responder *qué*): la escena canta una frase corta con notas del acorde de la carta y la persona la repite tocando (como el Simón dice); si no coincide, la escena la vuelve a cantar, más lenta. Para las cartas que piden escuchar primero: Comunicación ("el primer paso es escucharte"), Honestidad ("escucha tu verdad acallando voces") y Sacca. Todavía es idea: estas tres son ilustración plana y el eco se arma cuando tengan escena.
- **Composición libre** (Creatividad, hecha): no hay respuesta correcta. La corona es una caja de música: cada toque agrega (o saca) una nota y lo compuesto queda sonando en vuelta. Ver más abajo.

Las dos formas son a validar con Belén.

**Cómo funciona hoy en Sincronicidad (a tiempo):** las cuatro burbujas (el huevito, la larva, el encuentro y la pareja abrazada) se iluminan en orden con un pulso fijo, una cada 1,3 s; en el quinto tiempo salen chispas del fuego y el sexto es un silencio (`BEAT`, `PERIOD`). Cada burbuja brilla más justo en su tiempo y en ese instante echa chispas.
- *Tocar a tiempo.* Un toque a menos de 0,28 s del tiempo de una burbuja (`IN_TIME`) la hace resonar: suena su nota del acorde de la carta (del huevito a la pareja suben Sol, Si, Re y el Sol de arriba; `resonate`), echa más chispas y queda encendida, con un halo detrás que respira con el pulso.
- *Fuera de tiempo.* Suena apagado (`miss`) y salen unas pocas chispas. No se pierde nada de lo encendido. Esa burbuja espera a su próximo brillo: tocarla una y otra vez no sirve para atraparla, hay que escuchar el pulso (`missed`).
- *Escuchar.* Mientras alguien juega (hasta dos vueltas después del último toque), el brillo suena muy suave en cada burbuja (`pulse`), así el pulso se oye además de verse. Antes del primer toque la escena está en silencio, como siempre.
- *Las cuatro.* Con las cuatro encendidas el fuego crece, salen chispas y suenan las notas del acorde subiendo (`converge`). De la burbuja de la pareja abrazada (la más grande) sale el rulito dorado, se ilumina el nombre de la carta y suena `rulito`. Al rato las burbujas se apagan, la cola del rulito alcanza a su cabeza y se puede volver a jugar. Hito: `in_time` (con `times`). Si se tiene ritmo, sale en la primera vuelta; si no, en dos o tres.
Con movimiento reducido la escena queda estática y no se puede jugar (como Pañña). Con teclado sí: Enter o espacio sobre una burbuja es un toque.
**Dónde se tocó:** `SceneSincronicidad.vue` (`touch()`, `synchronised()`, `STEPS`, `offBeat()`; `L.halos` y `L.rulito`), `pulse`, `resonate` y `miss` en `synth.js`.
**Cómo funciona hoy en Creatividad (composición libre, caja de música):** la corona de corales y algas es una caja de música y arriba de todo, sobre la corona, hay un peine (una luz suave que no gira).
- *Componer.* Tocar un coral o un alga lo enciende (brilla, con una luz detrás) y suena su nota del acorde de la carta, Do7, como la lengüeta de una caja de música (`tine`): cuanto más arriba cuelga el coral en el dibujo, más aguda; las algas son los graves. Tocar uno encendido lo apaga. No hay notas equivocadas.
- *Que vuelva.* Con algo encendido la corona gira más rápido (una vuelta cada 12 s) y cada pieza encendida vuelve a sonar cuando pasa por el peine, con chispas: el lugar de cada pieza en la corona es su tiempo en la melodía. La medusa (Aura) sube a escuchar bajo el peine y late con cada nota.
- *La melodía.* Con siete piezas encendidas la melodía está completa: suenan las notas del acorde subiendo (`converge`) y nace el rulito dorado sobre la medusa, se ilumina el nombre y suena `rulito`. La caja toca una vuelta más, algo más rápido, y en la siguiente cada pieza se apaga después de sonar por última vez; la corona vuelve a girar despacio y se puede componer otra. Hito: `tune_composed` (con `times`). Una melodía a medias que se deja sola tres vueltas se apaga igual.
Con movimiento reducido la escena queda estática y no se juega (como Sincronicidad). Con teclado, Enter o espacio sobre un coral o un alga lo enciende o lo apaga.
**Dónde se tocó:** `SceneCreatividad.vue` (`compose()`, `complete()`, `sound()`, `music()`, `COMB`, `TUNE`; `L.lights`, `L.comb`, `L.listen` y `L.rulito`), `tine` en `synth.js`.

**Cartas:** Sincronicidad (hecha), Armonía, Sila (a tiempo); Comunicación, Honestidad, Sacca (eco); Creatividad (hecha, composición libre).

### 6. Ver (Huit, demonio: ilusión): implementado en Pañña
**Dinámica:** descubrir lo oculto, unir puntos, reconocer un patrón.
**Cómo funciona hoy en Pañña:** las nueve luces de la escena (el sol, el tercer ojo de Sid, el hongo rosado grande del medio, las cuatro luciérnagas y los dos hongos azules) se unen arrastrando de una a otra, y hay una **figura** que ver.
- *Nada viene unido.* La escena arranca limpia, sin la espiral del sol a la frente.
- *Unir.* Se apoya el dedo en una luz y se arrastra: un hilo sigue al dedo y, al llegar cerca de otra luz, se engancha a ella. Al soltar, el hilo queda tendido y fluye de la primera luz a la segunda; suena una nota de cada luz en el acorde de la carta (`link`: el sol arriba, los hongos de abajo en lo más grave). No se falla: soltar en el aire deshace el hilo que se estaba tendiendo, y volver a unir dos luces que ya estaban unidas deshace ese hilo: se recoge hacia la luz de la que salió (para corregir sin tener que esperar a que se juzgue la figura). Un toque corto, sin arrastrar, hace lo de siempre: las luciérnagas y los hongos echan chispas, tocar el sol hace que todo responda y tocar el ojo despierta a Sid.
- *Cómo es un hilo.* Una doble hélice de puntos que nace como un punto en la luz de la que sale, se ensancha y se cierra en otro punto en la que alcanza (`helix()`), con un resplandor suave por debajo (`glow`). Sus puntos toman los colores de las dos luces que une: oro del sol y las luciérnagas, celeste del ojo y los hongos azules, rosa de los hongos de abajo.
- *La figura.* Cada intento sortea una de cuatro figuras (`FIGURES`), que la persona no sabe cuál es: la **cruz** (el ojo unido al sol, a los hongos de abajo y a los dos azules: 4 hilos), el **diamante** (sol, hongo azul, hongos de abajo, hongo azul: 4 hilos), el **hexágono** (sol, luciérnagas y hongos de abajo en ronda: 6 hilos) y los **dos triángulos entrelazados** (sol con las dos luciérnagas de abajo, y hongos de abajo con las dos de arriba: 6 hilos), el símbolo de las dos corrientes. No todas las luces están en todas las figuras: las demás son señuelos. Una misma figura se queda hasta que se ve, y entonces sale otra.
- *Las pistas, sin palabras.* Los hilos que son de la figura quedan firmes y brillantes, y suenan fuerte; los que no, tenues y suaves. Y si pasan unos 9 s sin tocar nada, la figura se dibuja sola, tenue, hilo por hilo, y se va (`ghost`): ver es notar lo que estaba ahí. Se repite cada 13 s si se sigue sin tocar.
- *La red crece.* Las luces unidas quedan encendidas, y el aura de Sid se ensancha hasta un 14% (`grow()` de `useStardust.js`) y él brilla más a medida que se completan hilos de la figura.
- *Se juzga al último hilo.* Cuando los hilos son tantos como los de la figura se mira: si son esos, el patrón se ve; si no, los hilos se apagan solos con una caída suave de notas (`unravel`) y se empieza de nuevo con la misma figura. Hitos: `pattern_reset` (con `figure`) y `pattern_seen` (con `figure` y `times`).
- *El patrón.* Los hilos llevan su luz al tercer ojo (cada uno fluye rápido de su extremo más lejano al más cercano al ojo; las luces responden con chispas y las notas del acorde suben como un arpa, `converge`). A los 1,7 s el ojo se abre: un destello, un anillo de chispas y un cuenco grave (`open`). Entonces el rulito dorado se dibuja sobre la cabeza de Sid (`Rulito.vue`), el nombre de la carta se ilumina y suena el acorde en la octava siguiente (`rulito`). Después el rulito se va a medida que su cola alcanza a su cabeza, los hilos se apagan con él y sale otra figura.
- *Teclado.* Enter en una luz la elige y Enter en otra las une; Enter otra vez en la misma la suelta.
- *Movimiento reducido.* La escena queda estática y todavía no se puede jugar (como Vipassana): los toques siguen haciendo lo de siempre.
**Dónde se tocó:** `ScenePanna.vue` (todos los hilos son un solo grupo de partículas, `helix()`; `LIGHTS`, `join()`, `seen()`). No cubre ni agrega ningún dibujo: son solo partículas.
**Variante posible:** despejar una niebla de partículas para revelar las luces (cubriría el arte de Pañña; encajaría mejor en Honestidad, que tiene burbujas) o primero descubrir y después unir.
**Cartas:** Pañña (hecha), Belleza, Esperanza. Esperanza es la que mejor toma el motor de Pañña: su texto habla de *"hilos invisibles de luz"* y su ilustración es un cielo lleno de estrellas (unirlas en una constelación). Belleza (*"poder ver lo bello"*) no tiene luces dibujadas: necesita otro gesto, como descubrir lo bello escondido en el bosque.

### 7. Soltar (Sid, demonio: apego): implementado en Vipassana
**Dinámica:** dejar ir. Que las cosas se vayan sin agarrarlas, y que vuelvan.
**Cómo funciona hoy en Vipassana:** tiene un objetivo, soltar todo lo que hay en la escena. Cada célula es algo a lo que se aferra (hay 21; 15 en equipos de poca potencia).
- *Soltar una célula.* Tocarla la suelta: explota en puntos y queda así (`release`). Es el gesto principal y no hay nada que perder ni tiempo límite.
- *La pista, sin palabras.* La espiral de puntos de Sid es el contador: se acorta con cada célula que se suelta. Si pasa un rato sin tocar nada (poco al empezar), una de las células que quedan se ilumina de a ratos: esa es la que hay que soltar.
- *Respirar (tocar el agua).* Una onda recorre el agua desde el dedo y empuja las células (más fuerte cuanto más se mantiene apretado). Al llegar a Sid él inhala y todo se acerca; al exhalar su espiral se enciende. Es el ritmo de la escena y no hace falta para ganar. Suenan `ripple` y `breath`.
- *Retener el aire y exhalar.* Retener es aferrarse (el demonio del séptimo chakra es el apego). Mantener apretado a Sid: su espiral se acorta hasta ser un punto en el tercer ojo (3,2 s), el campo se cierra sobre él y atrapa, una tras otra, las células más cercanas, un tercio del total (7 de 21). Un rato más y esas células y la materia orbitan a su alrededor como electrones, en seis órbitas que forman un mandala; Sid sube al centro. Suena `inhale`. Al soltarlo exhala (`exhale`): la espiral vuelve a salir brillante, sale una onda grande desde Sid (`ripple`) y suelta de golpe todas las células que había atrapado, a medida que la onda llega a cada una. Con tres respiraciones alcanza para soltar todas, pero también se puede tocar de a una.
- *Easter egg: la respiración power.* Si se retiene mucho más de lo necesario (unos 4 s con el mandala completo, `POWER_AT`), se suman a las órbitas todas las células que quedan; suena una estrella y Sid brilla. Al soltar, la onda es más fuerte y rápida y se rompen todas juntas. No se avisa al jugador: es un premio por encontrarlo (hito `power_breath`). El camino normal sigue siendo tres respiraciones.
- *Cuando no queda nada que agarrar.* La espiral de puntos se va y solo queda la animación del rulito sobre la cabeza de Sid, chico y separado de ella, en el rosa de la espiral. Se ilumina el nombre de la carta y suena el acorde en la octava siguiente (`rulito`). Después todo lo que se soltó vuelve (`bloom`) a medida que la cola del rulito alcanza a su cabeza, hasta que se va, y la espiral vuelve. Se puede volver a jugar. Hito de analítica: `all_released`.
Dónde está Sid se decide con una máscara precalculada (`characterMask.js`, hecha con `scripts/make-character-mask.mjs`), no leyendo píxeles de un canvas en ejecución, que Safari de escritorio puede devolver vacío.
La escena sigue estática con movimiento reducido, así que todavía no se puede jugar así, y tampoco con teclado.
**Cartas:** Nekkhamma, Upekkha, Ciclos, Perdón, Vipassana (hecha).

### Sin verbo todavía: el silencio (carta 10)
No hay nada que leer ni decir; la invitación es sentir el corazón. Su verbo va entre Fa (Dar y recibir), Sol (Resonar) o La (Ver), por decidir. Si tiene un juego, sería no jugar: la escena responde solo si se deja de tocar.

## Piezas de código que ya sirven
- `src/components/Rulito.vue`: el rulito dibujado en código sobre un canvas 2D, como una línea que viaja (punto, línea, lazo, y luego la cola alcanza a la cabeza). `frame({ head, tail, flare, t })` lo dibuja y `reshape()` le da una forma nueva. Es el premio común a todos los verbos.
- `useSparks.js` y `useStardust.js`: chispas y partículas. `useSpores.js`: esporas en Paciencia (`swell` las multiplica, en oleada desde un punto). `useRoots.js`: la red de raíces luminosas bajo el campo de hongos (crece, se queda, y la recorre un pulso).
- `useCellWater.js`: el agua de las células, con un nadador que choca con las cosas.
- `useParallax.js`: el reloj de cada escena (`t`, `ramp`) y las entradas por capas.
- `useSound.js` y `cardChords.js`: el sonido en el acorde de la carta.

## Cómo sumar un verbo a una escena
1. Elegir el gesto del verbo y su "carga" (0 a 1) en el bucle de la escena.
2. Que la carga mueva lo visible: la piña, el resplandor, el rulito.
3. Al llegar a 1: un solo momento de cierre (rulito completo, chispas, `rulito`: el acorde en la octava siguiente).
4. Que se pueda repetir, que no se pierda nada y que funcione con teclado.
5. Probarlo en un teléfono real: lo que un navegador de escritorio no muestra (GPU, dedo, interruptor de silencio) solo se ve ahí.
