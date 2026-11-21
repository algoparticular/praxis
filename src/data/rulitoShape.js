// The rulito's shape, traced from the artwork of Paciencia (the centre lines of its stem and loop, and the width along
// them), in the units of its glyph's box (W x H below). Rulito.vue draws it as one travelling stroke; Sid's world also
// draws it with the night's stars (a constellation, LabSid.vue).
export const W = 32, H = 86;
export const LINE_AT = [[23.2, 5.3], [23.6, 8.7], [23.8, 12.1], [23.9, 15.5], [23.9, 18.9], [23.8, 22.3], [23.6, 25.7], [23.4, 29.1], [23.2, 32.4], [23, 35.8], [22.7, 39.2], [22.5, 42.5], [22.3, 45.8], [22.2, 49.1], [22, 52.4], [21.8, 55.7], [21.6, 59], [21.3, 62.2], [20.9, 65.4], [20.4, 68.6], [19.7, 71.8], [18.9, 74.9], [17.8, 78], [16.5, 81.1], [15.8, 82.7]];   // the stem, from its top to its foot
export const LINE_W = [1.3, 1.8, 2.1, 2.5, 3, 3, 3, 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.7, 3.7, 3.7, 3.7, 3.6, 3.5, 3.5, 3.4, 3.4, 3.3, 3.2, 3.1];   // half-width of the stroke at each point (smoothed: the traced one swelled where the loop joins the stem)
export const LOOP_AT = [[21.6, 41.2], [18.5, 40.1], [15.6, 40.2], [13, 41.4], [10.9, 43.3], [9.3, 45.7], [8.4, 48.4], [8.2, 51.1], [8.8, 53.6], [10.2, 55.7], [12.1, 57.2], [14.6, 57.9], [17.4, 57.6], [20.5, 56.1], [22.1, 54.9]];   // the loop, from where it leaves the stem (above) to where it comes back (below)
export const LOOP_W = [3.8, 3.9, 4, 3.9, 3.8, 3.7, 3.8, 4, 3.9, 3.9, 4, 3.9, 3.8, 3.8, 3.7];
