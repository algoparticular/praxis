// The seven chakra colours, one per character of Algo Particular (chakra 1 to 7, as in verbs.js). The root is the
// brand's coral and the other six share its lightness and saturation, so the seven read as one family on the cream
// and on the navy. `light` is for fills, illustration and anything on the navy; `ink` is its darker twin for text and
// thin lines on the cream. The brand's accent is always the coral: the orange belongs to Samas only.
export const CHAKRA_COLORS = [
    { chakra: 1, character: 'Sporá', light: '#FF6F61', ink: '#BA372E' },
    { chakra: 2, character: 'Samas', light: '#F4844C', ink: '#AD4906' },
    { chakra: 3, character: 'Kätus', light: '#F2B036', ink: '#916102' },
    { chakra: 4, character: 'Vulpes', light: '#62C37A', ink: '#1D803F' },
    { chakra: 5, character: 'Aura', light: '#26C0CF', ink: '#067A84' },
    { chakra: 6, character: 'Huit', light: '#7DAAFD', ink: '#4369B3' },
    { chakra: 7, character: 'Particular', light: '#C690EC', ink: '#8353A4' },
];

// The seven `light` colours, in chakra order: the wheel the oracle's cards light up with
export const CHAKRA_WHEEL = CHAKRA_COLORS.map(c => c.light);
