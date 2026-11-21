// Whoever was in Sid's world goes back into it when the phone closed the app in the background and it starts again at
// its start_url (opened from the Home Screen): LabSid.vue writes when it was last seen while the world is open, and
// clears it when one walks out of the world within the app; the router reads it on the first page (router/index.js)
export const WORLD_RESUME = 'lab.sid.resume';
const RESUME_FOR = 6 * 60 * 60 * 1000;

export function backToWorld() {
    try {
        const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const left = Number(localStorage.getItem(WORLD_RESUME));
        return standalone && left > 0 && Date.now() - left < RESUME_FOR;
    } catch { return false; }
}
