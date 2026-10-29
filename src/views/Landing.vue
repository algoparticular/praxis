<script setup>
	import { onMounted, onBeforeUnmount, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { inView, scroll } from "motion";

    import Header  from '../components/Header.vue';
    import Footer  from '../components/Footer.vue';

    import { KinesisContainer, KinesisElement} from 'vue-kinesis';
    import { createStarField } from '../composables/useStarField.js';
    import { createHeroSpiral } from '../composables/useHeroSpiral.js';
    import { createCharacterLife } from '../composables/useCharacterLife.js';
    import { oracleTop } from '../composables/oracleScroll.js';
    import ModeSelector from '../components/ModeSelector.vue';
    import { play } from '../composables/useSound.js';
    
    const router = useRouter();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    //handle navigation
    const handleNavigate = (url) => {
        router.push({ path: url }); //, replace: true
    };

    //The hero's call to action glides down to the oracle block
    const goToOracle = () => {
        window.scrollTo({ top: oracleTop(), behavior: reducedMotion ? 'auto' : 'smooth' });
    };


    //Cells and particles in three.js; the static cells come back if WebGL is not available
    const cellCanvas = ref(null);
    const cellsFallback = ref(false);
    let cellField = null;

    //Dotted spiral of the hero character, drawn on a canvas over his picture
    const spiralCanvas = ref(null);
    let spiral = null;

    //Night sky of the oracle block: twinkling stars and the odd shooting star
    const starCanvas = ref(null);
    const skyTail = ref(null);
    const tailCanvas = ref(null);
    let starField = null;
    let tailField = null;
    let unmounted = false;

    const stopCorners = [];
    const stopReveals = [];
    const idleAnimations = [];

    onBeforeUnmount(() => {
        unmounted = true;
        cellField?.destroy();
        spiral?.destroy();
        starField?.destroy();
        tailField?.destroy();
        stopCorners.forEach((stop) => stop());
        stopReveals.forEach((stop) => stop());
        idleAnimations.forEach((animation) => animation.cancel());
    });

    // //ON MOUNTED
	onMounted (() => {         
        spiral = createHeroSpiral(spiralCanvas.value, { animate: !reducedMotion });
        starField = createStarField(starCanvas.value, document.getElementById('oracle'), { onShoot: () => play('star') });
        //The sky keeps going into the top of the next block and fades out as the background turns violet
        tailField = createStarField(tailCanvas.value, skyTail.value, { shooting: false });

        import('../composables/useCellField.js')
            .then(({ createCellField }) => createCellField(cellCanvas.value, document.getElementById('hero')))
            .then((field) => { unmounted ? field.destroy() : (cellField = field); })
            .catch((error) => {
                console.warn('Cell field unavailable, using static cells', error);
                cellsFallback.value = true;
            });

        if (!reducedMotion) {
            //Entrance: the title rises first, its action follows, then the particle settles in.
            //translate/scale are independent properties so they do not fight the parallax, which owns transform.
            const enter = (el, { y = 24, scale = 1, delay = 0, duration = 1100 }) => el.animate(
                { opacity: [0, 1], translate: [`0 ${y}px`, '0 0'], scale: [scale, 1] },
                { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
            );
            enter(document.querySelector('#hero h1'), { y: 28, delay: 150 });
            enter(document.querySelector('#hero h1 span'), { y: 14, delay: 650, duration: 900 });
            //Once settled, the character lives (see useCharacterLife): floats, breathes and reacts to the pointer.
            //The kinesis parallax keeps the vertical transform; everything there goes through independent properties.
            let scrollLift = 0;                                     //set by the scroll handler below
            const particle = document.querySelector('#hero .splash.particle');
            const life = createCharacterLife(particle, document.getElementById('hero'), { spiral, getLift: () => scrollLift });
            enter(particle, { y: 40, scale: 0.88, delay: 350, duration: 1600 }).finished.then(life.start).catch(() => {});
            stopReveals.push(() => life.destroy());

            //Leaving the hero: the title lifts and fades while the particle drifts up slower, so the violet hands over to the night
            const heroTitle = document.querySelector('#hero > a');
            stopCorners.push(scroll(({ y }) => {
                const p = Math.min(1, Math.max(0, y.progress));
                heroTitle.style.opacity = 1 - p * 1.4;
                heroTitle.style.translate = `0 ${-p * 60}px`;
                scrollLift = -p * 110;
            }, { target: document.getElementById('hero'), offset: ['start start', 'end 40%'] }));

            //The violet turns into the navy of the next block while the seam between them rises through the screen
            const landing = document.querySelector('.landing');
            stopCorners.push(scroll(({ y }) => {
                landing.style.setProperty('--mix', Math.min(1, Math.max(0, y.progress)).toFixed(3));
            }, { target: document.getElementById('hero'), offset: ['end end', 'end 45%'] }));

            //Dawn: the navy becomes orange while the quote rises, after the seam with the oracle block has left the screen
            stopCorners.push(scroll(({ y }) => {
                landing.style.setProperty('--dawn', Math.min(1, Math.max(0, y.progress)).toFixed(3));
            }, { target: document.querySelector('#uno h2'), offset: ['start 62%', 'start 18%'] }));

            //Leaving the oracle block: the copy and the illustration sink into the dark before the sky turns violet
            const oracleCopy = document.querySelector('#oracle .copy');
            const oracleGfx = document.querySelector('#oracle .gfx');
            stopCorners.push(scroll(({ y }) => {
                const p = Math.min(1, Math.max(0, y.progress));
                oracleCopy.style.opacity = oracleGfx.style.opacity = 1 - p;
                oracleCopy.style.translate = `0 ${-p * 40}px`;
                oracleGfx.style.translate = `0 ${-p * 70}px`;
            }, { target: document.getElementById('oracle'), offset: ['end 85%', 'end 35%'] }));

            //The seed of the quote is the brand mark of the header: same artwork, same size. It turns as it climbs and
            //unwinds to zero exactly when it reaches the header's mark, where the two coincide and a flash goes off.
            //The quote is centred and the mark sits in the left corner, so on the last stretch the seed curves off
            //towards it, like a seed carried by the wind.
            const seed = document.querySelector('#uno img');
            const mark = document.querySelector('header #logo img');
            let lastGap = null;

            const flash = (box) => {
                const x = box.left + box.width / 2, y = box.top + box.height / 2;
                const burst = document.createElement('div');
                Object.assign(burst.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, width: '0', height: '0', zIndex: 12, pointerEvents: 'none' });
                const piece = (css, keyframes, options) => {
                    const el = document.createElement('div');
                    Object.assign(el.style, { position: 'absolute', ...css });
                    burst.appendChild(el);
                    el.animate(keyframes, { easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both', ...options });
                    return el;
                };
                //A soft light that blooms and fades
                piece({ left: '-70px', top: '-70px', width: '140px', height: '140px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 250, 210, 0.95) 0%, rgba(255, 230, 170, 0.45) 35%, rgba(255, 230, 170, 0) 70%)' },
                    { opacity: [0, 1, 0], scale: [0.3, 1.1, 1.5] }, { duration: 900 });
                //A ring that spreads out
                piece({ left: '-20px', top: '-20px', width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(247, 248, 241, 0.9)', boxSizing: 'border-box' },
                    { opacity: [0.9, 0], scale: [0.8, 3.4] }, { duration: 800 });
                //Six sparks flying outwards
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6 + Math.PI / 6;
                    const dx = Math.cos(angle) * 38, dy = Math.sin(angle) * 38;
                    const spark = piece({ left: '-7px', top: '-9px', fontSize: '14px', lineHeight: '1', color: '#FFF6C8', textShadow: '0 0 6px #FFE9A8' },
                        { opacity: [1, 0], translate: ['0 0', `${dx}px ${dy}px`], scale: [0.4, 1] }, { duration: 750, delay: 40 });
                    spark.textContent = '✦';
                }
                document.body.appendChild(burst);
                setTimeout(() => burst.remove(), 1100);
                play('star');
            };

            let queued = false;
            const align = () => {
                queued = false;
                if (!seed.complete || !mark.complete) return;
                const m = mark.getBoundingClientRect();
                const s = seed.getBoundingClientRect();
                const gap = (s.top + s.height / 2) - (m.top + m.height / 2);             //vertical distance between the two centres
                //Measured from the middle of the section, where the seed sits before it moves (its own box already carries the shift)
                const home = seed.parentElement.getBoundingClientRect();
                const sideways = (m.left + m.width / 2) - (home.left + home.width / 2);
                //The sideways flight only starts near the mark; the farther it has to travel (wide screens), the earlier it
                //starts, so the curve looks the same on a phone and on a desktop
                const reach = Math.max(240, Math.abs(sideways));
                const t = Math.max(0, 1 - Math.abs(gap) / reach);
                const close = t * t * (3 - 2 * t);
                seed.style.rotate = `${Math.max(-160, Math.min(160, gap * 0.3))}deg`;
                seed.style.translate = `${sideways * close}px 0`;
                //The centres crossed: the two are on top of each other
                if (lastGap !== null && Math.sign(gap) !== Math.sign(lastGap) && Math.abs(gap) < 240) flash(m);
                lastGap = gap;
            };
            const onScroll = () => {
                if (!queued) { queued = true; requestAnimationFrame(align); }
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            stopCorners.push(() => window.removeEventListener('scroll', onScroll));
        }

        //The oracle block frames itself while scrolling: its four corners appear one by one, clockwise.
        //The corners are mirrored with transform, so they animate through the independent scale/translate properties.
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            [
                ['.corner.topLeft', -1, -1, ['start 55%', 'start 30%']],
                ['.corner.topRight', 1, -1, ['start 38%', 'start 14%']],
                ['.corner.bottomRight', 1, 1, ['start 92%', 'start 62%']],
                ['.corner.bottomLeft', -1, 1, ['start 80%', 'start 52%']],
            ].forEach(([selector, dx, dy, offset]) => {
                const corner = document.querySelector(selector);
                corner.style.opacity = 0;
                stopCorners.push(scroll(({ y }) => {
                    const eased = 1 - (1 - Math.min(1, Math.max(0, y.progress))) ** 3;
                    corner.style.opacity = eased;
                    corner.style.scale = 0.75 + 0.25 * eased;
                    corner.style.translate = `${dx * 40 * (1 - eased)}px ${dy * 40 * (1 - eased)}px`;
                }, { target: corner, offset }));
            });
        }

        //Text and illustrations of the oracle block arrive one after the other when it comes into view.
        //Independent translate/scale/rotate are used so they do not fight the parallax, which owns transform.
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const pick = (selector) => document.querySelector('#oracle ' + selector);
            const copy = ['.copy .heading h3', '.copy > p', '.copy .modes'].map(pick);
            const man = pick('.gfx .oracle.particle');
            const tree = pick('.gfx .oracle.tree');
            [...copy, man, tree].forEach((el) => { el.style.opacity = 0; });

            const reveal = ({ el, y = 24, scale = 1, delay = 0, duration = 900, origin, composite = 'replace' }) => {
                if (origin) el.style.transformOrigin = origin;
                const animation = el.animate(
                    { opacity: [0, 1], translate: [`0 ${y}px`, '0 0'], scale: [scale, 1] },
                    { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards', composite }
                );
                el.style.opacity = '';
                return animation.finished;
            };
            const idle = (el, keyframes, duration) => idleAnimations.push(el.animate(keyframes, {
                duration, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out'
            }));

            //The seed arrives first, above the quote, and the quote follows line by line
            const quote = [document.querySelector('#uno img'), ...document.querySelectorAll('#uno h2 .line')];
            quote.forEach((el) => { el.style.opacity = 0; });
            stopReveals.push(inView('#uno h2', () => {
                //Added on top, so the seed can already be curving towards the mark while it is still arriving
                quote.forEach((el, i) => reveal({ el, y: 32, delay: i * 450, duration: 1300, composite: i === 0 ? 'add' : 'replace' }));
            }, { amount: 0.6 }));

            stopReveals.push(inView('#oracle .copy', () => {
                copy.forEach((el, i) => reveal({ el, delay: i * 140 }));
            }, { amount: 0.5 }));

            //The man on the rug and the bonsai are separate pieces: the man settles first, the bonsai drifts in behind him after
            stopReveals.push(inView('#oracle .gfx', () => {
                reveal({ el: man, y: 48, scale: 0.94, duration: 1200 })
                    .then(() => idle(man, { translate: ['0 0', '0 -7px'] }, 4200)).catch(() => {});
                reveal({ el: tree, y: 20, scale: 0.55, delay: 600, duration: 1400 })
                    .then(() => idle(tree, { translate: ['0 0', '0 -12px'], rotate: ['-2deg', '2deg'] }, 6200)).catch(() => {});
            }, { amount: 0.3 }));
        }
    });
</script>

<template>
	<div class="landing">
        <Header :hasMenu="true">
            <template v-slot:logo>
                <img alt="Algo Particular" src="../assets/SeedWhite.svg" loading="lazy">
            </template>
        </Header>
       
        <kinesis-container id="hero" tag="section" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100" :active="!reducedMotion">
            <a href="/#oraculo" @click.prevent="goToOracle">
                <kinesis-element
                    tag="h1">
                    {{ $t("landing.intro") }}
                    <br><span>{{ $t("landing.introAction") }} →</span>
                </kinesis-element>                            
            </a>
            
            <!-- The character and his spiral are separate layers: the picture is just him, the dots are drawn and animated on the canvas -->
            <kinesis-element
                class="splash particle"
                tag="div"
                :strength="30"
                axis="y"
                type="translate">
                <img class="character" src="/assets/hero/character.webp" alt="" draggable="false">
                <canvas class="spiral" ref="spiralCanvas"></canvas>
            </kinesis-element>
            <canvas class="cell-field" ref="cellCanvas"></canvas>

            <template v-if="cellsFallback">
            <kinesis-element 
                class="splash cell one"
                tag="img"
                src="/assets/hero/cell-one.webp"
                loading=”lazy”
                :strength="20"   
                axis="x"
                transformOrigin="top left"
                type="translate"/>
            <kinesis-element 
                class="splash cell two"
                tag="img"
                src="/assets/hero/cell-two.webp"
                loading=”lazy”
                :strength="40"
                transformOrigin="bottom right"
                type="translate"/>
            <kinesis-element 
                class="splash cell three"
                tag="img"
                src="/assets/hero/cell-three.webp"
                loading=”lazy”
                :strength="10"
                transformOrigin="bottom left"
                type="translate"/>
            </template>

            <kinesis-element 
                class="splash background"
                :strength="1"
                type="depth"/>        
        </kinesis-container>

        <kinesis-container id="oracle" data-cursor="yellow" tag="section" easing="cubic-bezier(0.23, 1, 0.32, 1)" event="scroll" :active="!reducedMotion">
            <canvas class="star-field" ref="starCanvas"></canvas>
            <div class="corner topLeft"></div>
            <div class="corner bottomLeft"></div>
            <div class="corner topRight"></div>
            <div class="corner bottomRight"></div>
            <div class="copy">
                <div class="heading">
                    <h3>{{ $t("landing.oracleTitle") }}</h3>
                </div>
                <p>{{ $t("praxis.praxisIntro") }}</p>
                <ModeSelector />
            </div>
        
            <div class="gfx">
                <kinesis-element 
                    class="oracle particle"
                    tag="img"
                    src="/assets/oracle/particle.webp"
                    loading=”lazy”
                    :strength="60"
                    type="translate"/>
                <kinesis-element 
                    class="oracle tree"
                    tag="img"
                    src="/assets/oracle/tree.webp"
                    loading=”lazy”
                    :strength="50"
                    type="translate"/>
            </div>
        </kinesis-container>

        <div id="colorMe">
            <section id="uno">
                <div class="sky-tail" ref="skyTail"><canvas ref="tailCanvas"></canvas></div>
                <img src="../assets/SeedWhite.svg" alt="" loading="lazy"/>
                <h2><span class="line" v-for="(line, i) in $t('landing.uno').split('\n')" :key="i">{{ line }}</span></h2>
            </section>
        </div>

        <Footer />
	</div>
</template>

<!-- Hero -->
<style scoped>
    section {
        height: 100vh;
        width: 100vw;
        position: relative;
    }

    /* HERO */
    /* As the page scrolls, the violet turns into the navy of the oracle block (--mix goes 0..1, set from the script).
       The hero and the top of the oracle block share --tint, so the seam between them never shows a different color. */
    .landing {
        --mix: 0;
        --tint: #6A428D;
    }

    @supports (color: color-mix(in srgb, red 50%, blue)) {
        .landing {
            --tint: color-mix(in srgb, #143246 calc(var(--mix) * 100%), #6A428D);
        }
    }

    #hero {
        background-color: var(--tint);
        height: 115vh;
        min-height: 667px;
        padding: 5vh 0;
        /* A coral glow at the top only: an inset shadow also leaked along the bottom edge and drew a line against the oracle block */
        background-image: linear-gradient(180deg, rgba(255, 111, 97, 0.32) 0, rgba(255, 111, 97, 0) 120px);
        background-repeat: no-repeat;
        /* The background layer overflows on purpose (see .splash.background): that must not make the page scroll sideways */
        overflow-x: clip;
    }

    h1 {
        color: #F7F8F1;
        position: absolute;
        z-index: 10;
        top: 23vh;
        left: 7vw; 
        
        text-align: center;
        width: 86vw;        
        font-size: 36px;
        letter-spacing: 1px;
        line-height: 120%;
    }

    h1 span {
        display: inline-block;
        margin-top: 8px;
        font-family: 'Inter', helvetica, sans-serif;
        text-transform: uppercase;
        font-size: 12px;
        color: #F7F8F1;        
    }

    .splash {        
        position: absolute;
        z-index: 3;
        height: auto;
        
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;        
    }

.cell-field {
        position: absolute;
        inset: 0;
        z-index: 3;
        width: 100%;
        height: 100%;
        pointer-events: none;
        opacity: 0;
        transition: opacity 1.4s ease-out;
    }

    .splash.particle .character {
        display: block;
        width: 100%;
        height: auto;
        user-select: none;
    }

    .splash.particle .spiral {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .splash.particle {
        /* The picture covers the title's area: clicks must go through to the hero's link */
        pointer-events: none;
        z-index: 9;        
        width: 80vw;
        aspect-ratio: 868 / 1027;

        top: 36vh;
        left: 10vw;
    }

    .splash.cell.one {
        width: 27vw;

        top: 69vh;
        right: 9vw;            
    }

    .splash.cell.two {
        width: 23vw;

        top: 7vh;
        right: 18vw;
    }
    .splash.cell.three {
        width: 27vw;

        top: 88vh;
        left: 9vw;
    }    

    /* The hero's content fades out into its own violet, which is where the oracle block begins */
    .splash.background,
    .cell-field {
        -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%);
        mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%);
    }

    .splash.background {
        /* Only decoration: it must not take the clicks meant for the title */
        pointer-events: none;
        background-image: url('../assets/hero/background.webp');
        background-size: cover;
        
        /* Bigger than the hero on every side: this layer is tilted in 3D by the pointer (kinesis "depth"), and a layer
           exactly the size of the screen shows its own edge as a hard vertical cut when it turns */
        top: -8%;
        left: -12vw;
        z-index: 0;
        width: 124vw;
        height: 116%;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        h1 {
            top: 50vh;
            left: 42vw; 
            
            width: 36vw;        
            font-size: 40px;
            letter-spacing: 3px;
            line-height: 130%;
        }

        .splash.particle {
            width: 36vw;

            top: 20vh;
            left: 11vw;
        }

        .splash.cell.one {
            width: 13vw;

            top: 63vh;
            right: 9vw;
        }

        .splash.cell.two {
            width: 12vw;

            top: 13vh;
            left: auto;
            right: 20vw;
        }

        .splash.cell.three {
            width: 15vw;

            top: 73vh;
            left: 3vw;
        }

    }
</style>

<!-- Oracle -->
<style scoped>
    /* ORACLE */
    /* The tint at several opacities, for the soft top of the block */
    .landing {
        --tint-82: rgba(106, 66, 141, 0.82);
        --tint-55: rgba(106, 66, 141, 0.55);
        --tint-28: rgba(106, 66, 141, 0.28);
        --tint-10: rgba(106, 66, 141, 0.1);
        --tint-0: rgba(106, 66, 141, 0);
    }

    @supports (color: color-mix(in srgb, red 50%, blue)) {
        .landing {
            --tint-82: color-mix(in srgb, var(--tint) 82%, transparent);
            --tint-55: color-mix(in srgb, var(--tint) 55%, transparent);
            --tint-28: color-mix(in srgb, var(--tint) 28%, transparent);
            --tint-10: color-mix(in srgb, var(--tint) 10%, transparent);
            --tint-0: color-mix(in srgb, var(--tint) 0%, transparent);
        }
    }

    #oracle {
        /* Height of the zone where the hero's violet sinks into the navy. It sits above the content, which is all on the dark. */
        --sky: 36vh;
        box-sizing: border-box;
        padding-top: var(--sky);
        background-color: #143246;
        /* The top of the block is the violet of the hero, eased down into the navy */
        background-image: linear-gradient(180deg,
            var(--tint) 0%,
            var(--tint-82) 14%,
            var(--tint-55) 32%,
            var(--tint-28) 52%,
            var(--tint-10) 74%,
            var(--tint-0) 100%);
        background-size: 100% var(--sky);
        background-repeat: no-repeat;
        isolation: isolate;
        overflow-x: clip;

        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 80px;
        width: 100vw;
        min-height: calc(150vh + var(--sky));
    }

    /* The sky fades in from the top so the stars do not start on a visible edge */
    .star-field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        pointer-events: none;
        opacity: 0;
        transition: opacity 1.2s ease-out;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0, transparent calc(var(--sky) * 0.15), #000 calc(var(--sky) * 0.95));
        mask-image: linear-gradient(to bottom, transparent 0, transparent calc(var(--sky) * 0.15), #000 calc(var(--sky) * 0.95));
    }

    .copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 24px;        
    }

    #oracle .copy {
        width: 90vw;
    }

    .copy .heading {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }

    .copy .heading h3 {
        color: #F7F8F1;
        /* One line on phones too (it left "guíe" alone on a second line under 390px); if it still wraps, evenly */
        font-size: min(32px, 8vw);
        text-wrap: balance;
        text-align: center;
    }

    .copy .modes {
        margin-top: 16px;
    }

    .copy p {
        /* Rounded like the titles' lettering, easier to read than Inter next to it */
        font-family: 'Nunito', 'Inter', helvetica, sans-serif;
        color: #F7F8F1;
        font-size: 19px;
        line-height: 150%;
        text-align: center;
        max-width: 310px;
        margin-bottom: 0;
    }

    .corner {        
        background-image: url('../assets/oracle/corner.webp');
        background-size: contain;
        background-repeat: no-repeat;
        /* Their dark outlines would vanish into the navy */
        filter: drop-shadow(0 0 8px rgba(164, 218, 217, 0.45));

        position: absolute;
        z-index: 3;
        top: calc(var(--sky) + 2vw);
        left: 2vw;
        width: 30vw;
        height: 30vw;
    }

    .corner.bottomLeft {
        top: auto;
        bottom: 2vw;
        transform: scaleY(-1);
    }

    .corner.topRight {
        left: auto;
        right: 2vw;
        transform: scaleX(-1);
    }

    .corner.bottomRight {
        top: auto;
        left: auto;
        bottom: 2vw;
        right: 2vw;
        transform: scale(-1, -1);
    }

    .gfx {
        height: 32vh;
        width: 80vw;
        position: relative;
    }

    .oracle {
        height: auto;      
    }

    .oracle.particle {           
        width: 80vw;
    }

    /* The bonsai floats behind the character, to his right */
    .oracle.tree {
        position: absolute;
        top: 4%;
        right: 15%;
        z-index: -1;           
        width: 20vw;     
    }   

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #oracle {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 100px;
            --sky: 46vh;
            min-height: calc(100vh + var(--sky));
        }

        #oracle .copy {
            width: auto;
        }

        .corner {
            width: 15vw;
            height: 15vw;
        }

        .gfx {
            height: 52vh;
            width: 36vw;
        }

        .oracle.particle {
            width: 34vw;
        }

        .oracle.tree {
            width: 11vw;
            top: 6%;
            right: 14%;
        }

    }
