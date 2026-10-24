// The 3D table needs WebGL and no reduced-motion preference; otherwise the views use the flat grid.
export const canUse3D = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (e) {
        return false;
    }
};
