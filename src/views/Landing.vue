<script setup>
	import { onMounted, onBeforeUnmount, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { timeline, inView, scroll } from "motion";

    import Header  from '../components/Header.vue';
    import Footer  from '../components/Footer.vue';

    import { KinesisContainer, KinesisElement} from 'vue-kinesis';
    import { createStarField } from '../composables/useStarField.js';
    import { play } from '../composables/useSound.js';
    
    const router = useRouter();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    //handle navigation
    const handleNavigate = (url) => {
        router.push({ path: url }); //, replace: true
    };    


    //Cells and particles in three.js; the static cells come back if WebGL is not available
    const cellCanvas = ref(null);
    const cellsFallback = ref(false);
    let cellField = null;

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
        starField?.destroy();
        tailField?.destroy();
        stopCorners.forEach((stop) => stop());
        stopReveals.forEach((stop) => stop());
        idleAnimations.forEach((animation) => animation.cancel());
    });

    // //ON MOUNTED
	onMounted (() => {         
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

        const sequence = [
            [".splash.particle", { y: 20 }],
        ];

        if (!reducedMotion) {
            timeline(sequence, { 
                duration: 4, 
                direction: 'alternate-reverse', 
                repeat: Infinity,
                defaultOptions: { ease: "ease-out" },
            });
        }

        if (!reducedMotion) {
            //Entrance: the title rises first, its action follows, then the particle settles in.
            //translate/scale are independent properties so they do not fight the parallax, which owns transform.
            const enter = (el, { y = 24, scale = 1, delay = 0, duration = 1100 }) => el.animate(
                { opacity: [0, 1], translate: [`0 ${y}px`, '0 0'], scale: [scale, 1] },
                { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
            );
            enter(document.querySelector('#hero h1'), { y: 28, delay: 150 });
            enter(document.querySelector('#hero h1 span'), { y: 14, delay: 650, duration: 900 });
            enter(document.querySelector('#hero .splash.particle'), { y: 40, scale: 0.88, delay: 350, duration: 1600 });

            //Leaving the hero: the title lifts and fades while the particle drifts up slower, so the violet hands over to the night
            const heroTitle = document.querySelector('#hero > a');
            const heroParticle = document.querySelector('#hero .splash.particle');
            stopCorners.push(scroll(({ y }) => {
                const p = Math.min(1, Math.max(0, y.progress));
                heroTitle.style.opacity = 1 - p * 1.4;
                heroTitle.style.translate = `0 ${-p * 60}px`;
                heroParticle.style.translate = `0 ${-p * 110}px`;
            }, { target: document.getElementById('hero'), offset: ['start start', 'end 40%'] }));

            //Leaving the oracle block: the copy and the illustration sink into the dark before the sky turns violet
            const oracleCopy = document.querySelector('#oracle .copy');
            const oracleGfx = document.querySelector('#oracle .gfx');
            stopCorners.push(scroll(({ y }) => {
                const p = Math.min(1, Math.max(0, y.progress));
                oracleCopy.style.opacity = oracleGfx.style.opacity = 1 - p;
                oracleCopy.style.translate = `0 ${-p * 40}px`;
                oracleGfx.style.translate = `0 ${-p * 70}px`;
            }, { target: document.getElementById('oracle'), offset: ['end 85%', 'end 35%'] }));

            //The seed turns slowly while the quote is on screen
            const seed = document.querySelector('#uno img');
            stopCorners.push(scroll(({ y }) => {
                seed.style.rotate = `${y.progress * 120}deg`;
            }, { target: document.getElementById('uno'), offset: ['start end', 'end start'] }));
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
            const copy = ['.copy .heading img', '.copy .heading h3', '.copy > p', '.copy > button'].map(pick);
            const man = pick('.gfx .oracle.particle');
            const tree = pick('.gfx .oracle.tree');
            [...copy, man, tree].forEach((el) => { el.style.opacity = 0; });

            const reveal = ({ el, y = 24, scale = 1, delay = 0, duration = 900, origin }) => {
                if (origin) el.style.transformOrigin = origin;
                const animation = el.animate(
                    { opacity: [0, 1], translate: [`0 ${y}px`, '0 0'], scale: [scale, 1] },
                    { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
                );
                el.style.opacity = '';
                return animation.finished;
            };
            const idle = (el, keyframes, duration) => idleAnimations.push(el.animate(keyframes, {
                duration, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out'
            }));

            //The quote arrives line by line, and the seed after the last one
            const quote = [...document.querySelectorAll('#uno h2 .line'), document.querySelector('#uno img')];
            quote.forEach((el) => { el.style.opacity = 0; });
            stopReveals.push(inView('#uno h2', () => {
                quote.forEach((el, i) => reveal({ el, y: 32, delay: i * 450, duration: 1300 }));
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
            <a href="/praxis">
                <kinesis-element
                    tag="h1">
                    {{ $t("landing.intro") }}
                    <br><span>{{ $t("landing.introAction") }} →</span>
                </kinesis-element>                            
            </a>
            
            <kinesis-element 
                class="splash particle"
                tag="img"
                src="/assets/hero/particle.webp"
                loading=”lazy”
                :strength="30"
                axis="y"
                type="translate"/>
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
                    <img loading="lazy" src="../assets/icon/Lab.svg"/>
                    <h3>{{ $t("landing.oracleTitle") }}</h3>
                </div>
                <p>{{ $t("landing.oracleDescrip") }}</p>
                <button @click="handleNavigate('/praxis')">{{ $t("landing.oracleAction") }}</button>
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
                <h2><span class="line" v-for="(line, i) in $t('landing.uno').split('\n')" :key="i">{{ line }}</span></h2>
                <img src="../assets/icon/Seed.svg" loading="lazy"/>
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
	#hero {
        background-color: #6A428D;
        height: 115vh;
        min-height: 667px;
        padding: 5vh 0;
        /* A coral glow at the top only: an inset shadow also leaked along the bottom edge and drew a line against the oracle block */
        background-image: linear-gradient(180deg, rgba(255, 111, 97, 0.32) 0, rgba(255, 111, 97, 0) 120px);
        background-repeat: no-repeat;
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

    .splash.particle {
        z-index: 9;        
        width: 80vw;

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
        background-image: url('../assets/hero/background.webp');
        background-size: cover;
        
        top: 0;
        z-index: 0;
        width: 100vw;
        height: 100%;
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
    #oracle {
        /* Height of the zone where the hero's violet sinks into the navy. It sits above the content, which is all on the dark. */
        --sky: 36vh;
        box-sizing: border-box;
        padding-top: var(--sky);
        background-color: #143246;
        /* The top of the block is the violet of the hero, eased down into the navy */
        background-image: linear-gradient(180deg,
            #6A428D 0%,
            rgba(106, 66, 141, 0.82) 14%,
            rgba(106, 66, 141, 0.55) 32%,
            rgba(106, 66, 141, 0.28) 52%,
            rgba(106, 66, 141, 0.1) 74%,
            rgba(106, 66, 141, 0) 100%);
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

    .copy .heading img {
        width: 48px;
        height: 48px;
        filter: drop-shadow(0px 2px 3px #C7BE8E);        
    }

    .copy .heading h3 {
        color: #F7F8F1;
        font-size: 32px;
        text-align: center;
    }

    .copy p {
        color: #F7F8F1;
        font-size: 18px;
        line-height: 150%;
        text-align: center;
        max-width: 310px;
        margin-bottom: 0;
    }

    .copy button {
        color: #0381BA;
        min-width: 310px;
    }

    .copy button:hover {
        /* color: #F7F8F1; */
        background-color: #E8E974;
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

    #uno h2 .line {
        display: block;
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
    }
</style>