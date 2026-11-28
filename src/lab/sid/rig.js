// Sid's rig, shared by Sid's world (LabSid.vue) and the puppets of the house (puppet.js): his proportions and where his
// joints are on his drawing (in px of the source, 258 x 686, facing +x), the walk pose by pose, the springs, how his
// soft body bends, two-bone limbs, and his body drawn in code from his traced silhouette (sid.json). All of it pure:
// what he is doing (his state, his springs) belongs to whoever moves him.
import rig from './sid.json';

// --- The rig, in px of the source drawing (258 x 686): he faces +x (his eyes are on that side) ---
export const PIVOT = { x: 130, y: 518 };             // the middle of his bottom, where his hips are: the body bends about it
export const TALL = 512;                             // from his bottom to the top of his head
export const LEG = { thigh: 97, shin: 97, foot: 40, width: 16 };
export const ARM = { upper: 116, fore: 110, width: 13.5 };        // long, as in Upekkha (they reach his crossed legs)
export const STAND = 196;                            // his hips over the ground, standing: his legs all but straight
// In profile his hips are together in his middle (one leg behind the other), his arms come from the middle of him
// too, the near one hanging over his belly and the far one behind him (unseen until it swings out); turned to us, his
// hips, shoulders and hands are at each side of him (FRONT_ below). Which is near and which far is as when one really
// turns: facing us, to walk the way his face is (+u), he turns so that the side away from it comes to the front, so
// turned to us his near arm and leg are on the side away from the way he faces
export const HIP = { far: { u: 134, v: 516 }, near: { u: 126, v: 515 } };
export const FRONT_HIP = { far: { u: 157, v: 514 }, near: { u: 103, v: 516 } };
export const SHOULDER = { far: { u: 100, v: 334 }, near: { u: 110, v: 334 } };   // towards his back, by the hatching
export const REST_HAND = { far: { u: 94, v: 538 }, near: { u: 118, v: 538 } };   // (low: his arms hang loose, all but straight)
// (seen three quarters on, his hips, shoulders and hands are already well apart: they open out quickly as he turns
// from his profile, so his legs do not cross like scissors and his arms are not drawn over his belly)
export const spread = (front) => Math.sqrt(Math.max(0, front));
export const EYES = rig.eyes;
// Turned to us: his eyes in the middle of his face, a shoulder at each side of the pinch of his waist and his hands
// hanging at each side of his belly
export const FRONT_EYES = [[PIVOT.x - 17, 211, rig.eyes[0][2]], [PIVOT.x + 17, 211, rig.eyes[1][2]]];
export const FRONT_SHOULDER = { far: { u: PIVOT.x + 48, v: 322 }, near: { u: PIVOT.x - 48, v: 322 } };
export const FRONT_HAND = { far: { u: PIVOT.x + 132, v: 508 }, near: { u: PIVOT.x - 132, v: 508 } };   // a little away from his sides
export const mix = (a, b, t) => a + (b - a) * t;
// --- The walk, as The Animator's Survival Kit draws a walk: pose by pose, each leg on its own ---
// One leg through a whole cycle (two steps), in eight poses from its contact in front: [thigh, knee, foot], in degrees
// (thigh from straight down, + forward; knee bent, + the shin going back; foot from flat, + toes up). The other leg
// does the same half a cycle later. In between, the poses flow smoothly (a curve through them, frame by frame).
export const WALK = [
    [26, 3, 20],      // 1 contact, in front: straight, the heel down and the toes up
    [17, 20, 0],      // 2 down: the knee takes his weight, the foot flat
    [2, 7, 0],        // 3 passing: under him, all but straight
    [-14, 2, -3],     // 4 up: behind him, straight, pushing (the heel about to rise)
    [-23, 9, -30],    // 5 contact, behind: on its toes, the heel up
    [-15, 52, -55],   // 6 down: off the ground, the foot up behind him
    [11, 74, -40],    // 7 passing: the knee forward and up, the foot hanging under him
    [30, 26, 6],      // 8 up: reaching forward, the foot low, the toes coming up
];
export const DEG = Math.PI / 180;
// the pose of a leg at q (0..1 of its cycle), `k` of the way from standing to walking, a trot's poses wider (amp)
export function walkPose(q, k = 1, amp = 1) {
    const x = (((q % 1) + 1) % 1) * WALK.length, i = Math.floor(x), t = x - i, n = WALK.length;
    const P = [WALK[(i + n - 1) % n], WALK[i], WALK[(i + 1) % n], WALK[(i + 2) % n]];
    return [0, 1, 2].map((j) => {
        const [a, b, c, d] = P.map((pose) => pose[j]);
        const v = 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
        return v * k * (j === 1 ? 1 + (amp - 1) * 0.6 : amp);
    });
}
// A leg in that pose, from its hip: along the way he goes (a) and up (u), in px of his drawing: its knee, its ankle,
// its heel and the tip of its toes on the ground (the points it stands on), and its toes as they are drawn
export function legShape([thigh, knee, foot]) {
    const T = thigh * DEG, S = (thigh - knee) * DEG, F = foot * DEG;
    const kn = { a: LEG.thigh * Math.sin(T), u: -LEG.thigh * Math.cos(T) };
    const an = { a: kn.a + LEG.shin * Math.sin(S), u: kn.u - LEG.shin * Math.cos(S) };
    const reach = LEG.foot * Math.cos(F), rise = LEG.foot * Math.sin(F);
    return { knee: kn, ankle: an, heel: { a: an.a, u: an.u - 6 }, tip: { a: an.a + reach, u: an.u - 6 + rise }, toe: { a: an.a + reach, u: an.u - 2 + rise } };
}
// which of its points a leg stands on (the lower: the heel, or the toes once the heel is up) and how high its hip is
export const standsOn = (L) => (L.tip.u < L.heel.u - 0.3 ? 'tip' : 'heel');
export const lowest = (L) => Math.min(L.heel.u, L.tip.u);
// both legs at the phase p of the cycle (the far leg's contact in front at 0, the near one's at 0.5)
export const gaitLegs = (p, k, amp) => [0, 1].map((i) => legShape(walkPose(p + i * 0.5, k, amp)));
// How far he goes in a cycle, walking (worked out once per width of step): the foot on the ground goes back under
// him and he goes forward exactly as much, so a foot down never slides
const cycleLengths = new Map();
export function cycleLength(amp) {
    const key = Math.round(amp * 50) / 50;
    if (!cycleLengths.has(key)) {
        let total = 0, prev = gaitLegs(0, 1, key);
        for (let n = 1; n <= 400; n++) {
            const p = n / 400, now = gaitLegs(p, 1, key), g = ((p - 1 / 800) % 1) < 0.5 ? 0 : 1, on = standsOn(now[g]);
            total += Math.max(0, prev[g][on].a - now[g][on].a);
            prev = now;
        }
        cycleLengths.set(key, total);
    }
    return cycleLengths.get(key);
}
// --- Springs: a value that follows its target with some give (soft, it overshoots a little) ---
export function spring(x, stiff = 120, damp = 14) { return { x, v: 0, to: x, stiff, damp }; }
export function step(s, dt) { s.v += ((s.to - s.x) * s.stiff - s.v * s.damp) * dt; s.x += s.v * dt; }
// How his body is bent at a height t (0 his bottom .. 1 the top of his head): the sideways shift and the width
export const bendAt = (f, t) => f.lean * TALL * t * t;
export const widthAt = (f, t) => f.sx * (1 + f.breath * 0.045 * Math.exp(-(((t - 0.24) / 0.16) ** 2)) + f.breath * 0.012 * Math.exp(-(((t - 0.75) / 0.2) ** 2)));
export function local(f, u, v) {
    const t = Math.max(0, (PIVOT.y - v) / TALL);
    return { x: (u - PIVOT.x) * widthAt(f, t) + bendAt(f, t), y: -(PIVOT.y - v) * f.sy };
}
export function toWorld(f, p) {
    const c = Math.cos(f.rot), s = Math.sin(f.rot), x = p.x * f.face;
    return { x: f.root.x + x * c - p.y * s, y: f.root.y + x * s + p.y * c };
}
export const map = (f, u, v) => toWorld(f, local(f, u, v));
// Two bones from a to a target: where the joint goes, bending towards `toward` (a direction)
export function bend(a, target, l1, l2, toward) {
    let dx = target.x - a.x, dy = target.y - a.y;
    const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999), angle = Math.atan2(dy, dx);
    const end = { x: a.x + Math.cos(angle) * d, y: a.y + Math.sin(angle) * d };
    const open = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * Math.max(d, 1e-3)))));
    const joints = [angle + open, angle - open].map((g) => ({ x: a.x + Math.cos(g) * l1, y: a.y + Math.sin(g) * l1 }));
    const mid = { x: (a.x + end.x) / 2, y: (a.y + end.y) / 2 };
    const score = (j) => (j.x - mid.x) * toward.x + (j.y - mid.y) * toward.y;
    return { joint: score(joints[0]) >= score(joints[1]) ? joints[0] : joints[1], end };
}
// --- Turning, and the way round what stands in his way ---
// How much of his pace he keeps while he turns, by how far he still has to turn: he never stops to turn, he walks it
// in a tight curve (slowing a little for a sharp one, never below a third), so going the other way is one swing round
export const turnPace = (off) => Math.max(0.35, Math.cos(Math.min(Math.PI / 2, off * 0.75)));
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const LINE_W = 15;          // (about as thick as the line of her tree beside him)
export function codeBody(c, f, INK, FILL) {
    // turned to us his silhouette is the same widths, row by row, set straight about his middle
    const S0 = rig.silhouette, fr = f.front;
    const S = { ...S0, left: S0.left.map((l, i) => mix(l, PIVOT.x - (S0.right[i] - l) / 2, fr)),
        right: S0.right.map((r, i) => mix(r, PIVOT.x + (r - S0.left[i]) / 2, fr)) };
    const at = (u, v) => local(f, u, v);
    const vOf = (i) => S.top + i * S.step;
    // (round at the crown and at the bottom: the path goes through a point just past each, not along a flat row)
    const last = S.left.length - 1;
    const crown = at(mix(S.crown[0], PIVOT.x, fr), S.crown[1]), base = at(mix(S.base[0], PIVOT.x, fr), S.base[1]);
    const ring = [crown];
    for (let i = 0; i <= last; i++) ring.push(at(S.right[i], vOf(i)));
    ring.push(base);
    for (let i = last; i >= 0; i--) ring.push(at(S.left[i], vOf(i)));
    // a smooth closed curve through the middles of its segments (each point a control point): no corners anywhere
    c.beginPath();
    const midOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    let m = midOf(ring[ring.length - 1], ring[0]);
    c.moveTo(m.x, m.y);
    ring.forEach((p, i) => { m = midOf(p, ring[(i + 1) % ring.length]); c.quadraticCurveTo(p.x, p.y, m.x, m.y); });
    c.closePath();
    c.fillStyle = FILL; c.fill();
    c.save();
    c.clip();
    c.strokeStyle = INK; c.lineWidth = LINE_W * 2; c.lineJoin = 'round'; c.stroke();
    // the hatching: each of her marks as a brush stroke, round and full where it leaves his outline, thinning softly
    // as it bends a little downwards towards his middle and ending round, not sharp; each a touch different
    c.strokeStyle = INK; c.lineCap = 'round';
    rig.hatching.forEach(([v, long], k) => {
        const i = Math.max(0, Math.min(S.left.length - 1, Math.round((v - S.top) / S.step))), u = S.left[i];
        const vary = Math.sin(k * 2.39), base = u + LINE_W - 7, reach = long + 4 + vary * 2;
        const SEG = 7;
        let prev = at(base, v);
        for (let j = 1; j <= SEG; j++) {
            const t = j / SEG, sag = (2.2 + vary) * t * t;                  // the stroke bends down as it goes
            const next = at(base + reach * t, v + sag);
            c.lineWidth = mix(6.6 + vary * 0.5, 2, Math.pow((j - 0.5) / SEG, 0.8));
            c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(next.x, next.y); c.stroke();
            prev = next;
        }
    });
    c.restore();
}
