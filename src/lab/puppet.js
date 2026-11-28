// Sid as a puppet that can be made more than once: his body, his walk, his eyes, as LabSid.vue draws him (the same rig,
// poses, springs and drawing, shared in sid/rig.js), but each one with its own state, its own ink and white, and none
// of the world round him. Made for the hide and seek in the house (house/HideSeek.vue), where two Sids play; Sid's
// world moves its one Sid itself (LabSid.vue: he also sits in lotus, plants and opens cards) with the same rig.
//
// His own coordinates are as in the world: x across in world px, d into the distance (0 in front), and up in px of his
// drawing over the ground at his depth (y grows down, the ground at 0). A camera (`cam`, below) puts him on the screen:
// { x0, cam, groundAt(d), scaleAt(d), perDepth } (perDepth: how many px of the screen a unit of depth is, at scale 1).
import rig from './sid/sid.json';
import { PIVOT, TALL, LEG, ARM, STAND, HIP, FRONT_HIP, SHOULDER, REST_HAND, spread, EYES, FRONT_EYES, FRONT_SHOULDER, FRONT_HAND, mix,
    standsOn, lowest, gaitLegs, cycleLength, spring, step, local, map, bend, turnPace, wrap, codeBody } from './sid/rig.js';

const JUMP = { crouch: 0.3, speed: 600, gravity: 1800 };
export const PACE = 420;
export const TROT = 680;
export const SID_TALL = TALL + STAND;

