// Where the page scrolls to for "the oracle". Used by the router (for /#oraculo, which is also where /praxis redirects)
// and by the links on the landing itself.
// On phones the title sits a little below the menu button, so the whole block reads from the top; on wider screens
// the text block is centred when it fits (and never tucked under the header).
const GAP_BELOW_MENU = 40;

export const oracleTop = () => {
    const copy = document.querySelector('#oracle .copy');
    if (!copy) return 0;
    if (window.matchMedia('(max-width: 768px)').matches) {
        const heading = copy.querySelector('h3') || copy;
        const menu = document.getElementById('menuButton') || document.querySelector('header');
        const below = menu ? menu.getBoundingClientRect().bottom : 90;
        return Math.max(0, heading.getBoundingClientRect().top + window.scrollY - below - GAP_BELOW_MENU);
    }
    const box = copy.getBoundingClientRect();
    const margin = Math.max(90, (window.innerHeight - box.height) / 2);
    return Math.max(0, box.top + window.scrollY - margin);
};
