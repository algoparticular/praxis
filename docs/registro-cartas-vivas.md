# Registro de cartas vivas e interactivas

Estado a 2026-10-26. Verbos: ver `verbos-y-personajes.md` (ya guardados en `cards.json`). Fuente de verdad en el código: `src/data/cardScenes.js` (`sceneFor(id)`). Si una carta no está ahí, usa `SceneFlat` (ilustración plana que deriva lento). Cuando una carta pase a viva, se agrega una fila acá en el mismo PR.

**9 de 33 cartas vivas.** 24 siguen con `SceneFlat`.

| id | Carta | Tipo | Escena | Qué hace al tocarla | Sonido hoy | Música | Verbo |
|----|-------|------|--------|---------------------|------------|--------|---|
| 2 | Dana | Pāramī | `SceneDana` | La llamita salta y lanza chispas | `star` | pendiente | Dar y recibir |
| 3 | Pañña | Pāramī | `ScenePanna` | Se tocan luciérnagas, hongos azules, Sid y el sol (el sol hace que todo responda); espiral del sol a la frente de Sid | `star`, `tap` | pendiente | Ver |
| 5 | Khanti | Pāramī | `SceneKshanti` | Corchos que saltan y vacían su frasco (evaporan); pincelada lavanda que sigue el dedo; criaturas que destellan; el signo central rellena todo | `tap`, `star` | pendiente | Fluir |
| 20 | Creatividad | Regular | `SceneCreatividad` | Corales y algas que se aplastan y lanzan esporas; interior acuoso con orgánulos y una medusa (Aura) que pulsa y rebota | `tap` | pendiente | Resonar |
| 22 | Evolución Espiritual | Regular | `SceneEvolucion` | Ocho bulbos y cuatro hongos que se mecen; al tocarlos el brillo se enciende y salen chispas; ser enroscado que rebota | `star` (bulbo), `tap` (hongo) | pendiente | Encender |
| 25 | Hogar | Regular | `SceneHogar` | Hongos de la corona lanzan esporas; interior acuoso con orgánulos y una larva (un Sama) que camina y rebota | `tap` | pendiente | Arraigar |
| 27 | Paciencia | Regular | `ScenePaciencia` | Mantener apretada la piña (~2,6 s): brilla, y el rulito sobre el Sama del centro nace como punto, se estira y hace el lazo, y florece (con chispas y una oleada de esporas azules); al soltar, la cola lo alcanza hasta que desaparece. Cada rulito sale distinto | `star` | pendiente | Arraigar |
| 29 | Sincronicidad | Regular | `SceneSincronicidad` | Secuencia de cuatro burbujas que se iluminan en ciclo de 11 s; tocar una reinicia la secuencia desde ella | `tap` | pendiente | Ver |
| 31 | Vipassana | Especial | `SceneVipassana` | El personaje brilla y una onda recorre su espiral; las células se empujan y sueltan chispas de su color | `star`, `tap` | pendiente | Soltar |

Todas: parallax por puntero / giroscopio / scroll, entrada por capas, teclado (Enter / espacio) y `prefers-reduced-motion`.

## Pendientes transversales
- Probar escenas en un teléfono real (GPU, parpadeos); lo dice `CLAUDE.md` y el plan.
- Probar el sonido en un iPhone real (con y sin interruptor de silencio).
- Nombre inconsistente: `cards.json` dice "Khanti", el componente y `CLAUDE.md` dicen "Kshanti". Decidir uno.
