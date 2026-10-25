// Where the page scrolls to for "the oracle": the text block of the oracle section, centred on screen when it fits
// (and never tucked under the header). Used by the router (for /#oraculo, which is also where /praxis redirects)
// and by the links on the landing itself.
export const oracleTop = () => {
    const copy = document.querySelector('#oracle .copy');
    if (!copy) return 0;
    const box = copy.getBoundingClientRect();
    const margin = Math.max(90, (window.innerHeight - box.height) / 2);
    return Math.max(0, box.top + window.scrollY - margin);
};