// A Sid. `ink` and `white`: his line and his body. Where he stands (x, d) and where he faces (heading: 0 to the right,
// PI to the left, -PI/2 towards us, PI/2 into the distance)
export function createPuppet({ ink = '#102A34', white = '#FBF4E4', x = 0, d = 0, heading = -Math.PI / 2 } = {}) {
    const springs = {
        lean: spring(0, 90, 9), sy: spring(1, 160, 9), rot: spring(0, 120, 14), face: spring(1, 260, 26),
        drop: spring(0, 140, 16), closed: spring(0, 60, 14), lookX: spring(0, 60, 12), lookY: spring(0, 60, 12),
        walk: spring(0, 55, 14), reach: spring(0, 40, 11), front: spring(1, 45, 12), back: spring(0, 40, 12),
    };
    const hands = {
        far: { u: spring(REST_HAND.far.u, 70, 12), v: spring(REST_HAND.far.v, 70, 12) },
        near: { u: spring(REST_HAND.near.u, 70, 12), v: spring(REST_HAND.near.v, 70, 12) },
    };
    const state = {
        x, d, heading, speed: 0, phase: 0, run: 0, turning: 0, turnWay: 0, still: 0,
        target: null, onArrive: null, hurry: false, face: null,
        shift: 0, gait: null, gaitDrop: 0, lift: 0, vy: 0, air: false, jumped: false, tuck: 0,
        action: null, breath: 0, blink: 0, nextBlink: 1 + Math.random() * 2, glance: null, nextGlance: 2,
        feet: [null, null], steps: [null, null], toes: [0, 0], legTuck: [0, 0],
        reach: null, reached: null, look: null,
        hidden: false, show: 1,          // hidden in a hiding place: not drawn (`show` fades him in and out)
        crouch: 0,                       // 0..1: crouching, small (going into a hiding place, or coming out of it)
    };
    const lateral = () => Math.max(-1, Math.min(1, -Math.sin(state.heading) * 4));
    const side = (u) => PIVOT.x + (u - PIVOT.x) * lateral();
    const hipsOf = (f) => ['far', 'near'].map((s) => ({ u: mix(HIP[s].u, side(FRONT_HIP[s].u), spread(f.front)), v: mix(HIP[s].v, FRONT_HIP[s].v, f.front) }));
    function frame() {
        const front = Math.max(0, Math.min(1, springs.front.x));
        return {
            front, root: { x: state.x + state.shift, y: -STAND + springs.drop.x + state.gaitDrop - state.lift },
            rot: springs.rot.x, face: Math.sign(springs.face.x || 1),
            sy: springs.sy.x, sx: 1 / Math.sqrt(Math.max(0.5, springs.sy.x)), lean: springs.lean.x, breath: state.breath,
        };
    }
    function turnTo(aim, most) {
        let diff = wrap(aim - state.heading);
        if (Math.abs(diff) > Math.PI * 0.85) {
            const other = diff - Math.sign(diff) * Math.PI * 2, toUs = wrap(-Math.PI / 2 - state.heading);
            const through = (dk) => Math.sign(toUs) === Math.sign(dk) && Math.abs(toUs) <= Math.abs(dk);
            if (!state.turnWay) state.turnWay = !through(diff) && through(other) ? Math.sign(other) : Math.sign(diff);
            if (Math.sign(diff) !== state.turnWay) diff = other;
        } else state.turnWay = 0;
        state.heading = wrap(state.heading + Math.max(-most, Math.min(most, diff)));
    }
    // What stands in his way: ellipses on the floor { x, d, r, rd } (from env.obstacles), and the room's bounds
    const squash = (o) => o.r / (o.rd ?? o.r);
    function steer(mx, mz, obstacles) {
        const goal = state.target ? Math.hypot(state.target.x - state.x, state.target.d - state.d) : Infinity;
        let best = null;
        for (const o of obstacles) {
            const q = squash(o), rx = state.x - o.x, rz = (state.d - o.d) * q, dist = Math.hypot(rx, rz) || 1, R = o.r + 26;
            if (dist > R + 130 || dist - o.r > goal) continue;
            if (-(mx * rx + mz * q * rz) / dist <= 0) continue;
            if (!best || dist - R < best.gap) best = { q, rx, rz, dist, R, gap: dist - R };
        }
        if (!best) return [mx, mz];
        const { q, rx, rz, dist, R } = best;
        let mzq = mz * q;
        const a = { x: -rz / dist, z: rx / dist }, b = { x: rz / dist, z: -rx / dist };
        const t = a.x * mx + a.z * mzq >= b.x * mx + b.z * mzq ? a : b;
        const kk = Math.max(0, Math.min(1, 1 - (dist - R) / 130));
        mx = mx * (1 - kk) + t.x * kk; mzq = mzq * (1 - kk) + t.z * kk;
        mz = mzq / q;
        const l = Math.hypot(mx, mz) || 1;
        return [mx / l, mz / l];
    }
    function collide(obstacles, bounds) {
        for (const o of obstacles) {
            const q = squash(o), rx = state.x - o.x, rz = (state.d - o.d) * q, dist = Math.hypot(rx, rz) || 1;
            if (dist < o.r) { state.x = o.x + rx / dist * o.r; state.d = o.d + rz / dist * o.r / q; }
        }
        if (bounds) {
            state.x = Math.max(bounds.x0, Math.min(bounds.x1, state.x));
            state.d = Math.max(bounds.d0, Math.min(bounds.d1, state.d));
        }
    }
    const act = (name, dur, extra = {}) => { state.action = { name, t: 0, dur, ...extra }; };
    function turnedRound() {
        const n = hands.near, f = hands.far;
        for (const k of ['u', 'v']) { [n[k].x, f[k].x] = [f[k].x, n[k].x]; [n[k].v, f[k].v] = [f[k].v, n[k].v]; }
        for (const h of [n, f]) { h.u.x = 2 * PIVOT.x - h.u.x; h.u.v = -h.u.v; }
        state.feet.reverse(); state.steps.reverse(); state.toes.reverse(); state.legTuck.reverse();
        state.phase = (state.phase + 0.5) % 1;
        if (state.action?.arm) state.action.arm = state.action.arm === 'near' ? 'far' : 'near';
    }

    // env: { obstacles: [...], bounds: { x0, x1, d0, d1 } }
    function update(dt, now, env = {}) {
        const S = springs, obstacles = env.obstacles ?? [];
        const a = state.action;
        if (a) { a.t += dt; if (a.t >= a.dur) { state.action = null; a.done?.(); } }
        const name = state.action?.name, t = state.action?.t ?? 0;
        let mx = 0, mz = 0, left = Infinity;
        if (state.target && !state.hidden) {
            const dx = state.target.x - state.x, dd = state.target.d - state.d;
            left = Math.hypot(dx, dd);
            // (there; or stuck a while against something, not getting nearer: as near as he gets)
            state.stuck = left < (state.best ?? Infinity) - 4 ? 0 : (state.stuck ?? 0) + dt;
            state.best = Math.min(state.best ?? Infinity, left);
            if (left < 14 || (left < 50 && Math.abs(wrap(Math.atan2(dd, dx) - state.heading)) > Math.PI / 2) || state.stuck > 1.2) {
                state.best = Infinity; state.stuck = 0;
                state.target = null;
                const done = state.onArrive; state.onArrive = null; done?.();
            } else { mx = dx / left; mz = dd / left; }
        }
        let length = Math.hypot(mx, mz);
        if (length > 0) { mx /= length; mz /= length; [mx, mz] = steer(mx, mz, obstacles); length = 1; }
        state.still = length > 0 ? 0 : state.still + dt;
        let aim = null;
        if (length > 0) aim = Math.atan2(mz, mx);
        else if (state.face != null) aim = state.face;
        else if (state.reach) aim = state.reach.x >= state.x ? 0 : Math.PI;
        else if (state.still > 0.45) aim = -Math.PI / 2;
        const heading0 = state.heading;
        if (aim !== null && !state.air) turnTo(aim, dt * (length > 0 ? 9 + 3 * state.run : 6));
        state.turning = dt > 0 ? wrap(state.heading - heading0) / dt : 0;
        const off = aim === null ? 0 : Math.abs(wrap(aim - state.heading));
        const trot = state.hurry && left > 420;
        const top = trot ? TROT : PACE;
        const busy = name === 'jump' || name === 'crouch' || name === 'emerge';
        const want = length > 0 && !state.air && !busy ? Math.min(top, left * 3 + 20) * turnPace(off) : 0;
        const was = state.speed;
        if (!state.air) state.speed = want > state.speed ? Math.min(want, state.speed + (trot ? 800 : 700) * dt) : Math.max(want, state.speed - 900 * dt);
        const onFeet = !state.air && !busy;
        const amp = 1.2 + 0.25 * state.run, kWalk = Math.max(0, Math.min(1, S.walk.x));
        let go = 0;
        if (onFeet && (state.speed > 0.5 || kWalk > 0.02)) {
            const before = gaitLegs(state.phase, kWalk, amp);
            const dp = state.speed * dt / cycleLength(amp);
            const after = state.phase + dp, g = (state.phase % 1) < 0.5 ? 0 : 1;
            state.phase = after % 1;
            const nowLegs = gaitLegs(state.phase, kWalk, amp);
            if (((after - 1e-9) % 1 < 0.5 ? 0 : 1) === g) { const on = standsOn(nowLegs[g]); go = Math.max(0, before[g][on].a - nowLegs[g][on].a); }
            state.gait = { legs: nowLegs, k: kWalk };
            state.gaitDrop = STAND + 2 + Math.min(lowest(nowLegs[0]), lowest(nowLegs[1]));
        } else { state.gait = null; state.gaitDrop += (0 - state.gaitDrop) * Math.min(1, dt * 10); }
        if (!onFeet && state.speed > 0.5) go = state.speed * dt;
        if (go > 0) {
            state.x += Math.cos(state.heading) * go;
            state.d += Math.sin(state.heading) * go;
        }
        collide(obstacles, env.bounds);
        state.run = Math.max(0, Math.min(1, (state.speed - PACE) / (TROT - PACE)));
        const walking = state.speed > 3 ? 1 : 0;
        if (was > 40 && state.speed <= 40 && want === 0) { S.lean.v += 0.22 * (Math.sign(S.face.x) || 1) * (1 - frame().front) * (was / PACE); S.sy.v -= 0.7; }

        S.walk.to = walking;
        const run = state.run;
        const w = Math.max(0, Math.min(1, S.walk.x)), p = state.phase, face = Math.sign(S.face.x) || 1;
        state.shift = (Math.sign(lateral() * face) || 1) * Math.sin(Math.PI * 2 * p) * 9 * S.front.x * w;

        state.breath = Math.sin(now / 1000 * Math.PI * 2 * 0.26);
        state.nextBlink -= dt;
        if (state.nextBlink <= 0) { state.blink = 0.16; state.nextBlink = 2 + Math.random() * 3.5; }
        state.blink = Math.max(0, state.blink - dt);
        state.show += ((state.hidden ? 0 : 1) - state.show) * Math.min(1, dt * 9);

        const fr = frame().front;
        const st = (p * 2) % 1, low = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (st - 0.25));
        let lean = w * (0.02 + 0.03 * run) * face * (1 - fr), sy = 1 - w * (0.012 + 0.025 * run) * (low - 0.5) * 2, rot = w * 0.006 * Math.sin(p * Math.PI * 2), drop = 0, closed = 0;
        rot += w * Math.max(-0.07, Math.min(0.07, state.turning * 0.012));
        let near = { ...REST_HAND.near }, far = { ...REST_HAND.far };
        const swing = -Math.cos(Math.PI * 2 * (p - 0.06)) * (30 + 16 * run) * w;
        near.u -= swing; far.u += swing;
        near.v -= Math.max(0, -swing) * (0.15 + 0.5 * run); far.v -= Math.max(0, swing) * (0.15 + 0.5 * run);
        if (run > 0) { near.v -= 22 * run; far.v -= 22 * run; }
        near = { u: mix(near.u, side(FRONT_HAND.near.u), spread(fr)), v: mix(near.v, FRONT_HAND.near.v, fr) };
        far = { u: mix(far.u, side(FRONT_HAND.far.u), spread(fr)), v: mix(far.v, FRONT_HAND.far.v, fr) };
        near.v -= fr * Math.max(0, -swing) * 0.9; near.u += fr * Math.max(0, -swing) * 0.6;
        far.v -= fr * Math.max(0, swing) * 0.9; far.u -= fr * Math.max(0, swing) * 0.6;
        const restNear = near, restFar = far;

        if (name === 'wave') {
            const hand = { u: 250 + Math.sin(t * 12) * 34, v: 215 + Math.cos(t * 12) * 10 }, far_ = state.action.arm === 'far';
            if (far_) far = { u: fr > 0.5 && lateral() > 0 ? 2 * PIVOT.x - hand.u : hand.u, v: hand.v }; else near = hand;
            lean = (far_ ? 0.035 : -0.035) * Math.min(1, t * 3); sy = 1.03;
        }
        // both arms up, glad (found, or winning)
        if (name === 'cheer') {
            const up = Math.min(1, t / 0.25) * Math.min(1, (state.action.dur - t) / 0.3), sway = Math.sin(t * 9) * 18;
            near = { u: side(PIVOT.x - 120) + sway, v: 120 - 60 * up, final: true }; far = { u: side(PIVOT.x + 120) + sway, v: 120 - 60 * up, final: true };
            near.v = mix(REST_HAND.near.v, near.v, up); far.v = mix(REST_HAND.far.v, far.v, up);
            sy = 1 + 0.06 * up * Math.abs(Math.sin(t * 9)); closed = up > 0.5 ? 1 : 0;
        }
        // going into a hiding place (crouching small, then gone) and coming out of it (small, then up, with a give)
        if (name === 'crouch') {
            const e = Math.min(1, t / state.action.dur), k = e * e * (3 - 2 * e);
            drop = 150 * k; sy = 1 - 0.18 * k; lean = 0.06 * face * k;
            near = { u: mix(near.u, PIVOT.x + 40, k), v: mix(near.v, 300, k) }; far = { u: mix(far.u, PIVOT.x + 20, k), v: mix(far.v, 310, k) };
        }
        if (name === 'emerge') {
            const e = Math.min(1, t / state.action.dur);
            drop = 150 * (1 - e) * (1 - e); sy = 1 - 0.18 * (1 - e) + 0.08 * Math.sin(Math.PI * e);
        }
        if (name === 'jump' && !state.air && !state.jumped) {
            const e = Math.min(1, t / JUMP.crouch), ease_ = e * e * (3 - 2 * e);
            drop = 48 * ease_; sy = 1 - 0.09 * ease_; lean = 0.035 * face * ease_; rot = 0.022 * face * ease_;
            if (fr > 0.5) {
                near = { u: mix(near.u, side(PIVOT.x - 150), ease_), v: mix(near.v, 470, ease_), final: true };
                far = { u: mix(far.u, side(PIVOT.x + 150), ease_), v: mix(far.v, 470, ease_), final: true };
            } else { near = { u: mix(near.u, 60, ease_), v: mix(near.v, 480, ease_) }; far = { u: mix(far.u, 40, ease_), v: mix(far.v, 470, ease_) }; }
            if (t >= JUMP.crouch) { state.air = true; state.jumped = true; state.vy = JUMP.speed * (state.action.high ?? 1); S.sy.v += 2.5; S.drop.v -= 260; }
        }
        if (state.air) {
            state.lift += state.vy * dt; state.vy -= JUMP.gravity * dt;
            const up = Math.max(-1, Math.min(1, state.vy / JUMP.speed));
            state.tuck = 1 - Math.abs(up);
            sy = 1 + 0.07 * Math.abs(up); lean = 0.015 * face * up;
            if (fr > 0.5) {
                const out = up > 0 ? 118 : mix(118, 180, -up), v = up > 0 ? mix(330, 170, up) : mix(330, 400, -up);
                near = { u: side(PIVOT.x - out), v, final: true }; far = { u: side(PIVOT.x + out), v, final: true };
            } else {
                near = up > 0 ? { u: 190, v: mix(330, 170, up) } : { u: mix(190, 236, -up), v: mix(330, 400, -up) };
                far = up > 0 ? { u: 70, v: mix(330, 180, up) } : { u: mix(70, 20, -up), v: mix(330, 400, -up) };
            }
            if (state.lift <= 0) {
                state.lift = 0; state.air = false; state.tuck = 0;
                S.sy.v -= 3.6; S.drop.v += 380;
                state.feet.forEach((foot) => { if (foot) { foot.y = 0; foot.d = state.d; } });
            }
        }
        if (name === 'reach' && state.reach) {
            const f = frame(), head = map(f, 150, 120), dx = state.reach.x - head.x, dy = state.reach.y - head.y;
            lean = Math.max(-0.12, Math.min(0.12, (dx * face) / 900)) * face;
            sy = 1 + Math.max(0, Math.min(0.12, -dy / 1500));
        }
        if (state.reach && name !== 'reach') state.reach = null;
        S.reach.to = state.reach ? 1 : 0;
        if (fr > 0.5 && lateral() > 0) {
            if (near !== restNear && !near.final) near = { u: 2 * PIVOT.x - near.u, v: near.v };
            if (far !== restFar && !far.final) far = { u: 2 * PIVOT.x - far.u, v: far.v };
            if (name === 'wave') lean = -lean;
        }
        S.lean.to = lean; S.sy.to = sy; S.rot.to = rot; S.drop.to = drop; S.closed.to = closed;

        // where he looks: what he was told to look at (another Sid), else ahead where he turns, else a glance now and then
        const f0 = frame(), head = map(f0, 150, 200);
        let look = null;
        if (state.reach) look = state.reach;
        else if (state.look) look = state.look;
        else if (aim !== null && off > 0.25) look = { x: head.x + Math.cos(aim) * 500, y: head.y + 40 };
        else {
            state.nextGlance -= dt;
            if (state.nextGlance <= 0) { state.glance = Math.random() < 0.4 ? null : { x: head.x + (Math.random() - 0.5) * 600, y: head.y + (Math.random() - 0.6) * 300 }; state.nextGlance = 1.5 + Math.random() * 3; }
            look = state.glance;
        }
        if (look) {
            const dx = look.x - head.x, dy = look.y - head.y, dist = Math.hypot(dx, dy) || 1, m = Math.min(1, dist / 250);
            S.lookX.to = (dx / dist) * m * f0.face; S.lookY.to = (dy / dist) * m;
            if (!state.reach) S.lean.to += (dx / dist) * m * 0.02;
        } else { S.lookX.to = 0.35; S.lookY.to = 0; }

        const before = Math.sign(S.face.x);
        for (const s of Object.values(S)) step(s, dt);
        {
            const hx = Math.cos(state.heading), hz = Math.sin(state.heading);
            S.face.x = S.face.to = Math.abs(hx) > 1e-3 ? hx : (before || 1) * 1e-3; S.face.v = 0;
            S.front.x = S.front.to = Math.acos(Math.min(1, Math.abs(hx))) / (Math.PI / 2); S.front.v = 0;
            const b = Math.max(0, Math.min(1, (hz - 0.15) / 0.45));
            S.back.x = S.back.to = b * b * (3 - 2 * b); S.back.v = 0;
        }
        for (const h of Object.values(hands)) { step(h.u, dt); step(h.v, dt); }
        if (before && Math.sign(S.face.x) && Math.sign(S.face.x) !== before) turnedRound();
        hands.near.u.to = near.u; hands.near.v.to = near.v; hands.far.u.to = far.u; hands.far.v.to = far.v;

        // his feet on the floor (as in LabSid.vue)
        const f = frame(), hd = { x: Math.cos(state.heading), z: Math.sin(state.heading) };
        hipsOf(f).forEach((hip, i) => {
            const h = map(f, hip.u, hip.v);
            const under = f.root.x + (hip.u - PIVOT.x) * face, back = (i ? -1 : 1) * 9 * (1 - f.front);
            const rest = { x: under + face * (i ? 4 : -4), d: state.d + back, y: 0 };
            if (state.gait) {
                const L = state.gait.legs[i], H = STAND + 2 - state.gaitDrop;
                state.feet[i] = { x: under + hd.x * L.ankle.a, d: state.d + back + hd.z * L.ankle.a, y: Math.max(0, L.heel.u + H) };
                state.steps[i] = null; state.toes[i] = 0;
                return;
            }
            let foot = state.feet[i] ?? rest;
            state.legTuck[i] += ((state.air ? state.tuck : 0) - state.legTuck[i]) * Math.min(1, dt * (i ? 6 : 13));
            state.toes[i] += (0 - state.toes[i]) * Math.min(1, dt * 10);
            if (state.air && i === 1 && state.lift < 24 && state.vy > 0) foot = { ...foot, y: 0 };
            else if (state.air) foot = { x: h.x + face * (8 + 22 * state.legTuck[i]), d: state.d, y: -(h.y + STAND * (0.97 - 0.32 * state.legTuck[i])) };
            else {
                const st_ = state.steps[i];
                if (st_) {
                    st_.t += dt / 0.24;
                    const e = Math.min(1, st_.t), s = e * e * (3 - 2 * e);
                    foot = { x: st_.from.x + (rest.x - st_.from.x) * s, d: st_.from.d + (rest.d - st_.from.d) * s, y: st_.from.y * (1 - s) + Math.sin(e * Math.PI) * 20 };
                    if (e >= 1) state.steps[i] = null;
                } else if (Math.hypot(rest.x - foot.x, rest.d - foot.d) > 6 && !state.steps[1 - i]) state.steps[i] = { from: foot, t: 0 };
                else if (!state.steps[i]) { const m = Math.min(1, dt * 6); foot = { x: foot.x + (rest.x - foot.x) * m, d: foot.d + (rest.d - foot.d) * m, y: foot.y * (1 - m) }; }
            }
            state.feet[i] = foot;
        });
    }

    // --- Drawing him: in his own px at his depth; `cam` puts that on the screen ---
    // A point on the floor (x, d), lifted y, in his own drawing at his depth
    function onFloor(p, cam) {
        const s0 = cam.scaleAt(state.d), s1 = cam.scaleAt(p.d);
        return { x: cam.cam + (p.x - cam.cam) * s1 / s0, y: (cam.groundAt(p.d) - cam.groundAt(state.d) - (p.y ?? 0) * s1) / s0 };
    }

    // Draws him (and his shadow); also keeps where his head and middle are on the screen (in the canvas's own units)
    function draw(c, cam) {
        if (state.show < 0.02) return;
        const f = frame(), face = Math.sign(f.face), INK = puppet.ink;
        const depth = cam.scaleAt(state.d);
        c.save();
        c.globalAlpha = state.show;
        c.translate(cam.x0, cam.groundAt(state.d)); c.scale(depth, depth); c.translate(-cam.cam, 0);
        c.fillStyle = 'rgba(20, 30, 40, 0.14)';
        c.beginPath();
        c.ellipse(f.root.x, 4, 70 * (1 - Math.min(0.5, state.lift / 400)), 10, 0, 0, Math.PI * 2);
        c.fill();
        const limb = ([a, joint, end, toe], width) => {
            c.strokeStyle = INK; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
            const mid = { x: (a.x + end.x) / 2, y: (a.y + end.y) / 2 };
            const pull = { x: joint.x + (joint.x - mid.x) * 0.35, y: joint.y + (joint.y - mid.y) * 0.35 };
            c.beginPath(); c.moveTo(a.x, a.y);
            c.quadraticCurveTo(pull.x, pull.y, end.x, end.y);
            if (toe) c.quadraticCurveTo(end.x, toe.y, toe.x, toe.y);
            c.stroke();
        };
        const hips = hipsOf(f).map((hip) => map(f, hip.u, hip.v));
        const placed = state.feet.map((fl, i) => (fl ? onFloor(fl, cam) : { x: hips[i].x, y: 0 }));
        {
            const sd = Math.sign(hips[1].x - hips[0].x), apart = (placed[1].x - placed[0].x) * sd, GAP = 34 * f.front;
            if (sd && apart < GAP) {
                const push = (GAP - apart) / 2 * sd;
                placed[0] = { ...placed[0], x: placed[0].x - push }; placed[1] = { ...placed[1], x: placed[1].x + push };
            }
        }
        const G = state.gait, Kd = cam.perDepth / depth;
        const hx = Math.cos(state.heading), hz = Math.sin(state.heading);
        const seen = (h, pt, back) => ({ x: h.x + hx * pt.a, y: h.y - (hz * pt.a + back) * Kd - pt.u });
        const legs = hipsOf(f).map((hip, i) => {
            const h = hips[i], floor = state.feet[i], foot = placed[i];
            if (G) {
                const L = G.legs[i], back = (i ? -1 : 1) * 9 * (1 - f.front), outward = (i ? -1 : 1) * face * lateral();
                const toe = seen(h, L.toe, back);
                return { h, joint: seen(h, L.knee, back), end: seen(h, L.ankle, back), toe: { x: toe.x + outward * 0.75 * LEG.foot * f.front, y: toe.y } };
            }
            const outward = (i ? -1 : 1) * face * lateral();
            const toward = { x: mix(face, outward * 0.3, f.front), y: 0 };
            const ankle = { x: foot.x, y: foot.y - 6 };
            const lean3d = floor ? Math.abs(cam.groundAt(floor.d) - cam.groundAt(state.d)) / depth : 0;
            const longer = Math.hypot(LEG.thigh + LEG.shin, lean3d * 1.1) / (LEG.thigh + LEG.shin);
            const { joint, end } = bend(h, ankle, LEG.thigh * longer, LEG.shin * longer, toward);
            const toes = hx * (1 - f.front) + outward * 0.75 * f.front;
            const tilt = -hz * LEG.foot * 0.3;
            return { h, joint, end, toe: { x: end.x + toes * LEG.foot, y: end.y + 2 + tilt + state.toes[i] } };
        });
        const arms = ['far', 'near'].map((which, i) => {
            const s = map(f, mix(SHOULDER[which].u, side(FRONT_SHOULDER[which].u), spread(f.front)), mix(SHOULDER[which].v, FRONT_SHOULDER[which].v, f.front));
            let hand = map(f, hands[which].u.x, hands[which].v.x);
            const r = springs.reach.x;
            if (which === 'near' && state.reached && r > 0.001) hand = { x: hand.x + (state.reached.x - hand.x) * r, y: hand.y + (state.reached.y - hand.y) * r };
            const raised = hand.y < s.y;
            const out = (i ? -1 : 1) * face * lateral(), back = mix(-face * 0.7, out, f.front);
            const toward = raised ? { x: out * 0.5, y: 1 } : { x: back, y: 0.15 };
            return { s, ...bend(s, hand, ARM.upper, ARM.fore, toward) };
        });
        limb([arms[0].s, arms[0].joint, arms[0].end], ARM.width);
        legs.forEach((l) => limb([l.h, l.joint, l.end, l.toe], LEG.width));
        c.save();
        c.translate(f.root.x, f.root.y); c.rotate(f.rot); c.scale(f.face, 1);
        codeBody(c, f, puppet.ink, puppet.white);
        const closed = Math.max(springs.closed.x, state.blink > 0 ? 1 : 0);
        c.globalAlpha = state.show * (1 - springs.back.x);
        if (springs.back.x < 0.98) EYES.forEach(([pu, pv, r], e) => {
            const u = mix(pu, FRONT_EYES[e][0], f.front), v = mix(pv, FRONT_EYES[e][1], f.front);
            const at = local(f, u + springs.lookX.x * 7, v + springs.lookY.x * 6);
            c.fillStyle = INK; c.strokeStyle = INK;
            if (closed > 0.6 && springs.closed.x > 0.5) {
                const R = r * 3, apart = (e ? 1 : -1) * 15;
                c.lineWidth = 11; c.lineCap = 'round';
                c.beginPath(); c.arc(at.x + apart, at.y - R * 0.8, R, Math.PI * 0.27, Math.PI * 0.73); c.stroke();
            } else {
                c.beginPath(); c.ellipse(at.x, at.y, r * 0.95, r * (closed > 0.6 ? 0.18 : 0.95), 0, 0, Math.PI * 2); c.fill();
            }
        });
        c.restore();
        limb([arms[1].s, arms[1].joint, arms[1].end], ARM.width);
        const crown = c.getTransform().transformPoint(map(f, PIVOT.x, rig.silhouette.crown[1]));
        const middle = c.getTransform().transformPoint(map(f, PIVOT.x, (rig.silhouette.crown[1] + PIVOT.y) / 2));
        const feet = c.getTransform().transformPoint({ x: f.root.x, y: 0 });
        puppet.onScreen = { crown, middle, feet };
        c.restore();
    }

    const puppet = {
        state, ink, white, onScreen: null,
        // walks to (x, d); `then` is called once there
        walkTo(x_, d_, then = null) { state.target = { x: x_, d: d_ }; state.onArrive = then; state.reach = null; state.face = null; state.best = Infinity; state.stuck = 0; },
        stop() { state.target = null; state.onArrive = null; state.speed = 0; },
        // puts him somewhere at once, standing still (facing `heading`)
        place(x_, d_, h = -Math.PI / 2) {
            Object.assign(state, { x: x_, d: d_, heading: h, target: null, onArrive: null, speed: 0, feet: [null, null], steps: [null, null], gait: null, air: false, lift: 0 });
        },
        wave() { if (!state.air) act('wave', 2.4, { arm: 'near' }); },
        hop(high = 1) { if (!state.air) { state.jumped = false; act('jump', 1.4, { high }); } },
        cheer(dur = 1.8) { act('cheer', dur); },
        reachFor(p, dur = 1.2) { state.reach = p; state.reached = p; act('reach', dur); },
        // crouches small and is gone (into a hiding place); `then` once gone
        hide(then = null) { state.target = null; act('crouch', 0.45, { done: () => { state.hidden = true; then?.(); } }); },
        // comes out of a hiding place, small, and stands up with a give
        emerge() { state.hidden = false; state.show = 0.2; act('emerge', 0.5); },
        // where he looks (another Sid's head, in world px: { x, y } with y up from the ground as negative), or null
        lookAt(p) { state.look = p; },
        // faces this way when still (or null: towards us)
        faceTo(h) { state.face = h; },
        head: () => map(frame(), PIVOT.x, 160),
        update, draw,
    };
    return puppet;
}
