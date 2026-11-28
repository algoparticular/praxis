<script>
// Sid's head turned to us, with his eyes: who plays, in the words over the room (HideSeek.vue). From his traced silhouette
// (sid/sid.json, as the puppet's body in sid/rig.js, set straight about his middle), as a bust: his head alone is an
// egg, so it goes on past the pinch of his neck (y 311 in the drawing) to where his body starts to widen.
import sid from '../sid/sid.json';
import { FRONT_EYES, PIVOT } from '../sid/rig.js';

const S = sid.silhouette;
const NECK = 372;                                  // (where it is cut: the bottom closes round)
const rows = [];
for (let i = 0; S.top + i * S.step <= NECK; i++) rows.push({ y: S.top + i * S.step, w: (S.right[i] - S.left[i]) / 2 });
const ring = [{ x: PIVOT.x, y: S.crown[1] }];
for (const r of rows) ring.push({ x: PIVOT.x + r.w, y: r.y });
const last = rows[rows.length - 1];
ring.push({ x: PIVOT.x + last.w * 0.7, y: NECK + 12 }, { x: PIVOT.x - last.w * 0.7, y: NECK + 12 });
for (const r of [...rows].reverse()) ring.push({ x: PIVOT.x - r.w, y: r.y });
// a smooth closed curve through the middles of its segments, as his body's: no corners anywhere
const mid = (a, b) => [((a.x + b.x) / 2).toFixed(1), ((a.y + b.y) / 2).toFixed(1)];
let d = `M${mid(ring[ring.length - 1], ring[0]).join(' ')}`;
ring.forEach((p, i) => { d += `Q${p.x.toFixed(1)} ${p.y.toFixed(1)} ${mid(p, ring[(i + 1) % ring.length]).join(' ')}`; });
const PATH = d + 'Z';
const PAD = 16, W = Math.max(...rows.map((r) => r.w));
const BOX = `${(PIVOT.x - W - PAD).toFixed(0)} ${(S.crown[1] - PAD).toFixed(0)} ${(2 * (W + PAD)).toFixed(0)} ${(NECK + 12 + PAD - S.crown[1] + PAD).toFixed(0)}`;
const EYES = FRONT_EYES.map(([x, y]) => ({ x, y }));
</script>

<script setup>
defineProps({ ink: { type: String, default: '#102A34' }, white: { type: String, default: '#FBF4E4' } });
</script>

<template>
    <svg class="sid-head" :viewBox="BOX" aria-hidden="true">
        <path :d="PATH" :fill="white" :stroke="ink" stroke-width="22" stroke-linejoin="round" />
        <circle v-for="(e, i) in EYES" :key="i" :cx="e.x" :cy="e.y" r="13" :fill="ink" />
    </svg>
</template>

<style scoped>
.sid-head { display: inline-block; height: 1.6em; width: auto; vertical-align: middle; overflow: visible; }
</style>
