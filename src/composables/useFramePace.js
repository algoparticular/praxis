// How smoothly the page is drawn: every frame the browser paints is timed. Used by the frame counter on screen (?fps,
// FpsMeter.vue) and by the analytics, which send a summary of each card visit and each 3D table (analytics.js).
// A frame over 25 ms is slow (at 60 frames a second one was skipped); over 50 ms it is a stutter anyone can see.
// A gap of a second or more is the page hidden or the phone locked, not a slow frame, so it is left out.
// Locked at 30: nearly every frame takes one refresh of 30 a second (28 to 40 ms). That is the browser holding the page
// at 30, as Safari does in Low Power Mode, and then every frame counts as slow even though the page moves evenly;
// a page that really cannot keep up skips frames unevenly instead (16, 33, 50 ms...).
export const SLOW_MS = 25;
export const STUTTER_MS = 50;
const AT_30 = [28, 40];
const LOCKED_SHARE = 0.9;

export function measureFrames() {
    let raf = 0;
    let last = 0;
    let frames = 0;
    let time = 0;
    let slow = 0;
    let stutters = 0;
    let worst = 0;
    let at30 = 0;
    let recent = [];                            // the frames of the last second, for the live count

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const dt = last ? now - last : 0;
        last = now;
        if (dt <= 0 || dt >= 1000) return;
        frames += 1;
        time += dt;
        if (dt > SLOW_MS) slow += 1;
        if (dt > STUTTER_MS) stutters += 1;
        if (dt >= AT_30[0] && dt <= AT_30[1]) at30 += 1;
        worst = Math.max(worst, dt);
        recent.push(now);
        while (recent[0] < now - 1000) recent.shift();
    };
    raf = requestAnimationFrame(frame);

    return {
        // fps: the last second; average: since it started (or was reset)
        stats: () => ({
            fps: recent.length,
            average: time ? Math.round(frames / (time / 1000)) : 0,
            frames,
            seconds: Math.round(time / 1000),
            slow,
            stutters,
            worst: Math.round(worst),
            // with at least two seconds of frames, so the first few do not decide it
            locked30: frames >= 60 && at30 / frames >= LOCKED_SHARE,
        }),
        reset() {
            frames = 0;
            time = 0;
            slow = 0;
            stutters = 0;
            worst = 0;
            at30 = 0;
            recent = [];
        },
        stop: () => cancelAnimationFrame(raf),
    };
}
