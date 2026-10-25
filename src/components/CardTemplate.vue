<script setup>
	import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { animate, inView } from 'motion';
    import { takePendingTransition } from '../cardTransition.js';

    import { getCard } from '../data/cards.js';
    import { sceneFor } from '../data/cardScenes.js';

    const props = defineProps({
        id: String
    });

    const router = useRouter();
    const card = computed(() => getCard(props.id) ?? {});
    const color = computed(() => card.value.color ?? '');
    const colorAlt = computed(() => card.value.colorAlt ?? '');
    const scene = computed(() => sceneFor(props.id));

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    //Shared transition: the card picked in the oracle grows until it fills the stage. It is taken here, while the
    //page is being set up, so that nothing of the page shows before the card has landed.
    const transition = takePendingTransition();
    const entering = ref(!!transition);
    const ready = ref(!transition);         //the scene is shown (and its layers come to life) once the card has landed

    const root = ref(null);
    const stage = ref(null);
    const cue = ref(null);
    const stopReveals = [];

    //The affirmation is what makes a card a full reading; special cards only carry their description
    const hasAffirmation = computed(() => card.value.affirmation_es != null || card.value.affirmation_en != null);

    const paragraphs = (text) => String(text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    const fadeCue = () => {
        if (cue.value) cue.value.style.opacity = Math.max(0, 1 - window.scrollY / 160);
    };

    onMounted(async () => {
        window.addEventListener('scroll', fadeCue, { passive: true });

        if (transition) {
            const box = stage.value.getBoundingClientRect();
            await animate(
                transition.el,
                {
                    left: box.left + 'px',
                    top: box.top + 'px',
                    width: box.width + 'px',
                    height: box.height + 'px',
                    borderRadius: '0px',
                    borderWidth: '0px',
                    borderColor: transition.color
                },
                { duration: reducedMotion ? 0 : 0.8, easing: [0.4, 0, 0.2, 1] }
            ).finished;

            //The scene fades in under the card, which fades away: no jump between the flat art and the layers
            ready.value = true;
            entering.value = false;
            animate(transition.el, { opacity: 0 }, { duration: reducedMotion ? 0 : 0.9 }).finished.then(() => transition.el.remove());
        }

        //The text arrives block by block as it comes into view
        if (!reducedMotion) {
            root.value.querySelectorAll('.reading > *').forEach((block) => {
                block.style.opacity = 0;
                stopReveals.push(inView(block, () => {
                    animate(block, { opacity: [0, 1], transform: ['translateY(28px)', 'translateY(0px)'] }, { duration: 0.9, easing: [0.22, 1, 0.36, 1] });
                }, { amount: 0.25 }));
            });
        }
    });

    onBeforeUnmount(() => {
        window.removeEventListener('scroll', fadeCue);
        stopReveals.forEach((stop) => stop());
        transition?.el.remove();
    });
</script>

<template>
	<main class="cardWrapper" :class="{ entering }" ref="root">
        <section class="stage" ref="stage">
            <div class="sceneHost" :class="{ ready }">
                <component :is="scene" :card="card" :active="ready" />
            </div>

            <h1 class="title" v-if="hasAffirmation">{{ String(card['name_' + $i18n.locale] ?? '').trim() }}</h1>

            <button class="action" @click="router.push({ path: '/share/' + props.id });" :aria-label="$t('oracle.share')">
                <svg class="icon share" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12.0002 9.66634C11.0797 9.66634 10.3335 8.92015 10.3335 7.99967C10.3335 7.0792 11.0797 6.33301 12.0002 6.33301H32.0002C32.9206 6.33301 33.6668 7.0792 33.6668 7.99967V27.9997C33.6668 28.9201 32.9206 29.6663 32.0002 29.6663C31.0797 29.6663 30.3335 28.9201 30.3335 27.9997V12.0234L9.17867 33.1782C8.5278 33.8291 7.47253 33.8291 6.82165 33.1782C6.17078 32.5273 6.17078 31.472 6.82165 30.8212L27.9765 9.66634H12.0002Z" />
                </svg>
            </button>

            <div class="cue" ref="cue" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 10.5L14 18.5L22 10.5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
        </section>

        <section class="reading">
            <p v-for="(text, i) in paragraphs(card['description_' + $i18n.locale])" :key="i" class="description" :class="{ onlyDescription: !hasAffirmation }">{{ text }}</p>

            <div class="quote" v-if="hasAffirmation">
                <h5>{{ $t("oracle.cardAfirmattion") }}</h5>
                <p>{{ card['affirmation_' + $i18n.locale] }}</p>
            </div>

            <div class="quote invitation" v-if="card['invitation_' + $i18n.locale] != null">
                <h5>{{ $t("oracle.cardInvitation") }}</h5>
                <p>{{ card['invitation_' + $i18n.locale] }}</p>
            </div>
        </section>
    </main>
</template>

<style scoped>
    .cardWrapper {
        display: block;
        position: relative;
        overflow-x: clip;
        min-height: 100vh;
        background-color: v-bind(color);
    }

    /* STAGE: the scene fills the screen; its name floats over it */
    .stage {
        position: relative;
        width: 100%;
        height: 100vh;
        height: 100svh;
        min-height: 560px;
    }

    .sceneHost {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 0.9s ease-out;
    }

    .sceneHost.ready {
        opacity: 1;
    }

    .title {
        position: absolute;
        top: max(84px, 10.5svh);
        left: 0;
        width: 100%;
        margin: 0;
        padding: 0 7vw;
        box-sizing: border-box;
        text-align: center;
        font-size: clamp(40px, 9vw, 88px);
        line-height: 1.05;
        letter-spacing: 0.02em;
        color: v-bind(colorAlt);
        text-shadow: 0 2px 18px v-bind(color);
        pointer-events: none;
        transition: opacity 0.8s ease-out 0.2s;
    }

    button.action {
        position: absolute;
        right: 24px;
        bottom: 28px;
        width: 58px;
        height: 58px;
        filter: none;
        background-color: v-bind(colorAlt);
        border: 4px solid v-bind(color);
        transition: opacity 0.8s ease-out 0.2s, border 270ms ease-out, background-color 150ms ease-out;
    }

    button.action .icon path {
        fill: v-bind(color);
    }

    button.action:hover {
        background-color: v-bind(color);
        border-color: v-bind(colorAlt);
    }

    button.action:hover .icon path {
        fill: v-bind(colorAlt);
    }

    .cue {
        position: absolute;
        left: calc(50% - 14px);
        bottom: 22px;
        pointer-events: none;
        animation: nudge 2.4s ease-in-out infinite;
        transition: opacity 0.8s ease-out 0.2s;
    }

    .cue path {
        stroke: v-bind(colorAlt);
    }

    @keyframes nudge {
        0%, 100% { translate: 0 0; }
        50% { translate: 0 7px; }
    }

    /* While the card is still landing, only its colour and the card itself are there */
    .entering .title,
    .entering .action,
    .entering .cue {
        opacity: 0;
    }

    /* READING */
    .reading {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 28px;
        max-width: 640px;
        margin: 0 auto;
        padding: 72px 28px 140px;
        box-sizing: border-box;
    }

    .reading p,
    .reading h5 {
        color: v-bind(colorAlt);
        margin: 0;
        padding: 0;
    }

    .reading .description {
        font-size: 17px;
        line-height: 1.75;
        text-align: left;
        white-space: pre-line;
    }

    .reading .description.onlyDescription {
        text-align: center;
        font-size: 19px;
    }

    .quote {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin-top: 24px;
        text-align: center;
    }

    .quote h5 {
        font-family: 'Inter', helvetica, sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        opacity: 0.75;
    }

    .quote p {
        font-family: 'Caveat', 'Inter', helvetica, sans-serif;
        font-size: 27px;
        line-height: 1.3;
        letter-spacing: 0.02em;
        text-align: center;
    }

    .quote.invitation p {
        font-family: 'Inter', helvetica, sans-serif;
        font-size: 18px;
        line-height: 1.6;
        letter-spacing: 0;
    }

    /* DESKTOP */
    @media screen and (min-width: 768px) {
        .title {
            font-size: clamp(40px, 4.2vw, 58px);
        }

        .reading {
            padding: 110px 28px 180px;
        }

        .reading .description {
            font-size: 18px;
        }

        .quote p {
            font-size: 34px;
        }

        .quote.invitation p {
            font-size: 19px;
        }

        button.action {
            right: 40px;
            bottom: 40px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .cue {
            animation: none;
        }

        .sceneHost {
            transition: none;
        }
    }
</style>
