// Hands the flipped card from the oracle grid to the card page, which animates it into place.
let pending = null;

export const setPendingTransition = (transition) => {
    pending?.el.remove();
    pending = transition;
    //Safety net: never leave the overlay stuck if the card page does not pick it up
    setTimeout(() => {
        if (pending === transition) {
            transition.el.remove();
            pending = null;
        }
    }, 4000);
};

export const takePendingTransition = () => {
    const transition = pending;
    pending = null;
    return transition;
};
