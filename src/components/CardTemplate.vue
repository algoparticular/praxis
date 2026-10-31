<script setup>
	import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { animate, inView } from 'motion';
    import { takePendingTransition } from '../cardTransition.js';

    import { getCard } from '../data/cards.js';
    import { sceneFor, sceneNameFor } from '../data/cardScenes.js';
    import { setCurrentVisit, startCardVisit, track } from '../analytics.js';

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

    // What the person does here is told as one story when they leave (analytics.js): how long, whether they touched the
    // scene, whether they read on. A card with a picked transition was chosen in the oracle; otherwise it was opened directly.
    const visit = startCardVisit(props.id, { scene: sceneNameFor(props.id), entry: transition ? 'picked' : 'direct' });
    setCurrentVisit(visit);

    // Touching the scene counts: its touchable zones are role="button" (a finger that only drags the page to the reading
    // also lands a pointerdown on the stage, and that is not playing). Vipassana answers a click anywhere on it.
    // While the scene is being played the share button steps back (smaller, faint), and it comes back a few seconds
    // after the last touch, so it does not take room from the game
    const playing = ref(false);
    let playTimer = null;
    const played = () => {
        visit.touch();
        playing.value = true;
        clearTimeout(playTimer);
        playTimer = setTimeout(() => { playing.value = false; }, 4000);
    };
    const onStageDown = (event) => { if (event.target.closest('[role="button"]') && !event.target.closest('.action')) played(); };
    const onStageUp = () => { if (playing.value) played(); };
    const onStageClick = (event) => { if (sceneNameFor(props.id) === 'vipassana' && !event.target.closest('[role="button"]')) played(); };

    // Sharing, from the button over the scene or from the one at the end of the reading
    const share = (from) => {
        track('share_opened', { card_id: props.id, from });
        router.push({ path: '/share/' + props.id });
    };
    // On a phone a page is rarely unloaded (the app is just hidden), so leaving is reported when it is hidden too
    const onHidden = () => { if (document.visibilityState === 'hidden') visit.finish(); };

    const root = ref(null);
    const stage = ref(null);
    const cue = ref(null);
    const stopReveals = [];

    //The affirmation is what makes a card a full reading; special cards only carry their description
    const hasAffirmation = computed(() => card.value.affirmation_es != null || card.value.affirmation_en != null);

    const paragraphs = (text) => String(text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    const fadeCue = () => {
        if (cue.value) cue.value.style.opacity = Math.max(0, 1 - window.scrollY / 160);
        if (stage.value && window.scrollY > stage.value.offsetHeight * 0.7) visit.reading();
    };

    onMounted(async () => {
        window.addEventListener('scroll', fadeCue, { passive: true });
        window.addEventListener('pagehide', visit.finish);
        document.addEventListener('visibilitychange', onHidden);

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
        clearTimeout(playTimer);
        window.removeEventListener('scroll', fadeCue);
        stopReveals.forEach((stop) => stop());
        transition?.el.remove();
        window.removeEventListener('pagehide', visit.finish);
        document.removeEventListener('visibilitychange', onHidden);
        visit.finish();
        setCurrentVisit(null);
    });
</script>

<template>
	<main class="cardWrapper" :class="{ entering }" ref="root">
        <section class="stage" ref="stage" @contextmenu.prevent @selectstart.prevent @pointerdown.capture="onStageDown" @pointerup.capture="onStageUp" @click.capture="onStageClick">
            <div class="sceneHost" :class="{ ready }">
                <component :is="scene" :card="card" :active="ready" />
            </div>

            <h1 class="title" v-if="String(card['name_' + $i18n.locale] ?? '').trim()">{{ String(card['name_' + $i18n.locale] ?? '').trim() }}</h1>

            <button class="action" :class="{ quiet: playing }" @click="share('stage')" :aria-label="$t('oracle.share')">
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

            <!-- After reading, the natural moment to share -->
            <button class="shareEnd" @click="share('reading')">
                <svg class="icon" width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12.0002 9.66634C11.0797 9.66634 10.3335 8.92015 10.3335 7.99967C10.3335 7.0792 11.0797 6.33301 12.0002 6.33301H32.0002C32.9206 6.33301 33.6668 7.0792 33.6668 7.99967V27.9997C33.6668 28.9201 32.9206 29.6663 32.0002 29.6663C31.0797 29.6663 30.3335 28.9201 30.3335 27.9997V12.0234L9.17867 33.1782C8.5278 33.8291 7.47253 33.8291 6.82165 33.1782C6.17078 32.5273 6.17078 31.472 6.82165 30.8212L27.9765 9.66634H12.0002Z" />
                </svg>
                {{ $t('oracle.share') }}
            </button>
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
        /* The stage is played with a finger that stays down (Paciencia): on a phone a long press must not select the
           picture or text, show the callout or the context menu. The reading below the stage stays selectable. */
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
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

    /* A scene can light the name: it sets --name-glow (0..1) on the stage (Paciencia does when its rulito is whole) */
    .stage .title {
        color: color-mix(in srgb, v-bind(colorAlt), #fff6cf calc(var(--name-glow, 0) * 88%));
        text-shadow:
            0 2px 18px v-bind(color),
            0 0 calc(var(--name-glow, 0) * 22px) rgba(255, 226, 120, calc(var(--name-glow, 0) * 0.9)),
            0 0 calc(var(--name-glow, 0) * 56px) rgba(255, 226, 120, calc(var(--name-glow, 0) * 0.55));
        filter: brightness(calc(1 + var(--name-glow, 0) * 0.3));
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
        transition: opacity 0.8s ease-out 0.2s, scale 0.6s ease-out, border 270ms ease-out, background-color 150ms ease-out;
    }

    /* While the scene is being played it steps back */
    button.action.quiet {
        opacity: 0.35;
        scale: 0.72;
        transition: opacity 0.4s ease-out, scale 0.4s ease-out, border 270ms ease-out, background-color 150ms ease-out;
    }

    button.action.quiet:hover,
    button.action.quiet:focus-visible {
        opacity: 1;
        scale: 1;
    }

    /* At the end of the reading: the card's own colours, turned around */
    .shareEnd {
        align-self: center;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-top: 32px;
        padding: 14px 26px;
        border: 2px solid v-bind(colorAlt);
        border-radius: 999px;
        background: v-bind(colorAlt);
        color: v-bind(color);
        font-family: 'Nunito', helvetica, sans-serif;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 150ms ease-out, color 150ms ease-out;
    }

    .shareEnd .icon path {
        fill: currentColor;
    }

    .shareEnd:hover,
    .shareEnd:focus-visible {
        background: transparent;
        color: v-bind(colorAlt);
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
        font-family: 'Nunito', helvetica, sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        opacity: 0.75;
    }

    .quote p {
        font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
        font-size: 27px;
        line-height: 1.3;
        letter-spacing: 0.02em;
        text-align: center;
    }

    .quote.invitation p {
        font-family: 'Nunito', helvetica, sans-serif;
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