</style>

<!-- UNO Quote -->
<style scoped>
    /* UNO */
    /* From the dark of the oracle into the orange, as the scroll goes on */
    #colorMe {
        background-color: #143246;
    }

    #uno {
        position: relative;
        isolation: isolate;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
        width: 100vw;
        height: 240vh;
        padding-top: 72vh;
        box-sizing: border-box;
        /* A wide band of orange holds behind the quote, with room around it, and then clears into the cream of the footer */
        background: linear-gradient(180deg, #143246 0%, #4a3a6e 20%, #c8636f 36%, #FF6F61 48%, #FF6F61 82%, #F7F8F1 100%);
    }

    /* Dawn: once the seam with the oracle block is out of sight, the whole screen turns from navy to orange as the quote
       comes up (--dawn goes 0..1, set from the script). Mixed in oklch so it passes through violet and rose, not mud. */
    @supports (color: color-mix(in oklch, red 50%, blue)) {
        .landing {
            --dawn: 0;
            --sunrise: color-mix(in oklch, #FF6F61 calc(var(--dawn) * 100%), #143246);
        }

        #uno {
            background: linear-gradient(180deg, var(--sunrise) 0%, var(--sunrise) 82%, #F7F8F1 100%);
        }
    }

    /* Stars carry on over the dark top of this block and fade out as it turns violet */
    .sky-tail {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 55vh;
        z-index: -1;
        pointer-events: none;
        -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 25%, transparent 100%);
        mask-image: linear-gradient(to bottom, #000 0%, #000 25%, transparent 100%);
    }

    .sky-tail canvas {
        width: 100%;
        height: 100%;
    }

    /* Same size and glow as the brand mark of the header, so the two can line up exactly */
    #uno img {
        width: 40px;
        height: auto;
        /* Room between the seed and the quote, for the flash when it meets the mark */
        margin-bottom: 48px;
        filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 0.36));
    }

    #uno h2 .line {
        display: block;
        /* The global span rule paints spans grey */
        color: inherit;
    }

    #uno h2 {
        color: #F7F8F1;
        letter-spacing: 0.01em;
        margin: 0;
        padding: 0;
        white-space: pre-line;
        text-align: center;
        line-height: 130%;
        font-size: 32px;        
    }    

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #uno h2 {
            font-size: 48px;            
        }

        #uno img {
            margin-bottom: 72px;
        }
    }
</style>