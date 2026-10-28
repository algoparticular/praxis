# Cartas

Cuarta pestaña de "Anima por dentro": lo que tenemos hoy de cada una de las 33 cartas, junto. El texto de cada carta (descripción, afirmación e invitación, en español e inglés), sus colores y su ilustración viven en `src/data/cards.json`, que es la fuente de verdad (cómo editarla: `editar-cartas.md`). Acá está el resto: su verbo, su acorde y qué hace en la app.

## Dónde está cada cosa de una carta

| Qué | Dónde |
|---|---|
| Textos, colores, ilustración, categoría | `src/data/cards.json` |
| Verbo | campo `verb` de `cards.json` y lista en `src/data/verbs.js`; por qué ese verbo y cómo se juega: `verbos-y-dinamicas.md` |
| Acorde | `src/data/cardChords.js`; por qué ese acorde: `musica.md` |
| Escena | `src/data/cardScenes.js` y `src/components/scenes/` |
| Ilustración y miniatura | `public/cards/N.webp` y `public/cards/thumb/N.webp` |

---

## Las 33 de un vistazo

| # | Carta | Categoría | Verbo | Acorde | En la app |
|---|---|---|---|---|---|
| 0 | Nekkhamma | Paramis | Soltar | Si menor | Ilustración plana |
| 1 | Sila | Paramis | Resonar | Sol7 | Ilustración plana |
| 2 | Dana | Paramis | Dar y recibir | Si mayor | Escena propia (Dana), sin juego todavía |
| 3 | Pañña | Paramis | Ver | Lam7 | Escena propia (Pañña), verbo jugable |
| 4 | Viriya | Paramis | Encender | Mi mayor | Ilustración plana |
| 5 | Khanti | Paramis | Fluir | Remaj7 | Escena propia (Kshanti), sin juego todavía |
| 6 | Sacca | Paramis | Resonar | Sol7 | Ilustración plana |
| 7 | Addhitthana | Paramis | Arraigar | Mi mayor | Ilustración plana |
| 8 | Metta | Paramis | Dar y recibir | Famaj7 | Ilustración plana |
| 9 | Upekkha | Paramis | Soltar | Mi menor | Ilustración plana |
| 10 | " ... " | Special | por decidir | Sol mayor | Ilustración plana |
| 11 | Aceptación | Regular | Dar y recibir | Si menor | Ilustración plana |
| 12 | Armonía | Regular | Resonar | Domaj7 | Ilustración plana |
| 13 | Belleza | Regular | Fluir | Sol mayor | Ilustración plana |
| 14 | Celebración | Regular | Fluir | Mimaj7 | Ilustración plana |
| 15 | Ciclos | Regular | Ver | Fa7 | Ilustración plana |
| 16 | Compromiso | Regular | Arraigar | La mayor | Ilustración plana |
| 17 | Comunicación | Regular | Resonar | Sol menor | Ilustración plana |
| 18 | Confianza | Regular | Arraigar | La menor | Ilustración plana |
| 19 | Coraje | Regular | Encender | Mi7 | Ilustración plana |
| 20 | Creatividad | Regular | Resonar | Do7 | Escena propia (Creatividad), sin juego todavía |
| 21 | Desafío | Regular | Encender | Re7 | Ilustración plana |
| 22 | Evolución Espiritual | Regular | Encender | Si7 | Escena propia (Evolución), sin juego todavía |
| 23 | Fe | Regular | Arraigar | Si mayor | Ilustración plana |
| 24 | Gratitud | Regular | Dar y recibir | Solmaj7 | Ilustración plana |
| 25 | Hogar | Regular | Arraigar | Do mayor | Escena propia (Hogar), sin juego todavía |
| 26 | Honestidad | Regular | Resonar | Solm7 | Ilustración plana |
| 27 | Paciencia | Regular | Arraigar | Re mayor | Escena propia (Paciencia), verbo jugable |
| 28 | Perdón | Regular | Soltar | Fa menor | Ilustración plana |
| 29 | Sincronicidad | Regular | Ver | Re mayor | Escena propia (Sincronicidad), sin juego todavía |
| 30 | Esperanza | Regular | Fluir | Sim7 | Ilustración plana |
| 31 | Vipassana | Special | Soltar | Simaj7 | Escena propia (Vipassana), verbo jugable |
| 32 | Transformación | Regular | Fluir | Rem7 | Ilustración plana |

Esta tabla sale de `cards.json` (nombre, categoría, verbo), de `src/data/cardChords.js` (acorde) y de `src/data/cardScenes.js` (escena). Si cambia alguno de los tres, hay que actualizarla. Qué hace cada escena al tocarla: `registro-cartas-vivas.md`.

## Reparto de los verbos entre las 33
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
