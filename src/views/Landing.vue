<script setup>
	import { onMounted, onBeforeUnmount, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { timeline, inView, scroll } from "motion";

    import Header  from '../components/Header.vue';
    import Footer  from '../components/Footer.vue';

    import { KinesisContainer, KinesisElement} from 'vue-kinesis';
    
    const router = useRouter();

    //handle navigation
    const handleNavigate = (url) => {
        router.push({ path: url }); //, replace: true
    };    


    //Cells and particles in three.js; the static cells come back if WebGL is not available
    const cellCanvas = ref(null);
    const cellsFallback = ref(false);
    let cellField = null;
    let unmounted = false;

    const stopCorners = [];
    const stopReveals = [];
    const idleAnimations = [];

    onBeforeUnmount(() => {
        unmounted = true;
        cellField?.destroy();
        stopCorners.forEach((stop) => stop());
        stopReveals.forEach((stop) => stop());
        idleAnimations.forEach((animation) => animation.cancel());
    });

    // //ON MOUNTED
	onMounted (() => {         
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

        timeline(sequence, { 
            duration: 4, 
            direction: 'alternate-reverse', 
            repeat: Infinity,
            defaultOptions: { ease: "ease-out" },
        });

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

            const quote = ['#uno h2', '#uno img'].map((selector) => document.querySelector(selector));
            quote.forEach((el) => { el.style.opacity = 0; });
            stopReveals.push(inView('#uno h2', () => {
                quote.forEach((el, i) => reveal({ el, y: 32, delay: i * 350, duration: 1300 }));
            }, { amount: 0.6 }));

            stopReveals.push(inView('#oracle .copy', () => {
                copy.forEach((el, i) => reveal({ el, delay: i * 140 }));
            }, { amount: 0.5 }));

            //The man on the rug and the bonsai are separate pieces: the man settles first, the tree grows from its pot after
            stopReveals.push(inView('#oracle .gfx', () => {
                reveal({ el: man, y: 48, scale: 0.94, duration: 1200 })
                    .then(() => idle(man, { translate: ['0 0', '0 -7px'] }, 4200)).catch(() => {});
                reveal({ el: tree, y: 20, scale: 0.55, delay: 600, duration: 1400, origin: '50% 100%' })
                    .then(() => idle(tree, { rotate: ['-1.4deg', '1.4deg'] }, 5200)).catch(() => {});
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
       
        <kinesis-container id="hero" tag="section" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100">
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

        <kinesis-container id="oracle" tag="section" easing="cubic-bezier(0.23, 1, 0.32, 1)" event="scroll">
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
                <h2>{{ $t("landing.uno") }}</h2>
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
        box-shadow: inset 0px 6px 63px rgb(255 111 97 / 36%), inset 0px -6px 64px rgb(20 50 70 / 90%);
    }

    /* The hero sinks into the dark navy of the oracle block instead of ending in a hard cut */
    #hero::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 28%;
        z-index: 8;
        pointer-events: none;
        background: linear-gradient(to bottom, rgba(20, 50, 70, 0) 0%, rgba(20, 50, 70, 0.45) 50%, #143246 100%);
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
        background-color: #143246;
        isolation: isolate;
        overflow-x: clip;

        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 80px;
        width: 100vw;
        min-height: 150vh;
    }

    /* Stars fade in from the top so they do not start on a visible edge */
    #oracle::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        background-image: url('../assets/oracle/stars.webp');
        background-size: cover;
        background-position: center;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 35%);
        mask-image: linear-gradient(to bottom, transparent 0%, #000 35%);
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
        top: 2vw;
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

    .oracle.tree {
        position: absolute;
        top: -9vh;
        right: 0;
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
            min-height: 100vh;
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

        /* The bonsai stands beside the rug instead of on top of it */
        .oracle.tree {
            width: 11vw;
            top: 20vh;
            right: -11vw;
        }
    }

    /* Narrow desktops and tablets: a smaller bonsai so it still fits next to the rug */
    @media screen and (min-width: 769px) and (max-width: 1100px) {
        .oracle.tree {
            width: 8vw;
            right: -9vw;
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
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
        width: 100vw;
        height: 170vh;
        padding-top: 70vh;
        box-sizing: border-box;
        background: linear-gradient(180deg, #143246 0%, #4a3a6e 30%, #c8636f 60%, #FF6F61 80%);
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