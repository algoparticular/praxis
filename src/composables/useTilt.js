// The tilt of the phone, for the parallax of the scenes (useParallax). Android and desktop browsers hand it over
// freely; iOS only after a system prompt, which can only be shown in answer to a touch. Whether iOS remembers that
// grant from one visit to the next is not settled (reports say it does, others that it lasts only as long as the
// page, and nothing is said of an app on the home screen), so it is not trusted: on every visit the tilt is listened
// for, and if it does not come, the first touch asks for it. A grant iOS still holds is answered at once, with no
// prompt; one it forgot, or a question that was never answered, shows the prompt again. A "no" is remembered in
// localStorage and never asked again: asking someone who said no on every visit would break the moment. Without the
// tilt the parallax follows the finger.
const KEY = 'tiltAsked';

const read = () => {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
};
const write = (value) => {
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode: it is asked again next time */ }
};

export const askTiltOnce = () => {
    if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') return;
    if (read() === 'denied') return;

    // Is the tilt already coming? Then iOS still holds the grant and nothing is asked
    let alive = false;
    const listen = (event) => {
        if (event.beta == null) return;
        alive = true;
        window.removeEventListener('deviceorientation', listen);
    };
    window.addEventListener('deviceorientation', listen, { passive: true });

    const ask = () => {
        window.removeEventListener('touchend', ask, true);
        window.removeEventListener('click', ask, true);
        if (alive) return;
        DeviceOrientationEvent.requestPermission()
            .then((answer) => write(answer))
            .catch(() => { /* not taken as a touch, or no sensor: asked again on the next visit */ });
    };
    window.addEventListener('touchend', ask, true);
    window.addEventListener('click', ask, true);
};
