// The tilt of the phone, for the parallax of the scenes (useParallax). Android and desktop browsers hand it over
// freely; iOS only after a system prompt, which can only be shown in answer to a touch. It is asked once in the life of
// the app (the first touch of the next visit after this arrived), and the answer is remembered in localStorage so it is
// never asked again: asking on every visit would break the moment. If iOS forgets a grant, there is simply no tilt and
// the parallax follows the finger, as it does without it.
const KEY = 'tiltAsked';

const read = () => {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
};
const write = (value) => {
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode: it is asked again next time */ }
};

export const askTiltOnce = () => {
    if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') return;
    if (read()) return;
    const ask = () => {
        window.removeEventListener('touchend', ask, true);
        window.removeEventListener('click', ask, true);
        if (read()) return;
        write('asking');
        DeviceOrientationEvent.requestPermission()
            .then((answer) => write(answer))
            .catch(() => write('failed'));
    };
    window.addEventListener('touchend', ask, true);
    window.addEventListener('click', ask, true);
};
